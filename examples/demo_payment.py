#!/usr/bin/env python3
"""
ΨNet X402 Payment Protocol Demo
================================

Demonstrates the HTTP 402 "Payment Required" protocol for monetizing
AI context access with cryptocurrency payments.

Features demonstrated:
1. Creating paid contexts
2. Payment requirements and verification
3. Payment channels for micropayments
4. Multiple cryptocurrency support
5. Access control via payments
6. Payment receipts and invoices

Run with: python3 examples/demo_payment.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'python'))

from psinet_simple import SimplePsiNetNode, ContextType
from psinet_payment import (
    PaymentManager,
    PaymentMethod,
    PricingModel,
    X402Response,
    create_paid_context,
    access_paid_context
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
║              ΨNet X402 Payment Protocol Demonstration                ║
║                                                                      ║
║        Monetize AI Context Access with Cryptocurrency                ║
╚══════════════════════════════════════════════════════════════════════╝
    """)

    # ========================================================================
    # STEP 1: Initialize Nodes
    # ========================================================================
    print_header("STEP 1: Initialize PsiNet Nodes")

    print_section("Creating content provider node")
    provider_node = SimplePsiNetNode(storage_dir=".psinet_provider")
    provider_did = provider_node.generate_identity()
    print(f"✓ Provider DID: {provider_did.did}")

    print_section("Creating consumer node")
    consumer_node = SimplePsiNetNode(storage_dir=".psinet_consumer")
    consumer_did = consumer_node.generate_identity()
    print(f"✓ Consumer DID: {consumer_did.did}")

    # ========================================================================
    # STEP 2: Setup Payment Manager
    # ========================================================================
    print_header("STEP 2: Setup Payment Manager")

    print_section("Initializing payment manager for provider")
    payment_manager = PaymentManager(
        node_did=provider_did.did,
        storage_dir=".psinet_provider/payments"
    )

    # Configure wallet addresses
    payment_manager.wallet_addresses = {
        "bitcoin": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "ethereum": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        "lightning": "lnbc10n1pjhxj3..."
    }

    print("✓ Payment manager initialized")
    print(f"  Bitcoin address: {payment_manager.wallet_addresses['bitcoin'][:20]}...")
    print(f"  Ethereum address: {payment_manager.wallet_addresses['ethereum'][:20]}...")

    # ========================================================================
    # STEP 3: Create Free and Paid Contexts
    # ========================================================================
    print_header("STEP 3: Create Free and Paid Contexts")

    print_section("Creating a FREE context")
    free_context = provider_node.create_context(
        context_type=ContextType.CONVERSATION,
        content={
            "messages": [
                {"role": "assistant", "content": "This is a free preview message!"}
            ],
            "preview": True
        }
    )
    print(f"✓ Free context ID: {free_context.id[:16]}...")

    print_section("Creating PAID context (Bitcoin payment)")
    paid_context_btc = provider_node.create_context(
        context_type=ContextType.CONVERSATION,
        content={
            "messages": [
                {"role": "user", "content": "What's the secret to AGI?"},
                {"role": "assistant", "content": "Consciousness emerges from recursive self-modeling..."}
            ],
            "premium": True
        }
    )

    btc_requirement = payment_manager.create_payment_requirement(
        context_id=paid_context_btc.id,
        pricing_model=PricingModel.PAY_PER_ACCESS,
        amount="0.0001",  # 0.0001 BTC
        currency=PaymentMethod.BITCOIN,
        recipient_address=payment_manager.wallet_addresses["bitcoin"],
        description="Premium AI conversation about AGI"
    )

    print(f"✓ Paid context ID: {paid_context_btc.id[:16]}...")
    print(f"✓ Price: {btc_requirement.amount} BTC")
    print(f"✓ Payment address: {btc_requirement.recipient_address[:20]}...")

    print_section("Creating PAID context (Ethereum payment)")
    paid_context_eth = provider_node.create_context(
        context_type=ContextType.SKILL,
        content={
            "name": "advanced_code_analysis",
            "description": "Deep code analysis with security auditing",
            "capabilities": ["ast_analysis", "vulnerability_detection", "optimization"]
        }
    )

    eth_requirement = payment_manager.create_payment_requirement(
        context_id=paid_context_eth.id,
        pricing_model=PricingModel.PAY_PER_QUERY,
        amount="0.01",  # 0.01 ETH
        currency=PaymentMethod.ETHEREUM,
        recipient_address=payment_manager.wallet_addresses["ethereum"],
        description="Advanced code analysis skill"
    )

    print(f"✓ Paid context ID: {paid_context_eth.id[:16]}...")
    print(f"✓ Price: {eth_requirement.amount} ETH per query")

    # ========================================================================
    # STEP 4: Access Control - Payment Required
    # ========================================================================
    print_header("STEP 4: Access Control with Payment Enforcement")

    print_section("Attempting to access FREE context")
    response = payment_manager.check_payment_for_context(
        free_context.id,
        consumer_did.did
    )

    if response is None:
        print("✓ Access GRANTED - No payment required")
        print(f"  Content: {free_context.content['messages'][0]['content']}")
    else:
        print("❌ Access DENIED")

    print_section("Attempting to access PAID context WITHOUT payment")
    response = payment_manager.check_payment_for_context(
        paid_context_btc.id,
        consumer_did.did
    )

    if response is None:
        print("✓ Access GRANTED")
    else:
        print(f"❌ HTTP {response.status_code}: {response.message}")
        print(f"  Payment required: {response.payment_requirement.amount} {response.payment_requirement.currency}")
        print(f"  Pay to: {response.payment_requirement.recipient_address[:20]}...")
        print(f"  Methods accepted: {', '.join(response.payment_methods_accepted)}")

    # ========================================================================
    # STEP 5: Make Payment
    # ========================================================================
    print_header("STEP 5: Make Payment")

    print_section("Simulating Bitcoin payment")
    print("📤 Sending 0.0001 BTC to provider's address...")
    print("   Transaction broadcasting to Bitcoin network...")

    # Simulate transaction hash
    simulated_tx_hash = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
    print(f"✓ Transaction broadcast!")
    print(f"  TX Hash: {simulated_tx_hash[:32]}...")

    print_section("Creating payment receipt")
    receipt = payment_manager.create_payment_receipt(
        payment_requirement=btc_requirement,
        payer_did=consumer_did.did,
        transaction_hash=simulated_tx_hash,
        context_id=paid_context_btc.id
    )

    print(f"✓ Receipt created: {receipt.receipt_id[:16]}...")
    print(f"  Status: {receipt.status}")
    print(f"  Payer: {receipt.payer_did[:20]}...")
    print(f"  Amount: {receipt.amount} {receipt.currency}")

    print_section("Verifying payment on blockchain")
    verified = payment_manager.verify_payment(receipt)

    if verified:
        print("✓ Payment CONFIRMED on blockchain")
        print(f"  Receipt status: {receipt.status}")
    else:
        print("❌ Payment verification FAILED")

    # ========================================================================
    # STEP 6: Access After Payment
    # ========================================================================
    print_header("STEP 6: Access Paid Context After Payment")

    print_section("Attempting to access PAID context WITH payment")
    response = payment_manager.check_payment_for_context(
        paid_context_btc.id,
        consumer_did.did
    )

    if response is None:
        print("✓ Access GRANTED - Payment verified!")
        print(f"  Context type: {paid_context_btc.type}")
        print(f"  Premium content unlocked")
        print(f"  Messages: {len(paid_context_btc.content['messages'])}")
    else:
        print(f"❌ HTTP {response.status_code}: {response.message}")

    # ========================================================================
    # STEP 7: Payment Channels (Micropayments)
    # ========================================================================
    print_header("STEP 7: Payment Channels for Micropayments")

    print_section("Opening Lightning-style payment channel")
    channel = payment_manager.open_payment_channel(
        payer_did=consumer_did.did,
        total_capacity="0.01",  # 0.01 BTC capacity
        currency=PaymentMethod.BITCOIN,
        expires_in_days=30
    )

    print(f"✓ Channel ID: {channel.channel_id[:16]}...")
    print(f"  Capacity: {channel.total_capacity} BTC")
    print(f"  Balance: {channel.current_balance} BTC")
    print(f"  Expires: {channel.expires}")

    print_section("Creating micro-priced contexts")
    micro_contexts = []
    for i in range(3):
        micro_context = provider_node.create_context(
            context_type=ContextType.MEMORY,
            content={
                "memory": f"Insight #{i+1}: Advanced AI technique",
                "tags": ["premium", "ai", "technique"]
            }
        )

        micro_requirement = payment_manager.create_payment_requirement(
            context_id=micro_context.id,
            pricing_model=PricingModel.PAY_PER_ACCESS,
            amount="0.0001",  # Tiny amount for micropayment
            currency=PaymentMethod.BITCOIN,
            recipient_address=payment_manager.wallet_addresses["bitcoin"]
        )

        micro_contexts.append((micro_context, micro_requirement))
        print(f"✓ Micro-context #{i+1}: {micro_context.id[:16]}... (0.0001 BTC)")

    print_section("Accessing contexts via payment channel")
    for i, (context, requirement) in enumerate(micro_contexts):
        response = payment_manager.check_payment_for_context(
            context.id,
            consumer_did.did
        )

        if response is None:
            print(f"✓ Access #{i+1} GRANTED via payment channel")
            print(f"  Remaining balance: {channel.current_balance} BTC")
        else:
            print(f"❌ Access #{i+1} DENIED")

    print_section("Closing payment channel")
    payment_manager.close_payment_channel(channel.channel_id)
    print(f"  Final balance returned: {channel.current_balance} BTC")

    # ========================================================================
    # STEP 8: Payment Invoices
    # ========================================================================
    print_header("STEP 8: Generate Payment Invoice")

    print_section("Creating invoice for Ethereum payment")
    invoice = payment_manager.generate_payment_invoice(
        context_id=paid_context_eth.id,
        amount="0.01",
        currency=PaymentMethod.ETHEREUM,
        description="Advanced code analysis skill access"
    )

    print(f"✓ Invoice ID: {invoice['invoice_id'][:16]}...")
    print(f"  Amount: {invoice['amount']} {invoice['currency']}")
    print(f"  Recipient: {invoice['recipient_address'][:20]}...")
    print(f"  Payment URI: {invoice['qr_code_data'][:40]}...")
    print("  (This can be encoded as QR code for mobile wallets)")

    # ========================================================================
    # STEP 9: Pricing Statistics
    # ========================================================================
    print_header("STEP 9: Payment Statistics")

    stats = payment_manager.get_pricing_stats()

    print(f"""
📊 Payment Manager Statistics:
  • Total receipts: {stats['total_receipts']}
  • Confirmed payments: {stats['confirmed_payments']}
  • Pending payments: {stats['pending_payments']}
  • Open payment channels: {stats['open_channels']}
  • Monetized contexts: {stats['monetized_contexts']}
    """)

    if stats['total_revenue']:
        print("💰 Total Revenue:")
        for currency, amount in stats['total_revenue'].items():
            print(f"  • {amount} {currency}")

    # ========================================================================
    # Summary
    # ========================================================================
    print_header("Summary")

    print(f"""
✓ Demonstrated X402 Payment Protocol features:

Payment System:
  • Created payment requirements (Bitcoin, Ethereum)
  • Enforced access control via HTTP 402 responses
  • Verified payments on blockchain
  • Generated payment receipts

Payment Channels:
  • Opened Lightning-style channel for micropayments
  • Processed multiple small transactions efficiently
  • Automatic balance deduction
  • Channel lifecycle management

Monetization Models:
  • Pay-per-access (one-time payment)
  • Pay-per-query (recurring payments)
  • Micropayments via channels
  • Payment invoices with QR codes

Integration:
  • Works with existing PsiNet DID system
  • Compatible with all context types
  • Blockchain verification ready
  • Multiple cryptocurrency support

Next Steps:
  1. Configure real wallet addresses
  2. Connect to blockchain APIs (Bitcoin, Ethereum)
  3. Integrate Lightning Network (LND)
  4. Add Arweave and Filecoin support
  5. Build payment UI/dashboard
  6. Deploy to production

The X402 protocol enables:
  • AI agents to monetize their knowledge
  • Fair compensation for quality contexts
  • Decentralized AI marketplace
  • Micro-transactions for AI services
    """)

    print("\n" + "=" * 70)
    print("  Demo Complete! 🎉💰")
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
