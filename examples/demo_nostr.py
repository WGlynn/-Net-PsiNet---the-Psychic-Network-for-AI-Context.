#!/usr/bin/env python3
"""
ΨNet Nostr Protocol Integration Demo
=====================================

Demonstrates integration between PsiNet and Nostr protocol for
decentralized AI context distribution.

Features demonstrated:
1. Generating Nostr keys (npub/nsec)
2. Converting between Nostr and PsiNet DIDs
3. Publishing PsiNet contexts to Nostr relays
4. Creating text notes on Nostr
5. Lightning zaps for payments (integrates with X402)
6. Relay management

Run with: python3 examples/demo_nostr.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'python'))

from psinet_simple import SimplePsiNetNode, ContextType
from psinet_nostr import (
    NostrKeyManager,
    NostrClient,
    NostrEventKind,
    PsiNetNostrBridge,
    create_nostr_metadata
)


def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_section(text):
    """Print formatted section"""
    print(f"\n▶ {text}")
    print("-" * 70)


def main():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║            ΨNet + Nostr Protocol Integration Demo                    ║
║                                                                      ║
║     Decentralized AI Context Distribution via Nostr Network          ║
╚══════════════════════════════════════════════════════════════════════╝
    """)

    # ========================================================================
    # STEP 1: Initialize PsiNet Node
    # ========================================================================
    print_header("STEP 1: Initialize PsiNet Node")

    print_section("Creating PsiNet node")
    psinet_node = SimplePsiNetNode(storage_dir=".psinet_nostr")
    psinet_did_doc = psinet_node.generate_identity()
    print(f"✓ PsiNet DID: {psinet_did_doc.did}")
    print(f"✓ Public Key: {psinet_did_doc.public_key[:32]}...")

    # ========================================================================
    # STEP 2: Generate Nostr Keys
    # ========================================================================
    print_header("STEP 2: Generate Nostr Keys")

    print_section("Creating Nostr key pair")
    key_manager = NostrKeyManager()
    npub, nsec = key_manager.generate_keys()

    print(f"✓ Nostr Public Key (npub): {npub}")
    print(f"✓ Nostr Secret Key (nsec): {nsec[:20]}... (keep secret!)")
    print(f"✓ Public Key (hex): {key_manager.get_public_key_hex()[:32]}...")

    print_section("Converting Nostr key to PsiNet DID")
    nostr_did = key_manager.to_psinet_did()
    print(f"✓ PsiNet DID from Nostr: {nostr_did}")
    print(f"  This allows Nostr identities to use PsiNet!")

    # ========================================================================
    # STEP 3: Initialize Nostr Client
    # ========================================================================
    print_header("STEP 3: Initialize Nostr Client")

    print_section("Connecting to Nostr relays")
    nostr_client = NostrClient(relays=[
        "wss://relay.damus.io",
        "wss://relay.nostr.band",
        "wss://nos.lol",
        "wss://relay.snort.social"
    ])

    print(f"✓ Connected to {len(nostr_client.relays)} relays:")
    for relay_url in nostr_client.relays:
        print(f"  • {relay_url}")

    print_section("Adding custom relay")
    nostr_client.add_relay("wss://relay.psinet.ai", read=True, write=True)
    print(f"✓ Added custom relay: wss://relay.psinet.ai")

    # ========================================================================
    # STEP 4: Create PsiNet-Nostr Bridge
    # ========================================================================
    print_header("STEP 4: Create PsiNet-Nostr Bridge")

    print_section("Initializing bridge")
    bridge = PsiNetNostrBridge(psinet_node, nostr_client)

    profile = bridge.get_nostr_profile()
    print(f"✓ Bridge initialized")
    print(f"  Nostr npub: {profile['npub']}")
    print(f"  PsiNet DID: {profile['psinet_did']}")
    print(f"  Publishing to {len(profile['relays'])} relays")

    # ========================================================================
    # STEP 5: Publish Contexts to Nostr
    # ========================================================================
    print_header("STEP 5: Publish PsiNet Contexts to Nostr")

    print_section("Creating AI conversation context")
    conversation = psinet_node.create_context(
        context_type=ContextType.CONVERSATION,
        content={
            "messages": [
                {"role": "user", "content": "What is the future of decentralized AI?"},
                {"role": "assistant", "content": "Decentralized AI will enable agents to own their data, share knowledge via protocols like Nostr, and receive fair compensation through systems like X402 payments."}
            ]
        },
        metadata={
            "model": "claude-sonnet-4.5",
            "topic": "decentralized-ai"
        }
    )

    print(f"✓ Context created: {conversation.id[:16]}...")
    print(f"  Type: {conversation.type}")
    print(f"  Messages: {len(conversation.content['messages'])}")

    print_section("Publishing context to Nostr network")
    nostr_event = bridge.publish_context(conversation)

    print(f"✓ Published as Nostr event!")
    print(f"  Event ID: {nostr_event.id[:16]}...")
    print(f"  Event kind: {nostr_event.kind} (PsiNet Conversation)")
    print(f"  Signature: {nostr_event.sig[:32]}...")
    print(f"  Published to {len(nostr_client.relays)} relays")

    print_section("Creating memory context")
    memory = psinet_node.create_context(
        context_type=ContextType.MEMORY,
        content={
            "memory": "User is interested in decentralized protocols",
            "tags": ["nostr", "psinet", "decentralization"]
        },
        previous=conversation.id
    )

    print(f"✓ Memory context: {memory.id[:16]}...")

    print_section("Publishing memory to Nostr")
    memory_event = bridge.publish_context(memory)
    print(f"✓ Memory published!")
    print(f"  Linked to previous: {conversation.id[:16]}...")

    print_section("Creating AI skill context")
    skill = psinet_node.create_context(
        context_type=ContextType.SKILL,
        content={
            "name": "nostr_integration",
            "description": "Integrate AI contexts with Nostr protocol",
            "capabilities": ["publish_events", "subscribe_relays", "zap_payments"]
        }
    )

    print(f"✓ Skill context: {skill.id[:16]}...")

    skill_event = bridge.publish_context(skill)
    print(f"✓ Skill published to Nostr!")

    # ========================================================================
    # STEP 6: Create Text Notes
    # ========================================================================
    print_header("STEP 6: Create Nostr Text Notes")

    print_section("Creating a text note (kind 1)")
    note = bridge.create_text_note(
        content="Just published my AI conversation to Nostr via PsiNet! 🤖⚡\n\n" +
                "Decentralized AI contexts are here. #nostr #psinet #ai"
    )

    print(f"✓ Text note created")
    print(f"  Event ID: {note.id[:16]}...")
    print(f"  Content: {note.content[:50]}...")

    print_section("Publishing text note")
    nostr_client.publish_event(note)
    print(f"✓ Note published!")

    print_section("Creating reply to previous note")
    reply = bridge.create_text_note(
        content="This is the future of AI! 🚀",
        reply_to=note.id
    )

    print(f"✓ Reply created")
    print(f"  Replying to: {note.id[:16]}...")

    nostr_client.publish_event(reply)
    print(f"✓ Reply published!")

    # ========================================================================
    # STEP 7: Lightning Zaps (Payment Integration)
    # ========================================================================
    print_header("STEP 7: Lightning Zaps for Payments")

    print_section("Creating zap request (NIP-57)")
    print("💡 Zaps integrate Nostr with X402 payment protocol")

    recipient_pubkey = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"  # Example

    zap_event = bridge.create_zap_request(
        amount_sats=1000,  # 1000 satoshis
        recipient_pubkey=recipient_pubkey,
        context_id=conversation.id,
        comment="⚡ Zap for amazing AI conversation!"
    )

    print(f"✓ Zap request created")
    print(f"  Amount: 1000 sats")
    print(f"  Recipient: {recipient_pubkey[:16]}...")
    print(f"  For context: {conversation.id[:16]}...")
    print(f"  Comment: {zap_event.content}")

    print_section("Publishing zap request")
    bridge.publish_zap_request(
        amount_sats=1000,
        recipient_pubkey=recipient_pubkey,
        context_id=conversation.id,
        comment="⚡ Payment for AI context access"
    )

    print(f"✓ Zap request published!")
    print(f"  This triggers Lightning payment")
    print(f"  Integrates with X402 payment protocol")

    print_section("Creating zap request for skill")
    skill_zap = bridge.create_zap_request(
        amount_sats=5000,  # 5000 sats
        recipient_pubkey=recipient_pubkey,
        context_id=skill.id,
        comment="💰 Payment for AI skill access"
    )

    print(f"✓ Skill zap request")
    print(f"  Amount: 5000 sats")
    print(f"  For skill: nostr_integration")

    # ========================================================================
    # STEP 8: Event Tags and Discovery
    # ========================================================================
    print_header("STEP 8: Event Tags and Discovery")

    print_section("Analyzing event tags")
    print(f"Conversation event tags:")
    for tag in nostr_event.tags:
        print(f"  {tag}")

    print(f"\n✓ Tags enable:")
    print(f"  • Context discovery (d tag)")
    print(f"  • Type filtering (type tag)")
    print(f"  • Owner attribution (owner tag)")
    print(f"  • Chain linking (e tag)")

    print_section("Querying events (demonstration)")
    filters = {
        "kinds": [NostrEventKind.PSINET_CONTEXT.value],
        "authors": [bridge.key_manager.get_public_key_hex()],
        "limit": 10
    }

    print(f"Query filters:")
    print(f"  kinds: {filters['kinds']}")
    print(f"  authors: {filters['authors'][:16]}...")
    print(f"  limit: {filters['limit']}")

    events = nostr_client.subscribe(filters)
    print(f"✓ Would retrieve: contexts published by this author")

    # ========================================================================
    # STEP 9: Integration Summary
    # ========================================================================
    print_header("STEP 9: Integration Benefits")

    print(f"""
🌐 PsiNet + Nostr Integration Benefits:

Decentralization:
  • PsiNet contexts distributed across Nostr relays
  • No central server required
  • Censorship-resistant AI context storage
  • Global relay network

Identity:
  • Nostr keys (npub/nsec) work with PsiNet
  • Unified identity across systems
  • Public key cryptography (secp256k1)
  • Compatible with Bitcoin/Lightning

Distribution:
  • AI contexts published to multiple relays
  • Automatic replication across network
  • Real-time event propagation
  • Relay redundancy

Payments:
  • Lightning zaps (NIP-57) integrate with X402
  • Instant micropayments for AI contexts
  • Tip creators for quality content
  • Monetize AI knowledge seamlessly

Discovery:
  • Context tagging and filtering
  • Event kind standardization
  • Topic-based discovery
  • AI agent profiles on Nostr

Use Cases:
  • Publish AI conversations to Nostr
  • Share memories across decentralized network
  • Distribute AI skills and capabilities
  • Monetize knowledge with Lightning
  • Build decentralized AI marketplace
  • Create AI agent social networks

Technical:
  • Event signing with Schnorr signatures
  • WebSocket relay connections
  • Bech32 key encoding (npub/nsec)
  • NIPs (Nostr Implementation Possibilities)
  • Replaceable events for updates
    """)

    # ========================================================================
    # Summary
    # ========================================================================
    print_header("Summary")

    print(f"""
✓ Demonstrated PsiNet + Nostr Integration:

Identity & Keys:
  • Generated Nostr keypair (npub/nsec)
  • Converted to PsiNet DID
  • Public key cryptography (secp256k1)

Nostr Network:
  • Connected to {len(nostr_client.relays)} relays
  • Published {3} PsiNet contexts as Nostr events
  • Created text notes and replies
  • Event signing with Schnorr signatures

Context Publishing:
  • Conversation → Nostr kind {NostrEventKind.PSINET_CONVERSATION.value}
  • Memory → Nostr kind {NostrEventKind.PSINET_MEMORY.value}
  • Skill → Nostr kind {NostrEventKind.PSINET_SKILL.value}

Lightning Integration:
  • Created zap requests (NIP-57)
  • Integrated with X402 payment protocol
  • Micropayments for AI contexts

Next Steps:
  1. Install WebSocket library: pip install websocket-client
  2. Connect to real Nostr relays
  3. Subscribe to AI context events
  4. Integrate Lightning wallet for zaps
  5. Build AI agent Nostr profiles
  6. Create decentralized AI marketplace

Your Nostr Identity:
  npub: {npub}
  DID:  {nostr_did}

Share your AI contexts on Nostr! 🤖⚡🌐
    """)

    print("\n" + "=" * 70)
    print("  Demo Complete! 🎉")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nDemo interrupted. Goodbye!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
