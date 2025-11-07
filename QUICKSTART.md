# ΨNet Quick Start Guide

## 🏃 Run It in 3 Minutes

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./setup.sh

# Run the demo
python3 examples/demo.py
```

### Option 2: Manual Setup

```bash
# Install dependencies
pip3 install cryptography requests

# Run the demo
python3 examples/demo.py
```

That's it! The demo will:
- ✅ Create your decentralized identity (DID)
- ✅ Generate cryptographic keys
- ✅ Create and sign AI contexts
- ✅ Verify blockchain-style chains
- ✅ Demonstrate access control
- ✅ Save everything to `.psinet/` directory

## 📝 Your First Context

```python
from src.python.psinet_core import PsiNetNode, ContextType

# 1. Create a node
node = PsiNetNode()

# 2. Generate identity
did = node.generate_identity()
print(f"Your DID: {did.did}")

# 3. Create a context
context = node.create_context(
    context_type=ContextType.CONVERSATION,
    content={
        "messages": [
            {"role": "user", "content": "What is PsiNet?"},
            {"role": "assistant", "content": "A decentralized AI context protocol!"}
        ]
    }
)

print(f"Context created: {context.id}")
print(f"Signed: {context.signature is not None}")
```

## 🔍 Explore What Was Created

After running the demo, check out:

```bash
# View your DID
cat .psinet/dids/*.json

# View contexts
ls -la .psinet/contexts/

# View a specific context
cat .psinet/contexts/*.json | head -n 20

# View the exported context
cat exported_context.json
```

## 🌐 Next Steps

### 1. Integrate with AI

```python
# Save Claude conversation to PsiNet
conversation_context = node.create_context(
    context_type=ContextType.CONVERSATION,
    content={"messages": claude_messages}
)
```

### 2. Create Memories

```python
# Store user preferences
memory = node.create_context(
    context_type=ContextType.MEMORY,
    content={
        "memory": "User prefers concise answers",
        "tags": ["preference", "style"]
    }
)
```

### 3. Share with IPFS

```bash
# Start IPFS
ipfs daemon &

# In Python:
cid = node.publish_to_ipfs(context)
print(f"Shared: ipfs://{cid}")
```

### 4. Grant Access

```python
# Give another AI agent read access
from src.python.psinet_core import AccessCapability

token = node.grant_access(
    capability=AccessCapability.READ,
    granted_to_did="did:psinet:other-agent",
    context_id=context.id,
    expires_in_hours=24
)
```

## 🐛 Troubleshooting

### "cryptography not found"
```bash
pip3 install cryptography
```

### "Permission denied: ./setup.sh"
```bash
chmod +x setup.sh
./setup.sh
```

### "No module named 'psinet_core'"
```bash
# Make sure you're in the project root
pwd  # Should show: .../PsiNet

# Run with full path
python3 examples/demo.py
```

## 📚 Learn More

- **Full Documentation**: [docs/README.md](docs/README.md)
- **API Reference**: [docs/API.md](docs/API.md) (coming soon)
- **Protocol Spec**: [docs/PROTOCOL.md](docs/PROTOCOL.md) (coming soon)

## 💡 Examples

Check out `examples/` for more:
- `demo.py` - Full feature demonstration
- `demo_simple.py` - Simple demo (no dependencies)
- `demo_payment.py` - X402 payment protocol demo
- `demo_nostr.py` - Nostr integration demo

### Run Payment Demo

```bash
python3 examples/demo_payment.py
```

This demonstrates:
- Creating paid contexts with cryptocurrency
- HTTP 402 "Payment Required" responses
- Payment verification on blockchain
- Payment channels for micropayments
- Multiple currencies (Bitcoin, Ethereum, Lightning)

### Run Nostr Demo

```bash
python3 examples/demo_nostr.py
```

This demonstrates:
- Publishing AI contexts to Nostr relays
- Nostr key generation (npub/nsec)
- Converting Nostr keys to PsiNet DIDs
- Lightning zaps for micropayments (NIP-57)
- Text notes and event publishing
- Decentralized AI context distribution

---

**Need help?** Open an issue on GitHub
