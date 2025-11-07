#!/usr/bin/env python3
"""
ΨNet Nostr Protocol Integration
================================

Integrates PsiNet with Nostr (Notes and Other Stuff Transmitted by Relays),
a decentralized social protocol for distributing AI contexts.

Features:
- Publish PsiNet contexts as Nostr events
- Connect to Nostr relays for P2P distribution
- Convert between Nostr keys and PsiNet DIDs
- Lightning zaps integration with X402 payment protocol
- Support for multiple Nostr event kinds (NIPs)
- AI-specific Nostr event kinds for contexts

Nostr Basics:
- Events: Everything is an event (notes, metadata, reactions)
- Relays: Servers that store and forward events
- Keys: Users identified by secp256k1 public keys (npub)
- NIPs: Nostr Implementation Possibilities (protocol specs)

Author: PsiNet Protocol Team
License: MIT
"""

import json
import time
import hashlib
import secrets
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from enum import Enum

# Nostr uses secp256k1 (like Bitcoin)
try:
    import secp256k1
    from secp256k1 import PrivateKey, PublicKey
    SECP256K1_AVAILABLE = True
except ImportError:
    SECP256K1_AVAILABLE = False
    print("⚠️  secp256k1 not available. Install with: pip install secp256k1")


# Bech32 encoding for Nostr keys (npub, nsec)
def bech32_encode(hrp: str, data: bytes) -> str:
    """Encode data in bech32 format (simplified version)"""
    # This is a simplified implementation
    # In production, use the python-bech32 library
    import base64
    encoded = base64.b32encode(data).decode().lower().rstrip('=')
    return f"{hrp}1{encoded}"


def bech32_decode(bech32_str: str) -> Tuple[str, bytes]:
    """Decode bech32 string (simplified version)"""
    import base64
    hrp, data_str = bech32_str.split('1', 1)
    # Add padding
    padding = (8 - len(data_str) % 8) % 8
    data_str += '=' * padding
    data = base64.b32decode(data_str.upper())
    return hrp, data


class NostrEventKind(Enum):
    """Nostr event kinds (NIPs)"""
    # Standard Nostr kinds
    METADATA = 0  # User metadata (NIP-01)
    TEXT_NOTE = 1  # Short text note (NIP-01)
    RECOMMEND_RELAY = 2  # Relay recommendation (NIP-01)
    CONTACTS = 3  # Contact list (NIP-02)
    ENCRYPTED_DM = 4  # Encrypted direct message (NIP-04)
    DELETE = 5  # Event deletion (NIP-09)
    REPOST = 6  # Repost (NIP-18)
    REACTION = 7  # Reaction (NIP-25)
    ZAP_REQUEST = 9734  # Lightning zap request (NIP-57)
    ZAP_RECEIPT = 9735  # Lightning zap receipt (NIP-57)

    # Custom PsiNet kinds (30000-39999 are replaceable events)
    PSINET_CONTEXT = 30078  # PsiNet AI context
    PSINET_CONVERSATION = 30079  # AI conversation
    PSINET_MEMORY = 30080  # AI memory
    PSINET_SKILL = 30081  # AI skill
    PSINET_KNOWLEDGE = 30082  # Knowledge graph
    PSINET_PAYMENT = 30083  # Payment requirement


@dataclass
class NostrEvent:
    """Nostr event structure (NIP-01)"""
    id: str  # Event ID (sha256 hash)
    pubkey: str  # Author's public key (hex)
    created_at: int  # Unix timestamp
    kind: int  # Event kind
    tags: List[List[str]]  # Event tags
    content: str  # Event content
    sig: str  # Signature (schnorr)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "pubkey": self.pubkey,
            "created_at": self.created_at,
            "kind": self.kind,
            "tags": self.tags,
            "content": self.content,
            "sig": self.sig
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

    @staticmethod
    def compute_id(pubkey: str, created_at: int, kind: int, tags: List[List[str]], content: str) -> str:
        """Compute event ID per NIP-01"""
        event_data = [
            0,  # Reserved for future use
            pubkey,
            created_at,
            kind,
            tags,
            content
        ]
        serialized = json.dumps(event_data, separators=(',', ':'), ensure_ascii=False)
        return hashlib.sha256(serialized.encode()).hexdigest()


@dataclass
class NostrRelay:
    """Nostr relay configuration"""
    url: str
    read: bool = True
    write: bool = True

    def to_dict(self) -> Dict:
        return {"url": self.url, "read": self.read, "write": self.write}


class NostrKeyManager:
    """
    Manages Nostr keys (secp256k1) and conversion to/from PsiNet DIDs
    """

    def __init__(self):
        self.private_key: Optional[bytes] = None
        self.public_key: Optional[bytes] = None
        self.npub: Optional[str] = None  # Nostr public key (bech32)
        self.nsec: Optional[str] = None  # Nostr private key (bech32)

    def generate_keys(self) -> Tuple[str, str]:
        """Generate new Nostr key pair"""
        # Generate 32 random bytes for private key
        self.private_key = secrets.token_bytes(32)

        if SECP256K1_AVAILABLE:
            # Use secp256k1 library
            privkey = PrivateKey(self.private_key)
            self.public_key = privkey.pubkey.serialize()[1:]  # Remove 0x04 prefix (uncompressed)
        else:
            # Simplified fallback (NOT cryptographically secure for production)
            self.public_key = hashlib.sha256(self.private_key).digest()

        # Encode as bech32
        self.npub = bech32_encode("npub", self.public_key)
        self.nsec = bech32_encode("nsec", self.private_key)

        return self.npub, self.nsec

    def get_public_key_hex(self) -> str:
        """Get public key as hex string"""
        if self.public_key:
            return self.public_key.hex()
        return ""

    def get_private_key_hex(self) -> str:
        """Get private key as hex string"""
        if self.private_key:
            return self.private_key.hex()
        return ""

    def sign_event(self, event_id: str) -> str:
        """Sign event with Schnorr signature"""
        if not self.private_key:
            raise ValueError("Private key not available")

        event_id_bytes = bytes.fromhex(event_id)

        if SECP256K1_AVAILABLE:
            privkey = PrivateKey(self.private_key)
            # Schnorr signature (BIP-340)
            signature = privkey.schnorr_sign(event_id_bytes, None, raw=True)
            return signature.hex()
        else:
            # Simplified fallback (NOT secure for production)
            signature = hashlib.sha256(self.private_key + event_id_bytes).digest()
            return signature.hex()

    def to_psinet_did(self) -> str:
        """Convert Nostr public key to PsiNet DID"""
        if not self.public_key:
            raise ValueError("Public key not available")

        # Create DID from Nostr public key
        pubkey_hash = hashlib.sha256(self.public_key).hexdigest()[:16]
        return f"did:psinet:nostr:{pubkey_hash}"


class NostrClient:
    """
    Nostr relay client for publishing and subscribing to events
    """

    def __init__(self, relays: Optional[List[str]] = None):
        self.relays = relays or [
            "wss://relay.damus.io",
            "wss://relay.nostr.band",
            "wss://nos.lol",
            "wss://relay.snort.social"
        ]

        self.relay_connections: Dict[str, NostrRelay] = {}

        # Initialize relay configurations
        for relay_url in self.relays:
            self.relay_connections[relay_url] = NostrRelay(url=relay_url)

    def publish_event(self, event: NostrEvent) -> bool:
        """
        Publish event to Nostr relays

        In production, use websocket connection:
        - Connect to relay via WebSocket
        - Send ["EVENT", event.to_dict()]
        - Wait for ["OK", event_id, true/false, message]
        """
        print(f"📡 Publishing to {len(self.relays)} Nostr relays...")

        for relay_url in self.relays:
            relay = self.relay_connections[relay_url]
            if not relay.write:
                continue

            print(f"  → {relay_url[:30]}...")

            # In production, use websocket:
            # ws = websocket.create_connection(relay_url)
            # ws.send(json.dumps(["EVENT", event.to_dict()]))
            # response = json.loads(ws.recv())
            # ws.close()

            # Simulated for demo
            print(f"    ✓ Published event {event.id[:16]}...")

        return True

    def subscribe(self, filters: Dict[str, Any]) -> List[NostrEvent]:
        """
        Subscribe to events from relays

        In production:
        - Send ["REQ", subscription_id, filters]
        - Receive ["EVENT", subscription_id, event]
        - Close with ["CLOSE", subscription_id]
        """
        print(f"📡 Subscribing to events with filters: {filters}")

        # Simulated for demo
        events = []
        print(f"    ✓ Received 0 events (demo mode)")

        return events

    def add_relay(self, relay_url: str, read: bool = True, write: bool = True):
        """Add a new relay"""
        if relay_url not in self.relay_connections:
            self.relays.append(relay_url)
            self.relay_connections[relay_url] = NostrRelay(
                url=relay_url,
                read=read,
                write=write
            )


class PsiNetNostrBridge:
    """
    Bridge between PsiNet and Nostr protocol

    Converts PsiNet contexts to Nostr events and publishes them
    to the Nostr network for decentralized distribution.
    """

    def __init__(self, psinet_node, nostr_client: NostrClient):
        self.psinet_node = psinet_node
        self.nostr_client = nostr_client
        self.key_manager = NostrKeyManager()

        # Generate Nostr keys from PsiNet identity
        self.npub, self.nsec = self.key_manager.generate_keys()

    def context_to_nostr_event(
        self,
        context,
        kind: NostrEventKind = NostrEventKind.PSINET_CONTEXT
    ) -> NostrEvent:
        """Convert PsiNet context to Nostr event"""

        # Create tags
        tags = [
            ["d", context.id],  # 'd' tag for replaceable events
            ["psinet", "context"],
            ["type", context.type],
            ["owner", context.owner]
        ]

        if context.previous:
            tags.append(["e", context.previous])  # Reference to previous event

        # Content is JSON-encoded context
        content = json.dumps({
            "content": context.content,
            "metadata": context.metadata,
            "timestamp": context.timestamp
        })

        # Create event
        created_at = int(time.time())
        pubkey = self.key_manager.get_public_key_hex()

        event_id = NostrEvent.compute_id(
            pubkey=pubkey,
            created_at=created_at,
            kind=kind.value,
            tags=tags,
            content=content
        )

        # Sign event
        signature = self.key_manager.sign_event(event_id)

        event = NostrEvent(
            id=event_id,
            pubkey=pubkey,
            created_at=created_at,
            kind=kind.value,
            tags=tags,
            content=content,
            sig=signature
        )

        return event

    def publish_context(self, context) -> NostrEvent:
        """Publish PsiNet context to Nostr network"""

        # Determine event kind based on context type
        kind_map = {
            "conversation": NostrEventKind.PSINET_CONVERSATION,
            "memory": NostrEventKind.PSINET_MEMORY,
            "skill": NostrEventKind.PSINET_SKILL,
            "knowledge": NostrEventKind.PSINET_KNOWLEDGE
        }

        kind = kind_map.get(context.type, NostrEventKind.PSINET_CONTEXT)

        # Convert to Nostr event
        event = self.context_to_nostr_event(context, kind)

        # Publish to relays
        self.nostr_client.publish_event(event)

        print(f"✓ Published context to Nostr: {event.id[:16]}...")
        return event

    def create_zap_request(
        self,
        amount_sats: int,
        recipient_pubkey: str,
        context_id: Optional[str] = None,
        comment: str = ""
    ) -> NostrEvent:
        """
        Create Lightning zap request (NIP-57)
        Integrates with X402 payment protocol
        """

        tags = [
            ["p", recipient_pubkey],  # Recipient
            ["amount", str(amount_sats * 1000)],  # Amount in millisats
            ["relays"] + self.nostr_client.relays[:3]  # Relay hints
        ]

        if context_id:
            tags.append(["e", context_id])  # Context being paid for

        content = comment

        created_at = int(time.time())
        pubkey = self.key_manager.get_public_key_hex()

        event_id = NostrEvent.compute_id(
            pubkey=pubkey,
            created_at=created_at,
            kind=NostrEventKind.ZAP_REQUEST.value,
            tags=tags,
            content=content
        )

        signature = self.key_manager.sign_event(event_id)

        event = NostrEvent(
            id=event_id,
            pubkey=pubkey,
            created_at=created_at,
            kind=NostrEventKind.ZAP_REQUEST.value,
            tags=tags,
            content=content,
            sig=signature
        )

        return event

    def publish_zap_request(
        self,
        amount_sats: int,
        recipient_pubkey: str,
        context_id: Optional[str] = None,
        comment: str = ""
    ) -> NostrEvent:
        """Publish zap request to Nostr (for Lightning payment)"""

        event = self.create_zap_request(
            amount_sats=amount_sats,
            recipient_pubkey=recipient_pubkey,
            context_id=context_id,
            comment=comment
        )

        self.nostr_client.publish_event(event)

        print(f"⚡ Published zap request: {amount_sats} sats")
        return event

    def create_text_note(self, content: str, reply_to: Optional[str] = None) -> NostrEvent:
        """Create a simple text note (kind 1)"""

        tags = []
        if reply_to:
            tags.append(["e", reply_to, "", "reply"])

        created_at = int(time.time())
        pubkey = self.key_manager.get_public_key_hex()

        event_id = NostrEvent.compute_id(
            pubkey=pubkey,
            created_at=created_at,
            kind=NostrEventKind.TEXT_NOTE.value,
            tags=tags,
            content=content
        )

        signature = self.key_manager.sign_event(event_id)

        event = NostrEvent(
            id=event_id,
            pubkey=pubkey,
            created_at=created_at,
            kind=NostrEventKind.TEXT_NOTE.value,
            tags=tags,
            content=content,
            sig=signature
        )

        return event

    def get_nostr_profile(self) -> Dict[str, Any]:
        """Get Nostr profile information"""
        return {
            "npub": self.npub,
            "pubkey": self.key_manager.get_public_key_hex(),
            "psinet_did": self.key_manager.to_psinet_did(),
            "relays": self.nostr_client.relays
        }


# Helper functions

def create_nostr_metadata(name: str, about: str, picture: str = "") -> Dict[str, str]:
    """Create Nostr metadata (kind 0)"""
    return {
        "name": name,
        "about": about,
        "picture": picture
    }


if __name__ == "__main__":
    print("ΨNet Nostr Integration - Use examples/demo_nostr.py")
