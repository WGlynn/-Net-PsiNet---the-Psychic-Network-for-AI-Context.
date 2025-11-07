#!/usr/bin/env python3
"""
ΨNet Simple Demo (No Cryptography Dependencies Required)
=========================================================

A simplified demonstration that works without cryptography libraries.

Run with: python3 examples/demo_simple.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'python'))

from psinet_simple import SimplePsiNetNode, ContextType


def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║         ΨNet - Simple Demo (No Crypto Dependencies)         ║
╚══════════════════════════════════════════════════════════════╝
    """)

    # Initialize node
    print("📦 Initializing PsiNet node...")
    node = SimplePsiNetNode(storage_dir=".psinet_simple")

    # Generate identity
    print("\n🆔 Generating identity...")
    did = node.generate_identity()
    print(f"✓ DID: {did.did}")
    print(f"✓ Public Key: {did.public_key[:32]}...")

    # Create conversation
    print("\n💬 Creating conversation context...")
    conversation = node.create_context(
        context_type=ContextType.CONVERSATION,
        content={
            "messages": [
                {"role": "user", "content": "What is PsiNet?"},
                {"role": "assistant", "content": "A decentralized AI context protocol!"}
            ]
        }
    )
    print(f"✓ Context ID: {conversation.id}")
    print(f"✓ Signature: {conversation.signature[:32]}...")

    # Create memory
    print("\n🧠 Creating memory context...")
    memory = node.create_context(
        context_type=ContextType.MEMORY,
        content={
            "memory": "User is interested in decentralized protocols",
            "tags": ["preference", "interests"]
        },
        previous=conversation.id
    )
    print(f"✓ Context ID: {memory.id}")
    print(f"✓ Linked to: {memory.previous}")

    # Query
    print("\n🔍 Querying contexts...")
    all_contexts = node.query_contexts()
    print(f"✓ Found {len(all_contexts)} contexts")

    # Stats
    print("\n📊 Node Statistics:")
    stats = node.get_stats()
    for key, value in stats.items():
        print(f"  • {key}: {value}")

    print("\n" + "=" * 64)
    print("✓ Demo complete!")
    print("=" * 64)
    print(f"\nAll data saved to: {stats['storage_dir']}/")
    print("\nNote: This is a simplified version for demo purposes.")
    print("For production use with real cryptography:")
    print("  pip install cryptography")
    print("  python3 examples/demo.py")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nDemo interrupted. Goodbye!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
