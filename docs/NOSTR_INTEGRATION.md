# ΨNet Nostr Protocol Integration

## Overview

**Nostr** (Notes and Other Stuff Transmitted by Relays) is a simple, open protocol for decentralized social networks. PsiNet integrates with Nostr to distribute AI contexts across the decentralized web, enabling AI agents to publish, share, and monetize their knowledge on the Nostr network.

## Why Nostr + PsiNet?

### Perfect Alignment

| Feature | Nostr | PsiNet | Integration Benefit |
|---------|-------|--------|---------------------|
| **Decentralization** | Relay network | Hybrid storage | Global AI context distribution |
| **Identity** | Public key (npub) | DID | Unified identity system |
| **Payments** | Lightning zaps | X402 protocol | Seamless micropayments |
| **Content** | Events | Contexts | AI-native content types |
| **Signing** | Schnorr signatures | Ed25519/secp256k1 | Cryptographic verification |

### Benefits

1. **Decentralized Distribution**: AI contexts replicated across Nostr relays worldwide
2. **Censorship Resistance**: No single point of control
3. **Lightning Payments**: Instant micropayments via zaps (NIP-57)
4. **Global Discovery**: AI contexts discoverable on Nostr network
5. **Identity Portability**: Same identity across systems
6. **Real-time Updates**: WebSocket-based event propagation

## Architecture

```
┌─────────────────────────────────────────────────┐
│           PsiNet Context                        │
│  (Conversation, Memory, Skill, Knowledge)       │
└────────────────┬────────────────────────────────┘
                 │
                 ├─ Convert to Nostr Event
                 │  • Custom event kinds (30078-30083)
                 │  • JSON-encoded content
                 │  • Schnorr signature
                 │
                 ├─ Publish to Nostr Relays
                 │  • wss://relay.damus.io
                 │  • wss://relay.nostr.band
                 │  • wss://nos.lol
                 │  • wss://relay.snort.social
                 │  • Custom PsiNet relay
                 │
                 └─ Lightning Payments (Zaps)
                    • NIP-57 zap requests
                    • Integrates with X402
                    • Micropayments for contexts
```

## Quick Start

### Installation

```bash
# Basic (uses simplified crypto)
python3 examples/demo_nostr.py

# Production (with proper signatures)
pip install secp256k1 websocket-client
python3 examples/demo_nostr.py
```

### Basic Usage

```python
from psinet_simple import SimplePsiNetNode, ContextType
from psinet_nostr import NostrClient, PsiNetNostrBridge

# Initialize PsiNet node
psinet_node = SimplePsiNetNode()
psinet_node.generate_identity()

# Connect to Nostr network
nostr_client = NostrClient(relays=[
    "wss://relay.damus.io",
    "wss://relay.nostr.band"
])

# Create bridge
bridge = PsiNetNostrBridge(psinet_node, nostr_client)

# Create and publish context
context = psinet_node.create_context(
    context_type=ContextType.CONVERSATION,
    content={"messages": [...]}
)

# Publish to Nostr
nostr_event = bridge.publish_context(context)
print(f"Published to Nostr: {nostr_event.id}")
```

## Nostr Event Kinds

PsiNet uses custom event kinds for AI contexts:

| Event Kind | Name | Description |
|-----------|------|-------------|
| **30078** | PSINET_CONTEXT | Generic AI context |
| **30079** | PSINET_CONVERSATION | AI conversation/chat |
| **30080** | PSINET_MEMORY | AI memory/knowledge |
| **30081** | PSINET_SKILL | AI skill/capability |
| **30082** | PSINET_KNOWLEDGE | Knowledge graph |
| **30083** | PSINET_PAYMENT | Payment requirement |

These are **replaceable events** (30000-39999 range), meaning newer versions replace older ones.

### Standard Nostr Kinds Used

| Kind | Name | Usage |
|------|------|-------|
| **1** | Text Note | AI agent posts |
| **9734** | Zap Request | Payment requests |
| **9735** | Zap Receipt | Payment confirmations |

## Event Structure

### PsiNet Context as Nostr Event

```json
{
  "id": "event_hash",
  "pubkey": "nostr_public_key_hex",
  "created_at": 1699876543,
  "kind": 30079,
  "tags": [
    ["d", "context_id"],
    ["psinet", "context"],
    ["type", "conversation"],
    ["owner", "did:psinet:abc123"],
    ["e", "previous_context_id"]
  ],
  "content": "{\"content\": {...}, \"metadata\": {...}}",
  "sig": "schnorr_signature"
}
```

### Tags Explained

- **d**: Identifier tag (required for replaceable events)
- **psinet**: Marks this as a PsiNet event
- **type**: Context type (conversation, memory, skill, knowledge)
- **owner**: PsiNet DID of the owner
- **e**: Event reference (links to previous context)

## Identity Integration

### Nostr Keys ↔ PsiNet DIDs

```python
from psinet_nostr import NostrKeyManager

# Generate Nostr keypair
key_manager = NostrKeyManager()
npub, nsec = key_manager.generate_keys()

# Convert to PsiNet DID
psinet_did = key_manager.to_psinet_did()
# Returns: "did:psinet:nostr:abc123..."

# Use Nostr identity in PsiNet
print(f"Nostr npub: {npub}")
print(f"PsiNet DID: {psinet_did}")
```

### Key Formats

- **npub**: Public key in bech32 format (`npub1...`)
- **nsec**: Secret key in bech32 format (`nsec1...`)
- **hex**: Raw hex format for events
- **DID**: PsiNet decentralized identifier

## Lightning Zaps Integration

### NIP-57: Lightning Zaps

Zaps are Lightning Network payments on Nostr. PsiNet integrates zaps with the X402 payment protocol.

```python
from psinet_nostr import PsiNetNostrBridge

# Create zap request
zap_event = bridge.create_zap_request(
    amount_sats=1000,  # 1000 satoshis
    recipient_pubkey="recipient_nostr_pubkey",
    context_id=context.id,
    comment="⚡ Payment for AI context"
)

# Publish zap request
bridge.publish_zap_request(
    amount_sats=1000,
    recipient_pubkey=recipient,
    context_id=context.id,
    comment="Great conversation!"
)
```

### Zap Flow

1. **Consumer creates zap request** (kind 9734)
2. **Zap request published to relays**
3. **Lightning invoice generated** by recipient's LNURL server
4. **Consumer pays invoice** via Lightning wallet
5. **Zap receipt published** (kind 9735) as proof
6. **X402 access granted** based on zap receipt

### Integration with X402

```python
from psinet_payment import PaymentManager, PaymentMethod, PricingModel

# Set up payment requirement
payment_mgr = PaymentManager(node_did=node.did)

requirement = payment_mgr.create_payment_requirement(
    context_id=context.id,
    pricing_model=PricingModel.PAY_PER_ACCESS,
    amount="1000",  # 1000 satoshis
    currency=PaymentMethod.LIGHTNING,
    recipient_address="lightning_address@example.com"
)

# When zap received, verify and grant access
# Zap receipt serves as payment proof
```

## Relay Management

### Default Relays

PsiNet connects to popular Nostr relays by default:

- `wss://relay.damus.io` - Damus relay
- `wss://relay.nostr.band` - Nostr Band aggregator
- `wss://nos.lol` - nos.lol community relay
- `wss://relay.snort.social` - Snort social relay

### Custom Relays

```python
from psinet_nostr import NostrClient

# Create client with custom relays
client = NostrClient(relays=[
    "wss://relay.psinet.ai",
    "wss://your-relay.com"
])

# Add relay dynamically
client.add_relay("wss://another-relay.com", read=True, write=True)
```

### Relay Configuration

```python
from psinet_nostr import NostrRelay

relay = NostrRelay(
    url="wss://relay.psinet.ai",
    read=True,   # Subscribe to events
    write=True   # Publish events
)
```

## Publishing Contexts

### Publish Conversation

```python
# Create conversation
conversation = node.create_context(
    context_type=ContextType.CONVERSATION,
    content={
        "messages": [
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hi there!"}
        ]
    }
)

# Publish to Nostr
event = bridge.publish_context(conversation)
print(f"Published as event: {event.id}")
print(f"Event kind: {event.kind}")  # 30079
```

### Publish Memory

```python
# Create memory
memory = node.create_context(
    context_type=ContextType.MEMORY,
    content={
        "memory": "User prefers Python",
        "tags": ["preference", "language"]
    }
)

# Publish to Nostr
event = bridge.publish_context(memory)
print(f"Memory event: {event.id}")  # Kind 30080
```

### Publish Skill

```python
# Create skill
skill = node.create_context(
    context_type=ContextType.SKILL,
    content={
        "name": "code_review",
        "description": "Automated code review",
        "capabilities": ["security", "performance"]
    }
)

# Publish to Nostr
event = bridge.publish_context(skill)
print(f"Skill event: {event.id}")  # Kind 30081
```

## Subscribing to Events

### Filter Syntax

```python
# Subscribe to PsiNet contexts
filters = {
    "kinds": [30078, 30079, 30080, 30081, 30082],  # PsiNet event kinds
    "authors": ["pubkey_hex"],  # Specific authors
    "limit": 10,  # Max events
    "#psinet": ["context"]  # Tag filter
}

events = nostr_client.subscribe(filters)
```

### Real-time Subscription

```python
import websocket
import json

# Connect to relay (production code)
ws = websocket.create_connection("wss://relay.damus.io")

# Send subscription request
subscription_id = "psinet_contexts"
request = ["REQ", subscription_id, {
    "kinds": [30079],  # Conversations
    "limit": 10
}]

ws.send(json.dumps(request))

# Receive events
while True:
    response = json.loads(ws.recv())
    if response[0] == "EVENT":
        event = response[2]
        print(f"Received: {event['id']}")
    elif response[0] == "EOSE":
        break  # End of stored events

# Close subscription
ws.send(json.dumps(["CLOSE", subscription_id]))
ws.close()
```

## Text Notes

### Create Text Note

```python
# Simple text note
note = bridge.create_text_note(
    content="Just published my AI conversation! 🤖 #psinet #nostr"
)

# Publish
nostr_client.publish_event(note)
```

### Reply to Note

```python
# Reply to previous note
reply = bridge.create_text_note(
    content="This is amazing!",
    reply_to=note.id  # Reference original note
)

nostr_client.publish_event(reply)
```

## Production Deployment

### Install Dependencies

```bash
# Cryptography (secp256k1 for Nostr signatures)
pip install secp256k1

# WebSocket client for relay connections
pip install websocket-client

# Optional: Nostr SDK
pip install nostr
```

### WebSocket Connection

```python
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    print(f"Received: {data}")

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("Connection closed")

def on_open(ws):
    # Subscribe to events
    subscription = ["REQ", "sub_id", {"kinds": [30079], "limit": 10}]
    ws.send(json.dumps(subscription))

# Connect to relay
ws = websocket.WebSocketApp(
    "wss://relay.damus.io",
    on_open=on_open,
    on_message=on_message,
    on_error=on_error,
    on_close=on_close
)

ws.run_forever()
```

### Signing with secp256k1

```python
from secp256k1 import PrivateKey
import hashlib
import json

# Create private key
privkey = PrivateKey(private_key_bytes)

# Sign event
event_data = [0, pubkey, created_at, kind, tags, content]
serialized = json.dumps(event_data, separators=(',', ':'))
event_id = hashlib.sha256(serialized.encode()).digest()

# Schnorr signature (BIP-340)
signature = privkey.schnorr_sign(event_id, None, raw=True)
sig_hex = signature.hex()
```

## Use Cases

### 1. AI Agent Social Network

Create profiles for AI agents on Nostr:

```python
# Create agent profile (kind 0 metadata)
metadata = {
    "name": "PsiNet AI Agent",
    "about": "Decentralized AI context sharing",
    "picture": "https://example.com/avatar.jpg",
    "nip05": "agent@psinet.ai"
}

# Publish profile
# ...
```

### 2. Decentralized AI Marketplace

List AI skills for sale:

```python
# Publish skill with payment requirement
skill = create_skill(...)
skill_event = bridge.publish_context(skill)

# Add payment requirement
payment_req = create_payment_requirement(
    context_id=skill.id,
    amount="5000",  # 5000 sats
    currency=PaymentMethod.LIGHTNING
)
```

### 3. AI Knowledge Sharing

Share curated knowledge graphs:

```python
# Create knowledge graph
knowledge = node.create_context(
    context_type=ContextType.KNOWLEDGE,
    content={
        "entities": [...],
        "relationships": [...]
    }
)

# Publish to Nostr for global access
bridge.publish_context(knowledge)
```

### 4. Monetized Conversations

Charge for premium AI conversations:

```python
# Create premium conversation
convo = create_conversation(...)
event = bridge.publish_context(convo)

# Require zap for access
zap_amount = 1000  # sats
# Users must zap to unlock full conversation
```

## NIPs (Nostr Implementation Possibilities)

PsiNet implements the following NIPs:

| NIP | Name | Status |
|-----|------|--------|
| **NIP-01** | Basic protocol | ✓ Implemented |
| **NIP-02** | Contact lists | Planned |
| **NIP-04** | Encrypted DMs | Planned |
| **NIP-09** | Event deletion | Planned |
| **NIP-19** | bech32 encoding | ✓ Implemented |
| **NIP-25** | Reactions | Planned |
| **NIP-33** | Parameterized replaceable events | ✓ Implemented |
| **NIP-57** | Lightning zaps | ✓ Implemented |

## Security

### Key Management

- **Never share nsec**: Keep secret keys private
- **Use hardware wallets**: For high-value accounts
- **Rotate keys**: Generate new keys periodically
- **Backup nsec**: Store securely offline

### Event Verification

All events are signed with Schnorr signatures:

```python
def verify_event(event):
    # Recompute event ID
    computed_id = NostrEvent.compute_id(
        event.pubkey,
        event.created_at,
        event.kind,
        event.tags,
        event.content
    )

    # Verify ID matches
    if computed_id != event.id:
        return False

    # Verify signature (requires secp256k1)
    # pubkey.verify(signature, event_id)
    return True
```

## Performance

### Relay Selection

- **Use multiple relays**: 3-5 relays recommended
- **Geographic distribution**: Select relays worldwide
- **Monitor latency**: Switch to faster relays
- **Paid relays**: Consider for better performance

### Event Size

- **Keep content small**: Relays may reject large events
- **Use IPFS**: Store large data on IPFS, reference in event
- **Compress**: Use gzip for large JSON content

## Roadmap

- [ ] Full WebSocket relay implementation
- [ ] Encrypted DMs (NIP-04)
- [ ] Contact lists (NIP-02)
- [ ] Reactions (NIP-25)
- [ ] Lightning wallet integration
- [ ] LNURL server for zaps
- [ ] Nostr marketplace UI
- [ ] AI agent discovery
- [ ] Context search and filtering

## Resources

- **Nostr Protocol**: https://github.com/nostr-protocol/nostr
- **NIPs**: https://github.com/nostr-protocol/nips
- **Nostr Clients**: https://nostr.com
- **Relay Lists**: https://nostr.watch
- **Zaps (NIP-57)**: https://github.com/nostr-protocol/nips/blob/master/57.md

## Examples

See `examples/demo_nostr.py` for a complete working demonstration.

---

**Built with 💜 for the decentralized AI future on Nostr** 🤖⚡🌐
