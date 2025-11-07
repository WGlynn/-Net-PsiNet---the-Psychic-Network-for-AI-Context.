# ΨNet X402 Payment Protocol

## Overview

The **X402 Payment Protocol** extends PsiNet with cryptocurrency payment support, enabling AI agents to monetize their contexts and knowledge. Based on the HTTP 402 "Payment Required" status code, it provides a decentralized payment infrastructure for AI services.

## Features

- **Multiple Cryptocurrencies**: Bitcoin, Ethereum, Lightning Network, Arweave, Filecoin
- **Flexible Pricing Models**: Pay-per-access, pay-per-query, subscriptions, auctions
- **Payment Channels**: Lightning-style micropayment channels for efficient small transactions
- **Payment Verification**: Blockchain-based verification of all payments
- **Access Control**: Automatic enforcement of payment requirements
- **Payment Receipts**: Cryptographic proofs of payment
- **Invoice Generation**: QR code-compatible payment invoices

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────┐
│           PsiNet Context (AI Data)              │
├─────────────────────────────────────────────────┤
│         Payment Requirement (X402)              │
│  • Pricing model                                │
│  • Amount & currency                            │
│  • Recipient address                            │
│  • Expiration                                   │
└────────────────┬────────────────────────────────┘
                 │
                 ├─── Payment Receipt
                 │    • Transaction hash
                 │    • Blockchain verification
                 │    • Payer DID
                 │
                 ├─── Payment Channel
                 │    • Micropayments
                 │    • Lightning Network style
                 │    • Automatic deduction
                 │
                 └─── Access Control
                      • HTTP 402 responses
                      • Payment enforcement
                      • Token verification
```

## Payment Flow

### 1. Create Paid Context

```python
from psinet_payment import PaymentManager, PaymentMethod, PricingModel

# Initialize payment manager
payment_manager = PaymentManager(
    node_did=provider_node.did,
    storage_dir=".psinet/payments"
)

# Configure wallet
payment_manager.wallet_addresses["bitcoin"] = "bc1q..."

# Create context with payment requirement
context = provider_node.create_context(
    context_type=ContextType.CONVERSATION,
    content={"messages": [...]}
)

# Add payment requirement
requirement = payment_manager.create_payment_requirement(
    context_id=context.id,
    pricing_model=PricingModel.PAY_PER_ACCESS,
    amount="0.001",  # 0.001 BTC
    currency=PaymentMethod.BITCOIN,
    recipient_address=payment_manager.wallet_addresses["bitcoin"],
    expires_in_hours=24
)
```

### 2. Check Access (Returns HTTP 402)

```python
# Consumer attempts access
response = payment_manager.check_payment_for_context(
    context_id=context.id,
    requester_did=consumer_did
)

if response:
    # HTTP 402 - Payment Required
    print(f"Status: {response.status_code}")
    print(f"Amount: {response.payment_requirement.amount}")
    print(f"Currency: {response.payment_requirement.currency}")
    print(f"Pay to: {response.payment_requirement.recipient_address}")
else:
    # Access granted
    print("Access granted - context available")
```

### 3. Make Payment

```python
# Consumer sends payment via blockchain
# (Using Bitcoin, Ethereum, Lightning, etc.)

# Bitcoin example
tx_hash = send_bitcoin_payment(
    to_address=requirement.recipient_address,
    amount=requirement.amount
)

# Create receipt
receipt = payment_manager.create_payment_receipt(
    payment_requirement=requirement,
    payer_did=consumer_did,
    transaction_hash=tx_hash,
    context_id=context.id
)
```

### 4. Verify Payment

```python
# Verify on blockchain
verified = payment_manager.verify_payment(receipt)

if verified:
    print(f"Payment confirmed: {receipt.receipt_id}")
    # Access automatically granted for future requests
else:
    print("Payment verification failed")
```

### 5. Access Granted

```python
# Try access again
response = payment_manager.check_payment_for_context(
    context_id=context.id,
    requester_did=consumer_did
)

if response is None:
    # Access granted!
    data = context.content
```

## Pricing Models

### Pay-Per-Access

One-time payment for permanent access to a context.

```python
requirement = payment_manager.create_payment_requirement(
    context_id=context.id,
    pricing_model=PricingModel.PAY_PER_ACCESS,
    amount="0.001",
    currency=PaymentMethod.BITCOIN,
    recipient_address=btc_address
)
```

**Use cases:**
- Premium AI conversations
- Exclusive knowledge bases
- Trained model weights
- Specialized skills

### Pay-Per-Query

Payment required for each query/access.

```python
requirement = payment_manager.create_payment_requirement(
    context_id=context.id,
    pricing_model=PricingModel.PAY_PER_QUERY,
    amount="0.0001",
    currency=PaymentMethod.ETHEREUM,
    recipient_address=eth_address
)
```

**Use cases:**
- API endpoints
- Real-time AI inference
- Database queries
- Computation services

### Subscription

Time-based access (monthly, yearly).

```python
requirement = payment_manager.create_payment_requirement(
    context_id=context.id,
    pricing_model=PricingModel.SUBSCRIPTION,
    amount="0.01",
    currency=PaymentMethod.BITCOIN,
    recipient_address=btc_address,
    expires_in_hours=720  # 30 days
)
```

**Use cases:**
- Premium AI assistants
- Continuous access to knowledge
- SaaS-style AI services

### Pay-Per-Token

Payment based on AI token usage.

```python
requirement = payment_manager.create_payment_requirement(
    context_id=context.id,
    pricing_model=PricingModel.PAY_PER_TOKEN,
    amount="0.00001",  # Per 1K tokens
    currency=PaymentMethod.LIGHTNING,
    recipient_address=lightning_address
)
```

**Use cases:**
- LLM inference
- Token-based AI services
- Metered usage

## Payment Channels

Lightning-style payment channels enable efficient micropayments without blockchain overhead for each transaction.

### Open Channel

```python
channel = payment_manager.open_payment_channel(
    payer_did=consumer_did,
    total_capacity="0.01",  # 0.01 BTC
    currency=PaymentMethod.BITCOIN,
    expires_in_days=30
)

print(f"Channel opened: {channel.channel_id}")
print(f"Capacity: {channel.total_capacity} BTC")
```

### Use Channel

```python
# Access multiple contexts
# Payments automatically deducted from channel balance

for context_id in contexts:
    response = payment_manager.check_payment_for_context(
        context_id,
        consumer_did
    )

    if response is None:
        # Access granted, payment deducted from channel
        print(f"Accessed via channel")
```

### Close Channel

```python
payment_manager.close_payment_channel(channel.channel_id)
print(f"Remaining balance: {channel.current_balance}")
```

**Benefits:**
- No blockchain fees for each transaction
- Instant payments
- Efficient for micropayments
- Automatic balance management

## Payment Methods

### Bitcoin

```python
requirement = payment_manager.create_payment_requirement(
    pricing_model=PricingModel.PAY_PER_ACCESS,
    amount="0.001",
    currency=PaymentMethod.BITCOIN,
    recipient_address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
)
```

**Integration:**
- Use Bitcoin Core RPC
- Or blockchain.info API
- Or BTCPay Server

### Ethereum

```python
requirement = payment_manager.create_payment_requirement(
    pricing_model=PricingModel.PAY_PER_ACCESS,
    amount="0.01",
    currency=PaymentMethod.ETHEREUM,
    recipient_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
)
```

**Integration:**
- Use Web3.py
- Infura/Alchemy API
- MetaMask integration

### Lightning Network

```python
requirement = payment_manager.create_payment_requirement(
    pricing_model=PricingModel.PAY_PER_QUERY,
    amount="1000",  # Satoshis
    currency=PaymentMethod.LIGHTNING,
    recipient_address="lnbc10n1pjhxj3..."
)
```

**Integration:**
- Use LND (Lightning Network Daemon)
- Or c-lightning
- Or Eclair

### Arweave

```python
requirement = payment_manager.create_payment_requirement(
    pricing_model=PricingModel.PAY_PER_ACCESS,
    amount="0.5",  # AR tokens
    currency=PaymentMethod.ARWEAVE_AR,
    recipient_address="arweave_wallet_address"
)
```

**Use case:** Permanent storage payments

### Filecoin

```python
requirement = payment_manager.create_payment_requirement(
    pricing_model=PricingModel.PAY_PER_ACCESS,
    amount="1.0",  # FIL
    currency=PaymentMethod.IPFS_FILECOIN,
    recipient_address="filecoin_wallet_address"
)
```

**Use case:** IPFS storage payments

## Payment Verification

### Bitcoin Verification

```python
verified = PaymentVerifier.verify_bitcoin_payment(
    tx_hash="a1b2c3...",
    expected_amount="0.001",
    recipient_address="bc1q..."
)
```

**Implementation:**
```python
import requests

def verify_bitcoin_payment(tx_hash, expected_amount, recipient_address):
    # Query blockchain.info API
    response = requests.get(
        f"https://blockchain.info/rawtx/{tx_hash}"
    )

    tx_data = response.json()

    # Check outputs
    for output in tx_data['out']:
        if output['addr'] == recipient_address:
            amount_btc = output['value'] / 100000000
            if amount_btc >= float(expected_amount):
                return True

    return False
```

### Ethereum Verification

```python
from web3 import Web3

def verify_ethereum_payment(tx_hash, expected_amount, recipient_address):
    w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_KEY'))

    tx = w3.eth.get_transaction(tx_hash)
    receipt = w3.eth.get_transaction_receipt(tx_hash)

    # Check confirmations
    if receipt['status'] != 1:
        return False

    # Check recipient and amount
    if tx['to'].lower() == recipient_address.lower():
        amount_eth = w3.fromWei(tx['value'], 'ether')
        if amount_eth >= float(expected_amount):
            return True

    return False
```

## Payment Invoices

### Generate Invoice

```python
invoice = payment_manager.generate_payment_invoice(
    context_id=context.id,
    amount="0.001",
    currency=PaymentMethod.BITCOIN,
    description="Premium AI conversation"
)

print(f"Invoice ID: {invoice['invoice_id']}")
print(f"Payment URI: {invoice['qr_code_data']}")
```

### Invoice Structure

```json
{
  "invoice_id": "7f3a9b2c...",
  "context_id": "9f6944a5...",
  "amount": "0.001",
  "currency": "bitcoin",
  "recipient_address": "bc1q...",
  "recipient_did": "did:psinet:abc123",
  "description": "Premium AI conversation",
  "created": "2025-11-07T12:00:00Z",
  "qr_code_data": "bitcoin:bc1q...?amount=0.001"
}
```

### QR Code Generation

```python
import qrcode

qr = qrcode.QRCode(version=1, box_size=10, border=5)
qr.add_data(invoice['qr_code_data'])
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("payment_invoice.png")
```

## Payment Statistics

```python
stats = payment_manager.get_pricing_stats()

print(f"Total receipts: {stats['total_receipts']}")
print(f"Confirmed payments: {stats['confirmed_payments']}")
print(f"Total revenue: {stats['total_revenue']}")
print(f"Open channels: {stats['open_channels']}")
```

## Security Considerations

### 1. Payment Verification

- Always verify payments on blockchain
- Check confirmation depth (6+ for Bitcoin)
- Validate transaction details
- Store transaction hashes

### 2. Wallet Security

- Use hardware wallets for large amounts
- Rotate addresses regularly
- Keep private keys encrypted
- Use multi-sig for high-value accounts

### 3. Double-Spend Prevention

- Wait for confirmations
- Use payment channels for instant payments
- Monitor blockchain for conflicts

### 4. Access Control

- Verify DIDs before granting access
- Check payment receipt signatures
- Enforce expiration times
- Rate limit requests

## Production Integration

### Bitcoin RPC

```python
from bitcoinrpc.authproxy import AuthServiceProxy

rpc = AuthServiceProxy("http://user:pass@localhost:8332")

def verify_bitcoin_tx(tx_hash):
    tx = rpc.getrawtransaction(tx_hash, True)
    confirmations = tx.get('confirmations', 0)
    return confirmations >= 6  # 6 confirmations for security
```

### Ethereum Web3

```python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_KEY'))

def verify_ethereum_tx(tx_hash):
    receipt = w3.eth.get_transaction_receipt(tx_hash)
    current_block = w3.eth.block_number
    tx_block = receipt['blockNumber']
    confirmations = current_block - tx_block
    return confirmations >= 12  # 12 confirmations for security
```

### Lightning Network (LND)

```python
import codecs
import grpc
import lnd_grpc

# Connect to LND
cert = open('/path/to/tls.cert', 'rb').read()
macaroon = codecs.encode(open('/path/to/admin.macaroon', 'rb').read(), 'hex')

credentials = grpc.ssl_channel_credentials(cert)
channel = grpc.secure_channel('localhost:10009', credentials)
stub = lnd_grpc.LightningStub(channel)

# Verify invoice payment
invoice = stub.LookupInvoice(payment_hash=payment_hash)
if invoice.settled:
    print("Payment confirmed")
```

## Use Cases

### 1. Premium AI Conversations

Charge users for access to high-quality AI conversations.

```python
premium_chat = create_paid_context(
    node, payment_manager,
    context_data={"messages": advanced_conversation},
    price="0.01",
    currency=PaymentMethod.ETHEREUM
)
```

### 2. AI Model Marketplace

Sell trained models or fine-tuned weights.

```python
model_context = create_paid_context(
    node, payment_manager,
    context_data={"model_weights": "ipfs://Qm..."},
    price="0.1",
    currency=PaymentMethod.BITCOIN
)
```

### 3. Knowledge Base Access

Monetize curated knowledge and insights.

```python
knowledge_context = create_paid_context(
    node, payment_manager,
    context_data={"knowledge_graph": knowledge_data},
    price="0.005",
    currency=PaymentMethod.ETHEREUM
)
```

### 4. Skill Rental

Rent AI skills and capabilities.

```python
skill_context = create_paid_context(
    node, payment_manager,
    context_data={"skill": "code_analysis", "capabilities": [...]},
    price="0.001",
    currency=PaymentMethod.LIGHTNING
)
```

### 5. Micropayment API

Charge per API call using payment channels.

```python
channel = payment_manager.open_payment_channel(
    payer_did=user_did,
    total_capacity="0.01",
    currency=PaymentMethod.BITCOIN
)

# User makes 100 API calls @ 0.0001 BTC each
# All deducted from channel automatically
```

## Roadmap

- [ ] Smart contract integration (Ethereum)
- [ ] Subscription management system
- [ ] Refund mechanism
- [ ] Dispute resolution
- [ ] Multi-currency atomic swaps
- [ ] Stablecoin support (USDC, DAI)
- [ ] Payment splitting (revenue sharing)
- [ ] Escrow services
- [ ] Payment webhooks
- [ ] Dashboard UI

## Examples

See `examples/demo_payment.py` for a complete working demonstration.

---

**Built with 💜 for the decentralized AI economy**
