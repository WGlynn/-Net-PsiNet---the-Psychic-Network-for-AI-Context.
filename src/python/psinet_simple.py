#!/usr/bin/env python3
"""
ΨNet: Simplified Implementation (No Cryptography Dependencies)
================================================================

A simplified version of PsiNet that works without cryptography libraries.
Uses hashlib for basic signing (NOT cryptographically secure - for demo only).

For production use, install cryptography and use psinet_core.py instead.

Author: PsiNet Protocol Team
License: MIT
"""

import json
import time
import hashlib
import base64
import os
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path


class ContextType(Enum):
    """Types of contexts that can be stored"""
    CONVERSATION = "conversation"
    MEMORY = "memory"
    SKILL = "skill"
    KNOWLEDGE = "knowledge"
    DOCUMENT = "document"
    EMBEDDING = "embedding"


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
class ContextUnit:
    """A single unit of context (like a blockchain block)"""
    id: str
    type: str
    content: Dict[str, Any]
    owner: str
    previous: Optional[str]
    timestamp: str
    signature: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    storage_refs: Optional[Dict[str, str]] = None

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


class SimplePsiNetNode:
    """
    Simplified PsiNet Node (Demo Mode - Not Cryptographically Secure)

    Uses basic hashing instead of Ed25519 signatures.
    For production, use psinet_core.py with cryptography library.
    """

    def __init__(self, storage_dir: str = ".psinet"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)

        self.private_key: Optional[str] = None
        self.public_key: Optional[str] = None
        self.did: Optional[str] = None
        self.did_document: Optional[DIDDocument] = None

        self.contexts: Dict[str, ContextUnit] = {}

        self._init_storage()

    def _init_storage(self):
        """Initialize storage directories"""
        (self.storage_dir / "contexts").mkdir(exist_ok=True)
        (self.storage_dir / "dids").mkdir(exist_ok=True)
        (self.storage_dir / "keys").mkdir(exist_ok=True)

    def generate_identity(self) -> DIDDocument:
        """Generate a new DID (simplified - uses random bytes instead of Ed25519)"""
        # Generate random "keypair" (NOT cryptographically secure)
        import secrets
        random_bytes = secrets.token_bytes(32)

        self.private_key = base64.b64encode(random_bytes).decode()
        self.public_key = hashlib.sha256(random_bytes).hexdigest()

        # Create DID
        did_suffix = self.public_key[:16]
        self.did = f"did:psinet:{did_suffix}"

        # Create DID Document
        now = datetime.utcnow().isoformat() + "Z"
        self.did_document = DIDDocument(
            did=self.did,
            public_key=self.public_key,
            created=now,
            updated=now,
            service_endpoints=[],
            verification_methods=[{
                "id": f"{self.did}#keys-1",
                "type": "SimplifiedKey",
                "controller": self.did,
                "publicKeyHex": self.public_key
            }]
        )

        # Save to disk
        self._save_did_document()
        self._save_private_key()

        print("⚠️  Note: Using simplified cryptography (demo mode)")
        print("   For production, install 'cryptography' package")

        return self.did_document

    def _save_did_document(self):
        """Save DID document to disk"""
        if not self.did_document:
            return

        did_file = self.storage_dir / "dids" / f"{self.did.replace(':', '_')}.json"
        with open(did_file, 'w') as f:
            f.write(self.did_document.to_json())

    def _save_private_key(self):
        """Save private key to disk"""
        if not self.private_key:
            return

        key_file = self.storage_dir / "keys" / f"{self.did.replace(':', '_')}.key"
        with open(key_file, 'w') as f:
            f.write(self.private_key)

        os.chmod(key_file, 0o600)

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

        context = ContextUnit(
            id="",
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

        # "Sign" the context (simplified - just hash with private key)
        if self.private_key:
            signature_data = f"{context.id}:{self.private_key}".encode()
            context.signature = hashlib.sha256(signature_data).hexdigest()

        # Store
        self.contexts[context.id] = context
        self._save_context(context)

        return context

    def _save_context(self, context: ContextUnit):
        """Save context to disk"""
        context_file = self.storage_dir / "contexts" / f"{context.id}.json"
        with open(context_file, 'w') as f:
            f.write(context.to_json())

    def query_contexts(
        self,
        context_type: Optional[ContextType] = None,
        owner: Optional[str] = None,
        limit: int = 10
    ) -> List[ContextUnit]:
        """Query contexts with filters"""
        results = []

        for context in self.contexts.values():
            if context_type and context.type != context_type.value:
                continue
            if owner and context.owner != owner:
                continue

            results.append(context)

            if len(results) >= limit:
                break

        return results

    def get_stats(self) -> Dict[str, Any]:
        """Get node statistics"""
        return {
            "did": self.did,
            "contexts_count": len(self.contexts),
            "storage_dir": str(self.storage_dir),
            "mode": "simplified (demo)"
        }


if __name__ == "__main__":
    print("ΨNet Simple Library - Use examples/demo_simple.py to see it in action")
