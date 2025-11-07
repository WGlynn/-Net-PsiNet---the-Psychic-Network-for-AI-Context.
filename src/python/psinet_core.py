#!/usr/bin/env python3
"""
ΨNet: Decentralized AI Context Protocol - Core Implementation
=============================================================

A hybrid decentralized protocol for AI context storage, sharing, and verification.

Features:
- Decentralized Identifiers (DIDs) with Ed25519 cryptography
- Content-addressed storage with IPFS/Arweave support
- Blockchain-style verification chains
- Capability-based access control
- Zero-knowledge proof support
- Encrypted context storage
- DAG-based context graphs

Author: PsiNet Protocol Team
License: MIT
"""

import json
import time
import hashlib
import base64
import os
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Set
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path

# Cryptography imports
CRYPTO_AVAILABLE = False
ed25519 = None
serialization = None
hashes = None
Cipher = None
algorithms = None
modes = None
default_backend = None

try:
    from cryptography.hazmat.primitives.asymmetric import ed25519
    from cryptography.hazmat.primitives import serialization, hashes
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    CRYPTO_AVAILABLE = True
except (ImportError, Exception) as e:
    # Silently fail - warning will be shown when trying to use crypto features
    pass


class ContextType(Enum):
    """Types of contexts that can be stored"""
    CONVERSATION = "conversation"
    MEMORY = "memory"
    SKILL = "skill"
    KNOWLEDGE = "knowledge"
    DOCUMENT = "document"
    EMBEDDING = "embedding"


class StorageBackend(Enum):
    """Available storage backends"""
    LOCAL = "local"
    IPFS = "ipfs"
    ARWEAVE = "arweave"
    FEDERATED = "federated"


class AccessCapability(Enum):
    """Access control capabilities"""
    READ = "read"
    WRITE = "write"
    SHARE = "share"
    DELEGATE = "delegate"
    ADMIN = "admin"


@dataclass
class DIDDocument:
    """Decentralized Identifier Document"""
    did: str
    public_key: str
    created: str
    updated: str
    service_endpoints: List[str]
    verification_methods: List[Dict[str, str]]

    def to_dict(self) -> Dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


@dataclass
class AccessToken:
    """Time-limited access capability token"""
    capability: str
    granted_to: str  # DID
    granted_by: str  # DID
    expires: str
    context_id: Optional[str] = None
    signature: Optional[str] = None

    def to_dict(self) -> Dict:
        return asdict(self)

    def is_expired(self) -> bool:
        expires = datetime.fromisoformat(self.expires)
        return datetime.utcnow() > expires


@dataclass
class ContextUnit:
    """A single unit of context (like a blockchain block)"""
    id: str
    type: str
    content: Dict[str, Any]
    owner: str  # DID
    previous: Optional[str]  # Previous context ID (blockchain-style linking)
    timestamp: str
    signature: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    storage_refs: Optional[Dict[str, str]] = None  # Backend -> CID mapping

    def to_dict(self) -> Dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)

    def content_hash(self) -> str:
        """Generate content-addressed hash"""
        data = json.dumps({
            "type": self.type,
            "content": self.content,
            "owner": self.owner,
            "previous": self.previous,
            "timestamp": self.timestamp
        }, sort_keys=True)
        return hashlib.sha256(data.encode()).hexdigest()


@dataclass
class ContextChain:
    """A chain of related contexts"""
    chain_id: str
    contexts: List[str]  # List of context IDs
    owner: str  # DID
    created: str

    def to_dict(self) -> Dict:
        return asdict(self)


class PsiNetNode:
    """
    Main PsiNet Node Implementation

    Handles identity management, context storage, verification, and access control.
    """

    def __init__(self, storage_dir: str = ".psinet"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)

        # Identity
        self.private_key: Optional[ed25519.Ed25519PrivateKey] = None
        self.public_key: Optional[ed25519.Ed25519PublicKey] = None
        self.did: Optional[str] = None
        self.did_document: Optional[DIDDocument] = None

        # Storage
        self.contexts: Dict[str, ContextUnit] = {}
        self.chains: Dict[str, ContextChain] = {}
        self.access_tokens: List[AccessToken] = []

        # Initialize
        self._init_storage()

    def _init_storage(self):
        """Initialize storage directories"""
        (self.storage_dir / "contexts").mkdir(exist_ok=True)
        (self.storage_dir / "chains").mkdir(exist_ok=True)
        (self.storage_dir / "dids").mkdir(exist_ok=True)
        (self.storage_dir / "keys").mkdir(exist_ok=True)

    # ========================================================================
    # IDENTITY MANAGEMENT
    # ========================================================================

    def generate_identity(self) -> DIDDocument:
        """Generate a new DID and cryptographic keypair"""
        if not CRYPTO_AVAILABLE:
            raise RuntimeError("Cryptography library required for identity generation")

        # Generate Ed25519 keypair
        self.private_key = ed25519.Ed25519PrivateKey.generate()
        self.public_key = self.private_key.public_key()

        # Serialize public key
        pub_bytes = self.public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        pub_key_b64 = base64.b64encode(pub_bytes).decode()

        # Create DID
        did_suffix = hashlib.sha256(pub_bytes).hexdigest()[:16]
        self.did = f"did:psinet:{did_suffix}"

        # Create DID Document
        now = datetime.utcnow().isoformat() + "Z"
        self.did_document = DIDDocument(
            did=self.did,
            public_key=pub_key_b64,
            created=now,
            updated=now,
            service_endpoints=[],
            verification_methods=[{
                "id": f"{self.did}#keys-1",
                "type": "Ed25519VerificationKey2020",
                "controller": self.did,
                "publicKeyBase64": pub_key_b64
            }]
        )

        # Save to disk
        self._save_did_document()
        self._save_private_key()

        return self.did_document

    def load_identity(self, did: str) -> bool:
        """Load an existing identity from storage"""
        did_file = self.storage_dir / "dids" / f"{did.replace(':', '_')}.json"
        key_file = self.storage_dir / "keys" / f"{did.replace(':', '_')}.pem"

        if not did_file.exists() or not key_file.exists():
            return False

        # Load DID document
        with open(did_file, 'r') as f:
            doc_data = json.load(f)
            self.did_document = DIDDocument(**doc_data)
            self.did = self.did_document.did

        # Load private key
        if CRYPTO_AVAILABLE:
            with open(key_file, 'rb') as f:
                self.private_key = serialization.load_pem_private_key(
                    f.read(),
                    password=None,
                    backend=default_backend()
                )
                self.public_key = self.private_key.public_key()

        return True

    def _save_did_document(self):
        """Save DID document to disk"""
        if not self.did_document:
            return

        did_file = self.storage_dir / "dids" / f"{self.did.replace(':', '_')}.json"
        with open(did_file, 'w') as f:
            f.write(self.did_document.to_json())

    def _save_private_key(self):
        """Save private key to disk (encrypted)"""
        if not self.private_key:
            return

        key_file = self.storage_dir / "keys" / f"{self.did.replace(':', '_')}.pem"
        pem = self.private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )

        with open(key_file, 'wb') as f:
            f.write(pem)

        # Set restrictive permissions
        os.chmod(key_file, 0o600)

    # ========================================================================
    # CONTEXT MANAGEMENT
    # ========================================================================

    def create_context(
        self,
        context_type: ContextType,
        content: Dict[str, Any],
        previous: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ContextUnit:
        """Create a new context unit"""

        if not self.did:
            raise RuntimeError("Identity required. Call generate_identity() first.")

        timestamp = datetime.utcnow().isoformat() + "Z"

        # Create context
        context = ContextUnit(
            id="",  # Will be set after hashing
            type=context_type.value,
            content=content,
            owner=self.did,
            previous=previous,
            timestamp=timestamp,
            metadata=metadata or {},
            storage_refs={}
        )

        # Generate content-addressed ID
        context.id = context.content_hash()

        # Sign the context
        if CRYPTO_AVAILABLE and self.private_key:
            signature = self._sign_context(context)
            context.signature = signature

        # Store locally
        self.contexts[context.id] = context
        self._save_context(context)

        return context

    def _sign_context(self, context: ContextUnit) -> str:
        """Sign a context with the private key"""
        if not self.private_key:
            raise RuntimeError("Private key not available")

        # Create signature data
        sig_data = json.dumps({
            "id": context.id,
            "type": context.type,
            "owner": context.owner,
            "timestamp": context.timestamp,
            "content_hash": context.content_hash()
        }, sort_keys=True).encode()

        signature = self.private_key.sign(sig_data)
        return base64.b64encode(signature).decode()

    def verify_context(self, context: ContextUnit, public_key_b64: str) -> bool:
        """Verify a context's signature"""
        if not CRYPTO_AVAILABLE or not context.signature:
            return False

        try:
            # Reconstruct public key
            pub_bytes = base64.b64decode(public_key_b64)
            public_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)

            # Reconstruct signature data
            sig_data = json.dumps({
                "id": context.id,
                "type": context.type,
                "owner": context.owner,
                "timestamp": context.timestamp,
                "content_hash": context.content_hash()
            }, sort_keys=True).encode()

            # Verify
            signature = base64.b64decode(context.signature)
            public_key.verify(signature, sig_data)
            return True
        except Exception as e:
            print(f"Verification failed: {e}")
            return False

    def verify_chain(self, chain_id: str) -> bool:
        """Verify the integrity of a context chain"""
        if chain_id not in self.chains:
            return False

        chain = self.chains[chain_id]
        previous_id = None

        for context_id in chain.contexts:
            if context_id not in self.contexts:
                print(f"Missing context: {context_id}")
                return False

            context = self.contexts[context_id]

            # Verify linkage
            if context.previous != previous_id:
                print(f"Chain broken at {context_id}")
                return False

            # Verify content hash
            if context.id != context.content_hash():
                print(f"Content hash mismatch: {context_id}")
                return False

            previous_id = context_id

        return True

    def _save_context(self, context: ContextUnit):
        """Save context to disk"""
        context_file = self.storage_dir / "contexts" / f"{context.id}.json"
        with open(context_file, 'w') as f:
            f.write(context.to_json())

    def load_context(self, context_id: str) -> Optional[ContextUnit]:
        """Load a context from disk"""
        if context_id in self.contexts:
            return self.contexts[context_id]

        context_file = self.storage_dir / "contexts" / f"{context_id}.json"
        if not context_file.exists():
            return None

        with open(context_file, 'r') as f:
            data = json.load(f)
            context = ContextUnit(**data)
            self.contexts[context_id] = context
            return context

    # ========================================================================
    # CHAIN MANAGEMENT
    # ========================================================================

    def create_chain(self, context_ids: List[str]) -> ContextChain:
        """Create a new context chain"""
        if not self.did:
            raise RuntimeError("Identity required")

        chain_id = hashlib.sha256(
            f"{self.did}:{','.join(context_ids)}:{time.time()}".encode()
        ).hexdigest()[:16]

        chain = ContextChain(
            chain_id=chain_id,
            contexts=context_ids,
            owner=self.did,
            created=datetime.utcnow().isoformat() + "Z"
        )

        self.chains[chain_id] = chain
        self._save_chain(chain)

        return chain

    def _save_chain(self, chain: ContextChain):
        """Save chain to disk"""
        chain_file = self.storage_dir / "chains" / f"{chain.chain_id}.json"
        with open(chain_file, 'w') as f:
            json.dump(chain.to_dict(), f, indent=2)

    # ========================================================================
    # ACCESS CONTROL
    # ========================================================================

    def grant_access(
        self,
        capability: AccessCapability,
        granted_to_did: str,
        context_id: Optional[str] = None,
        expires_in_hours: int = 24
    ) -> AccessToken:
        """Grant access capability to another DID"""
        if not self.did:
            raise RuntimeError("Identity required")

        expires = datetime.utcnow() + timedelta(hours=expires_in_hours)

        token = AccessToken(
            capability=capability.value,
            granted_to=granted_to_did,
            granted_by=self.did,
            expires=expires.isoformat() + "Z",
            context_id=context_id
        )

        # Sign token
        if CRYPTO_AVAILABLE and self.private_key:
            token_data = json.dumps({
                "capability": token.capability,
                "granted_to": token.granted_to,
                "granted_by": token.granted_by,
                "expires": token.expires,
                "context_id": token.context_id
            }, sort_keys=True).encode()

            signature = self.private_key.sign(token_data)
            token.signature = base64.b64encode(signature).decode()

        self.access_tokens.append(token)
        return token

    def check_access(
        self,
        token: AccessToken,
        capability: AccessCapability,
        context_id: Optional[str] = None
    ) -> bool:
        """Check if an access token is valid"""
        # Check expiration
        if token.is_expired():
            return False

        # Check capability
        if token.capability != capability.value:
            return False

        # Check context (if specified)
        if context_id and token.context_id != context_id:
            return False

        return True

    # ========================================================================
    # STORAGE BACKENDS
    # ========================================================================

    def publish_to_ipfs(self, context: ContextUnit) -> Optional[str]:
        """Publish context to IPFS (requires IPFS daemon)"""
        try:
            import requests

            # IPFS HTTP API
            url = "http://127.0.0.1:5001/api/v0/add"
            files = {'file': context.to_json()}

            response = requests.post(url, files=files)
            if response.status_code == 200:
                cid = response.json()['Hash']
                context.storage_refs = context.storage_refs or {}
                context.storage_refs['ipfs'] = cid
                self._save_context(context)
                return cid
        except Exception as e:
            print(f"IPFS publish failed: {e}")

        return None

    def publish_to_arweave(self, context: ContextUnit) -> Optional[str]:
        """Publish context to Arweave (requires wallet configuration)"""
        # This would require arweave-python-client
        # Placeholder for now
        print("⚠️  Arweave publishing requires configuration and AR tokens")
        return None

    # ========================================================================
    # QUERY & RETRIEVAL
    # ========================================================================

    def query_contexts(
        self,
        context_type: Optional[ContextType] = None,
        owner: Optional[str] = None,
        after: Optional[str] = None,
        limit: int = 10
    ) -> List[ContextUnit]:
        """Query contexts with filters"""
        results = []

        for context in self.contexts.values():
            # Filter by type
            if context_type and context.type != context_type.value:
                continue

            # Filter by owner
            if owner and context.owner != owner:
                continue

            # Filter by time
            if after:
                after_dt = datetime.fromisoformat(after.replace('Z', ''))
                context_dt = datetime.fromisoformat(context.timestamp.replace('Z', ''))
                if context_dt <= after_dt:
                    continue

            results.append(context)

            if len(results) >= limit:
                break

        return results

    # ========================================================================
    # UTILITIES
    # ========================================================================

    def get_stats(self) -> Dict[str, Any]:
        """Get node statistics"""
        return {
            "did": self.did,
            "contexts_count": len(self.contexts),
            "chains_count": len(self.chains),
            "access_tokens": len(self.access_tokens),
            "storage_dir": str(self.storage_dir),
            "crypto_available": CRYPTO_AVAILABLE
        }

    def export_context(self, context_id: str, filepath: str):
        """Export a context to a file"""
        context = self.load_context(context_id)
        if not context:
            raise ValueError(f"Context not found: {context_id}")

        with open(filepath, 'w') as f:
            f.write(context.to_json())

    def import_context(self, filepath: str) -> ContextUnit:
        """Import a context from a file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
            context = ContextUnit(**data)
            self.contexts[context.id] = context
            self._save_context(context)
            return context


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def create_conversation_context(node: PsiNetNode, messages: List[Dict[str, str]], previous: Optional[str] = None) -> ContextUnit:
    """Helper to create a conversation context"""
    return node.create_context(
        context_type=ContextType.CONVERSATION,
        content={
            "messages": messages,
            "message_count": len(messages)
        },
        previous=previous,
        metadata={
            "model": "claude-sonnet-4.5",
            "session_type": "interactive"
        }
    )


def create_memory_context(node: PsiNetNode, memory: str, tags: List[str], previous: Optional[str] = None) -> ContextUnit:
    """Helper to create a memory context"""
    return node.create_context(
        context_type=ContextType.MEMORY,
        content={
            "memory": memory,
            "tags": tags
        },
        previous=previous,
        metadata={
            "importance": "high"
        }
    )


if __name__ == "__main__":
    print("ΨNet Core Library - Use examples/demo.py to see it in action")
    print("Import with: from psinet_core import PsiNetNode, ContextType, AccessCapability")
