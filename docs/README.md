# ΨNet: Decentralized AI Context Protocol

## 🎯 Overview

**ΨNet** (PsiNet) is a hybrid decentralized protocol for AI context storage, sharing, and verification. It enables AI agents to own, share, and verify their conversation history, memories, skills, and knowledge across different systems securely.

### Key Features

1. **Hybrid Decentralization**
   - Local encrypted storage
   - IPFS-style content addressing
   - Arweave permanent blockchain storage
   - Federated server networks

2. **Complete Identity & Access Control**
   - Decentralized Identifiers (DIDs) based on DID Core spec
   - Ed25519 cryptographic keypairs
   - Capability-based permissions (read, write, share, delegate)
   - Time-limited access tokens

3. **Blockchain-Style Verification**
   - Each context unit links to previous (like Bitcoin blocks)
   - Content-addressed hashing (SHA-256)
   - Chain integrity verification
   - Cryptographic signatures on all contexts

4. **Privacy-First**
   - Zero-knowledge proof support
   - Encryption for sensitive contexts
   - No identity leakage
   - Self-sovereign data ownership

5. **Context Graph (DAG)**
   - Contexts form a directed acyclic graph
   - CRDT-style merging for P2P sync
   - Query and traverse history
   - Efficient version control

6. **Rich Context Types**
   - Conversations (AI chat history)
   - Memories (user preferences, facts)
   - Skills (agent capabilities)
   - Knowledge graphs (structured data)
   - Documents (files, embeddings)

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd PsiNet

# Run setup script
./setup.sh

# Or manual installation:
pip install -r requirements.txt
```

### Run the Demo

```bash
python3 examples/demo.py
```

This will:
- Generate a new DID and cryptographic identity
- Create various types of contexts
- Sign and verify contexts
- Create blockchain-style chains
- Demonstrate access control
- Query and export contexts

### Basic Usage

```python
from src.python.psinet_core import PsiNetNode, ContextType

# Initialize node
node = PsiNetNode(storage_dir=".psinet")

# Generate identity (DID + keypair)
did_doc = node.generate_identity()
print(f"Your DID: {did_doc.did}")

# Create a conversation context
context = node.create_context(
    context_type=ContextType.CONVERSATION,
    content={
        "messages": [
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hi there!"}
        ]
    }
)

# Context is automatically signed and stored locally
print(f"Context ID: {context.id}")
print(f"Signature: {context.signature}")

# Verify the context
is_valid = node.verify_context(context, did_doc.public_key)
print(f"Valid: {is_valid}")

# Query contexts
conversations = node.query_contexts(context_type=ContextType.CONVERSATION)
print(f"Found {len(conversations)} conversations")
```

## 📚 Architecture

### Core Components

```
PsiNetNode
├── Identity Management
│   ├── DID Generation
│   ├── Ed25519 Keypairs
│   └── DID Documents
│
├── Context Management
│   ├── Context Creation
│   ├── Content Addressing (SHA-256)
│   ├── Digital Signatures
│   └── Verification
│
├── Chain Management
│   ├── Context Chains (blockchain-style)
│   ├── DAG Structure
│   └── Integrity Verification
│
├── Access Control
│   ├── Capability Tokens
│   ├── Time-limited Access
│   └── Permission Verification
│
└── Storage Backends
    ├── Local (JSON files)
    ├── IPFS (content-addressed)
    ├── Arweave (permanent)
    └── Federated (server networks)
```

### Data Model

#### DID Document
```json
{
  "did": "did:psinet:a1b2c3d4e5f6",
  "public_key": "base64-encoded-public-key",
  "created": "2025-11-07T12:00:00Z",
  "updated": "2025-11-07T12:00:00Z",
  "service_endpoints": [],
  "verification_methods": [
    {
      "id": "did:psinet:a1b2c3d4e5f6#keys-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:psinet:a1b2c3d4e5f6",
      "publicKeyBase64": "..."
    }
  ]
}
```

#### Context Unit
```json
{
  "id": "content-hash-sha256",
  "type": "conversation",
  "content": {
    "messages": [...]
  },
  "owner": "did:psinet:a1b2c3d4e5f6",
  "previous": "previous-context-id",
  "timestamp": "2025-11-07T12:00:00Z",
  "signature": "base64-signature",
  "metadata": {},
  "storage_refs": {
    "ipfs": "QmXxx...",
    "arweave": "txid-xxx"
  }
}
```

#### Access Token
```json
{
  "capability": "read",
  "granted_to": "did:psinet:xyz",
  "granted_by": "did:psinet:abc",
  "expires": "2025-11-08T12:00:00Z",
  "context_id": "context-hash",
  "signature": "base64-signature"
}
```

## 🔐 Security

### Cryptography

- **Identity**: Ed25519 for digital signatures (fast, secure, 256-bit)
- **Content Addressing**: SHA-256 for content hashing
- **Signatures**: All contexts signed with private key
- **Verification**: Public key verification for all data
- **Encryption**: AES-256-GCM for sensitive data (optional)

### Threat Model

**Protected Against:**
- Tampering (content hashing + signatures)
- Forgery (Ed25519 signatures)
- Replay attacks (timestamps + nonces)
- Unauthorized access (capability tokens)

**Not Protected Against:**
- Side-channel attacks (requires hardware security)
- Quantum computers (Ed25519 is vulnerable; use post-quantum crypto)
- Social engineering
- Key compromise (use hardware wallets)

### Best Practices

1. **Key Management**
   - Store private keys encrypted
   - Use hardware wallets for production
   - Rotate keys periodically
   - Back up keys securely

2. **Access Control**
   - Use shortest expiration times possible
   - Principle of least privilege
   - Audit access tokens regularly
   - Revoke compromised tokens

3. **Data Storage**
   - Encrypt sensitive contexts
   - Use multiple storage backends
   - Verify data integrity regularly
   - Back up important contexts

## 🌐 Storage Backends

### Local Storage

Default storage in `.psinet/` directory:
```
.psinet/
├── contexts/       # Individual context JSON files
├── chains/         # Chain definitions
├── dids/           # DID documents
└── keys/           # Private keys (chmod 600)
```

### IPFS Integration

Publish contexts to IPFS for P2P distribution:

```python
# Start IPFS daemon first
# $ ipfs daemon

# Publish context
cid = node.publish_to_ipfs(context)
print(f"IPFS CID: {cid}")

# Retrieve from IPFS
# $ ipfs cat {cid}
```

### Arweave Integration

Permanent storage on Arweave blockchain:

```python
# Configure Arweave wallet
# Set wallet path in code

# Publish (requires AR tokens)
txid = node.publish_to_arweave(context)
print(f"Arweave TX: {txid}")
```

### Federated Nodes

Share contexts across trusted nodes:

```python
# Coming soon: P2P networking with libp2p
# - Gossip protocols
# - DHT for discovery
# - CRDT sync
```

## 🔍 Query API

### Filter by Type

```python
# Get all conversations
conversations = node.query_contexts(
    context_type=ContextType.CONVERSATION
)

# Get all memories
memories = node.query_contexts(
    context_type=ContextType.MEMORY
)
```

### Filter by Owner

```python
# Get contexts owned by a specific DID
contexts = node.query_contexts(
    owner="did:psinet:abc123"
)
```

### Filter by Time

```python
from datetime import datetime, timedelta

# Get contexts from last 24 hours
yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat() + "Z"
recent = node.query_contexts(after=yesterday)
```

### Combine Filters

```python
# Get recent conversations from a specific owner
contexts = node.query_contexts(
    context_type=ContextType.CONVERSATION,
    owner=my_did,
    after=yesterday,
    limit=10
)
```

## 🛠️ Advanced Usage

### Creating Context Chains

```python
# Create related contexts
context1 = node.create_context(...)
context2 = node.create_context(..., previous=context1.id)
context3 = node.create_context(..., previous=context2.id)

# Create a chain
chain = node.create_chain([context1.id, context2.id, context3.id])

# Verify chain integrity
is_valid = node.verify_chain(chain.chain_id)
```

### Access Control

```python
# Grant read access for 24 hours
token = node.grant_access(
    capability=AccessCapability.READ,
    granted_to_did="did:psinet:other-agent",
    context_id=context.id,
    expires_in_hours=24
)

# Check access
has_access = node.check_access(
    token,
    AccessCapability.READ,
    context.id
)
```

### Import/Export

```python
# Export context
node.export_context(context.id, "backup.json")

# Import context
imported = node.import_context("backup.json")
```

### Statistics

```python
stats = node.get_stats()
print(f"DIDs: {stats['did']}")
print(f"Contexts: {stats['contexts_count']}")
print(f"Chains: {stats['chains_count']}")
```

## 🧪 Testing

Run tests (coming soon):

```bash
pytest tests/
```

## 📦 Project Structure

```
PsiNet/
├── src/
│   ├── python/           # Python implementation
│   │   └── psinet_core.py
│   └── nim/              # Nim implementation (coming soon)
│       └── psinet.nim
│
├── examples/
│   ├── demo.py           # Full feature demo
│   ├── ai_integration.py # AI agent integration
│   └── p2p_sync.py       # P2P synchronization
│
├── docs/
│   ├── README.md         # This file
│   ├── API.md            # API documentation
│   └── PROTOCOL.md       # Protocol specification
│
├── tests/
│   └── test_core.py      # Unit tests
│
├── requirements.txt      # Python dependencies
├── setup.sh              # Installation script
└── README.md             # Project overview
```

## 🚧 Roadmap

### Phase 1: Core Protocol ✅
- [x] DID generation
- [x] Context creation and signing
- [x] Chain verification
- [x] Access control
- [x] Local storage
- [x] Query API

### Phase 2: Storage Backends 🔄
- [x] IPFS integration (basic)
- [ ] Arweave integration (complete)
- [ ] Federated node protocol
- [ ] Cloud storage adapters

### Phase 3: P2P Networking 📋
- [ ] libp2p integration
- [ ] Gossip protocol
- [ ] DHT for peer discovery
- [ ] CRDT sync algorithm

### Phase 4: Advanced Features 📋
- [ ] Zero-knowledge proofs (full implementation)
- [ ] Encrypted contexts (AES-256-GCM)
- [ ] Smart contracts (on-chain verification)
- [ ] Vector embeddings storage
- [ ] Semantic search

### Phase 5: Integrations 📋
- [ ] Claude API integration
- [ ] OpenAI API integration
- [ ] LangChain integration
- [ ] Browser extension
- [ ] Desktop application

## 🤝 Contributing

Contributions welcome! Please see CONTRIBUTING.md (coming soon).

## 📄 License

MIT License - see LICENSE file

## 🔗 Resources

- [DID Core Specification](https://www.w3.org/TR/did-core/)
- [Ed25519 Signature Scheme](https://ed25519.cr.yp.to/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Arweave Documentation](https://docs.arweave.org/)
- [Content Addressing](https://proto.school/content-addressing)

## 💬 Support

- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share ideas
- Discord: Join the community (coming soon)

---

**Built with 💜 for the decentralized AI future**
