#!/usr/bin/env python3
"""
ΨNet Protocol Demonstration
===========================

This demo shows all the key features of the PsiNet protocol:
1. Identity generation with DIDs
2. Context creation and signing
3. Blockchain-style verification
4. Access control with capabilities
5. Context queries and chains

Run with: python examples/demo.py
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'python'))

from psinet_core import (
    PsiNetNode,
    ContextType,
    AccessCapability,
    create_conversation_context,
    create_memory_context
)


def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_section(text):
    """Print a formatted section"""
    print(f"\n▶ {text}")
    print("-" * 70)


def main():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                  ΨNet - Decentralized AI Context Protocol            ║
║                                                                      ║
║  Hybrid P2P • Blockchain Verification • Zero-Knowledge Proofs       ║
╚══════════════════════════════════════════════════════════════════════╝
    """)

    # ========================================================================
    # STEP 1: Initialize Node and Create Identity
    # ========================================================================
    print_header("STEP 1: Initialize Node & Create Identity")

    node = PsiNetNode(storage_dir=".psinet")

    try:
        did_doc = node.generate_identity()
        print(f"✓ Generated new DID: {did_doc.did}")
        print(f"✓ Public Key: {did_doc.public_key[:32]}...")
        print(f"✓ Created: {did_doc.created}")
    except RuntimeError as e:
        print(f"⚠️  {e}")
        print("   Installing: pip install cryptography")
        return

    # ========================================================================
    # STEP 2: Create Contexts
    # ========================================================================
    print_header("STEP 2: Create AI Contexts")

    print_section("Creating a conversation context")
    conversation = create_conversation_context(
        node,
        messages=[
            {"role": "user", "content": "What is the meaning of life?"},
            {"role": "assistant", "content": "42, according to Douglas Adams. But seriously, the meaning of life is subjective..."}
        ]
    )
    print(f"✓ Context ID: {conversation.id}")
    print(f"✓ Type: {conversation.type}")
    print(f"✓ Owner: {conversation.owner}")
    print(f"✓ Signed: {conversation.signature[:32]}..." if conversation.signature else "⚠️  No signature")

    print_section("Creating a memory context (linked to conversation)")
    memory = create_memory_context(
        node,
        memory="User is interested in philosophical questions",
        tags=["philosophy", "preferences", "user-profile"],
        previous=conversation.id  # Blockchain-style linking!
    )
    print(f"✓ Context ID: {memory.id}")
    print(f"✓ Previous: {memory.previous}")
    print(f"✓ Tags: {memory.content['tags']}")

    print_section("Creating a skill context")
    skill = node.create_context(
        context_type=ContextType.SKILL,
        content={
            "name": "code_review",
            "description": "Review code for security and performance issues",
            "parameters": ["language", "framework", "focus_areas"]
        },
        metadata={
            "version": "1.0",
            "author": node.did
        }
    )
    print(f"✓ Context ID: {skill.id}")
    print(f"✓ Skill: {skill.content['name']}")

    print_section("Creating a knowledge graph context")
    knowledge = node.create_context(
        context_type=ContextType.KNOWLEDGE,
        content={
            "entities": [
                {"name": "PsiNet", "type": "protocol"},
                {"name": "IPFS", "type": "storage"},
                {"name": "Arweave", "type": "blockchain"}
            ],
            "relationships": [
                {"from": "PsiNet", "to": "IPFS", "type": "uses"},
                {"from": "PsiNet", "to": "Arweave", "type": "uses"}
            ]
        }
    )
    print(f"✓ Context ID: {knowledge.id}")
    print(f"✓ Entities: {len(knowledge.content['entities'])}")
    print(f"✓ Relationships: {len(knowledge.content['relationships'])}")

    # ========================================================================
    # STEP 3: Verify Contexts
    # ========================================================================
    print_header("STEP 3: Verify Context Signatures")

    print_section("Verifying conversation context")
    is_valid = node.verify_context(conversation, did_doc.public_key)
    print(f"✓ Signature valid: {is_valid}")
    print(f"✓ Content hash matches: {conversation.id == conversation.content_hash()}")

    # ========================================================================
    # STEP 4: Create and Verify Chain
    # ========================================================================
    print_header("STEP 4: Create Context Chain")

    print_section("Creating a chain of contexts")
    chain = node.create_chain([conversation.id, memory.id])
    print(f"✓ Chain ID: {chain.chain_id}")
    print(f"✓ Contexts in chain: {len(chain.contexts)}")

    print_section("Verifying chain integrity")
    is_valid_chain = node.verify_chain(chain.chain_id)
    print(f"✓ Chain valid: {is_valid_chain}")

    # ========================================================================
    # STEP 5: Access Control
    # ========================================================================
    print_header("STEP 5: Access Control & Capabilities")

    # Create another node to grant access to
    print_section("Creating a second node (simulating another AI agent)")
    other_node = PsiNetNode(storage_dir=".psinet_other")
    other_did = other_node.generate_identity()
    print(f"✓ Other DID: {other_did.did}")

    print_section("Granting READ access to the other agent")
    access_token = node.grant_access(
        capability=AccessCapability.READ,
        granted_to_did=other_did.did,
        context_id=conversation.id,
        expires_in_hours=24
    )
    print(f"✓ Granted: {access_token.capability}")
    print(f"✓ To: {access_token.granted_to}")
    print(f"✓ Expires: {access_token.expires}")
    print(f"✓ Signed: {access_token.signature[:32]}..." if access_token.signature else "")

    print_section("Checking access permissions")
    has_read = node.check_access(access_token, AccessCapability.READ, conversation.id)
    has_write = node.check_access(access_token, AccessCapability.WRITE, conversation.id)
    print(f"✓ Has READ access: {has_read}")
    print(f"✓ Has WRITE access: {has_write}")

    # ========================================================================
    # STEP 6: Query Contexts
    # ========================================================================
    print_header("STEP 6: Query & Search Contexts")

    print_section("Finding all conversation contexts")
    conversations = node.query_contexts(context_type=ContextType.CONVERSATION)
    print(f"✓ Found {len(conversations)} conversation(s)")

    print_section("Finding all contexts owned by this DID")
    my_contexts = node.query_contexts(owner=node.did)
    print(f"✓ Found {len(my_contexts)} context(s)")

    print_section("Finding recent contexts (last hour)")
    from datetime import datetime, timedelta
    recent_time = (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z"
    recent = node.query_contexts(after=recent_time)
    print(f"✓ Found {len(recent)} recent context(s)")

    # ========================================================================
    # STEP 7: Storage & Export
    # ========================================================================
    print_header("STEP 7: Storage & Export")

    print_section("Local storage")
    stats = node.get_stats()
    print(f"✓ Storage directory: {stats['storage_dir']}")
    print(f"✓ Total contexts: {stats['contexts_count']}")
    print(f"✓ Total chains: {stats['chains_count']}")
    print(f"✓ Access tokens: {stats['access_tokens']}")

    print_section("Exporting context to file")
    export_path = "exported_context.json"
    node.export_context(conversation.id, export_path)
    print(f"✓ Exported to: {export_path}")

    print_section("IPFS Publishing (optional)")
    print("⚠️  To publish to IPFS, start an IPFS daemon:")
    print("   $ ipfs init")
    print("   $ ipfs daemon")
    print("\n   Then this will work:")
    print(f"   >>> cid = node.publish_to_ipfs(conversation)")
    print(f"   >>> print(f'Published to IPFS: {{cid}}')")

    # ========================================================================
    # Summary
    # ========================================================================
    print_header("Summary")
    print(f"""
✓ Created decentralized identity (DID)
✓ Generated Ed25519 cryptographic keypair
✓ Created 4 different types of contexts
✓ Signed all contexts with private key
✓ Verified signatures and content hashes
✓ Created blockchain-style context chain
✓ Verified chain integrity
✓ Granted time-limited access capabilities
✓ Queried and filtered contexts
✓ Stored everything locally in {stats['storage_dir']}

All contexts are saved to disk and can be:
  • Shared via IPFS (content-addressed, P2P)
  • Stored permanently on Arweave (blockchain)
  • Synced across federated nodes
  • Queried and verified cryptographically

Next steps:
  1. Explore the {stats['storage_dir']} directory
  2. Check out the exported context: {export_path}
  3. Read the docs: docs/README.md
  4. Try the advanced examples
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
