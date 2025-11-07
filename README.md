# ΨNet: The Psychic Network for AI Context

**Hybrid decentralized AI context protocol** enabling AI agents to own, share, and verify their conversation history, memories, skills, and knowledge across systems securely.

```
╔══════════════════════════════════════════════════════════════╗
║     🧠 Decentralized  •  🔐 Secure  •  🌐 Interoperable      ║
╚══════════════════════════════════════════════════════════════╝
```

## ✨ Features

- **🆔 Decentralized Identity** - Ed25519 DIDs for AI agents
- **🔗 Blockchain Verification** - Content-addressed chains
- **🌐 Hybrid Storage** - Local, IPFS, Arweave, Federated
- **🔐 Zero-Knowledge Proofs** - Privacy-preserving verification
- **🎯 Capability-Based Access** - Fine-grained permissions
- **📊 Context Graphs** - DAG structure with CRDT merging
- **🤖 AI-Native** - Built for conversations, memories, skills

## 🚀 Quick Start

```bash
# Run setup
./setup.sh

# Run demo
python3 examples/demo.py
```

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

## 📖 What is PsiNet?

ΨNet combines:
- **P2P networking** (IPFS-style content addressing)
- **Blockchain verification** (Bitcoin-style chains)
- **Permanent storage** (Arweave)
- **Federated networks** (Email-style federation)

...to create a **decentralized protocol for AI context** that enables:
- AI agents to own their data
- Cryptographic verification of context
- Sharing across different AI systems
- Privacy-first design

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              Your AI Agent                      │
│              (with DID)                         │
└─────────────┬───────────────────────────────────┘
              │
              ├─── Local Storage (.psinet/)
              ├─── IPFS (P2P distribution)
              ├─── Arweave (permanent storage)
              └─── Federated Nodes
                   │
                   └─── Other AI Agents
```

## 💻 Usage Example

```python
from src.python.psinet_core import PsiNetNode, ContextType

# Initialize node
node = PsiNetNode()
did = node.generate_identity()

# Create a conversation context
context = node.create_context(
    context_type=ContextType.CONVERSATION,
    content={
        "messages": [
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hi! I'm using PsiNet!"}
        ]
    }
)

# Context is cryptographically signed and stored
print(f"Context ID: {context.id}")
print(f"Owner: {context.owner}")
print(f"Signature: {context.signature[:32]}...")

# Verify integrity
is_valid = node.verify_context(context, did.public_key)
print(f"Valid: {is_valid}")  # True
```

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get running in 3 minutes
- **[Full Documentation](docs/README.md)** - Complete guide
- **[API Reference](docs/API.md)** - API documentation (coming soon)
- **[Protocol Specification](docs/PROTOCOL.md)** - Technical spec (coming soon)

## 🛠️ Technology Stack

- **Cryptography**: Ed25519 signatures, SHA-256 hashing
- **Storage**: Local JSON, IPFS, Arweave
- **Identity**: Decentralized Identifiers (DIDs)
- **Verification**: Blockchain-style chains, digital signatures
- **Languages**: Python (current), Nim (coming soon)

## 🗺️ Roadmap

- [x] Core protocol implementation
- [x] DID generation and management
- [x] Context creation and verification
- [x] Blockchain-style chains
- [x] Access control system
- [x] Local storage
- [ ] Full IPFS integration
- [ ] Arweave integration
- [ ] P2P networking (libp2p)
- [ ] Zero-knowledge proofs (complete)
- [ ] Browser extension
- [ ] Desktop application

## 🤝 Contributing

Contributions welcome! This is an open-source project.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Resources

- [DID Core Specification](https://www.w3.org/TR/did-core/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Arweave Documentation](https://docs.arweave.org/)
- [Ed25519 Signature Scheme](https://ed25519.cr.yp.to/)

## 💬 Community

- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - Questions and ideas
- **Discord** - Coming soon

---

**Built with 💜 for the decentralized AI future**
