#!/usr/bin/env python3
"""
ΨNet X402 Payment Protocol Extension
=====================================

Implements HTTP 402 "Payment Required" protocol for monetizing AI context access.

Features:
- Cryptocurrency payment support (Bitcoin, Ethereum, Lightning)
- Pay-per-context and pay-per-query models
- Payment verification and receipts
- Payment channels for micropayments
- Integration with DID-based identity
- Automatic payment enforcement

Author: PsiNet Protocol Team
License: MIT
"""

import json
import time
import hashlib
import base64
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
from decimal import Decimal


class PaymentMethod(Enum):
    """Supported payment methods"""
    BITCOIN = "bitcoin"
    ETHEREUM = "ethereum"
    LIGHTNING = "lightning"
    CUSTOM_TOKEN = "custom_token"
    ARWEAVE_AR = "arweave_ar"
    IPFS_FILECOIN = "ipfs_filecoin"


class PaymentStatus(Enum):
    """Payment status states"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    EXPIRED = "expired"
    REFUNDED = "refunded"


class PricingModel(Enum):
    """Pricing models for context access"""
    FREE = "free"
    PAY_PER_ACCESS = "pay_per_access"
    PAY_PER_QUERY = "pay_per_query"
    SUBSCRIPTION = "subscription"
    PAY_PER_TOKEN = "pay_per_token"  # For AI token usage
    AUCTION = "auction"  # Highest bidder gets access


@dataclass
class PaymentRequirement:
    """Defines payment requirements for accessing a context"""
    pricing_model: str  # PricingModel
    amount: str  # Decimal as string (e.g., "0.001")
    currency: str  # PaymentMethod
    recipient_address: str  # Wallet address
    expires: Optional[str] = None  # ISO timestamp
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict:
        return asdict(self)

    def is_expired(self) -> bool:
        if not self.expires:
            return False
        expires_dt = datetime.fromisoformat(self.expires.replace('Z', ''))
        return datetime.utcnow() > expires_dt


@dataclass
class PaymentReceipt:
    """Payment receipt proving payment was made"""
    receipt_id: str
    payment_requirement_id: str
    payer_did: str
    recipient_did: str
    amount: str
    currency: str
    transaction_hash: str  # Blockchain transaction hash
    status: str  # PaymentStatus
    timestamp: str
    context_id: Optional[str] = None
    signature: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


@dataclass
class PaymentChannel:
    """Lightning-style payment channel for micropayments"""
    channel_id: str
    payer_did: str
    recipient_did: str
    total_capacity: str  # Total amount deposited
    current_balance: str  # Remaining balance
    currency: str
    opened: str
    expires: str
    status: str  # "open", "closed", "disputed"
    signature: Optional[str] = None

    def to_dict(self) -> Dict:
        return asdict(self)

    def has_sufficient_balance(self, amount: str) -> bool:
        return Decimal(self.current_balance) >= Decimal(amount)


@dataclass
class X402Response:
    """HTTP 402 Payment Required response"""
    status_code: int = 402
    message: str = "Payment Required"
    payment_requirement: Optional[PaymentRequirement] = None
    payment_methods_accepted: Optional[List[str]] = None
    payment_endpoint: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "status_code": self.status_code,
            "message": self.message,
            "payment_requirement": self.payment_requirement.to_dict() if self.payment_requirement else None,
            "payment_methods_accepted": self.payment_methods_accepted,
            "payment_endpoint": self.payment_endpoint
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


class PaymentVerifier:
    """Verifies payments on various blockchains"""

    @staticmethod
    def verify_bitcoin_payment(tx_hash: str, expected_amount: str, recipient_address: str) -> bool:
        """
        Verify Bitcoin payment (requires blockchain API)
        In production, use blockchain.info API or run a Bitcoin node
        """
        # Placeholder - would connect to Bitcoin RPC or API
        print(f"🔍 Verifying Bitcoin payment: {tx_hash[:16]}...")
        print(f"   Expected: {expected_amount} BTC to {recipient_address[:16]}...")

        # Simulate verification
        # In production: query blockchain API
        return True  # Placeholder

    @staticmethod
    def verify_ethereum_payment(tx_hash: str, expected_amount: str, recipient_address: str) -> bool:
        """
        Verify Ethereum payment (requires Web3 connection)
        In production, use Web3.py to connect to Ethereum node
        """
        print(f"🔍 Verifying Ethereum payment: {tx_hash[:16]}...")
        print(f"   Expected: {expected_amount} ETH to {recipient_address[:16]}...")

        # Placeholder - would use Web3.py
        return True  # Placeholder

    @staticmethod
    def verify_lightning_payment(payment_hash: str, expected_amount: str) -> bool:
        """
        Verify Lightning Network payment (requires LND connection)
        In production, connect to LND node
        """
        print(f"🔍 Verifying Lightning payment: {payment_hash[:16]}...")
        print(f"   Expected: {expected_amount} satoshis")

        # Placeholder - would connect to LND
        return True  # Placeholder

    @staticmethod
    def verify_arweave_payment(tx_id: str, expected_amount: str) -> bool:
        """Verify Arweave payment"""
        print(f"🔍 Verifying Arweave payment: {tx_id[:16]}...")
        print(f"   Expected: {expected_amount} AR")

        return True  # Placeholder


class PaymentManager:
    """
    Manages payments for PsiNet contexts

    Implements the X402 protocol for monetizing AI context access.
    """

    def __init__(self, node_did: str, storage_dir: str = ".psinet/payments"):
        self.node_did = node_did
        self.storage_dir = storage_dir

        # Storage
        self.payment_requirements: Dict[str, PaymentRequirement] = {}
        self.payment_receipts: Dict[str, PaymentReceipt] = {}
        self.payment_channels: Dict[str, PaymentChannel] = {}

        # Configuration
        self.wallet_addresses: Dict[str, str] = {
            "bitcoin": "",
            "ethereum": "",
            "lightning": ""
        }

    def create_payment_requirement(
        self,
        context_id: str,
        pricing_model: PricingModel,
        amount: str,
        currency: PaymentMethod,
        recipient_address: str,
        expires_in_hours: Optional[int] = 24,
        description: Optional[str] = None
    ) -> PaymentRequirement:
        """Create a payment requirement for a context"""

        expires = None
        if expires_in_hours:
            expires_dt = datetime.utcnow() + timedelta(hours=expires_in_hours)
            expires = expires_dt.isoformat() + "Z"

        requirement = PaymentRequirement(
            pricing_model=pricing_model.value,
            amount=amount,
            currency=currency.value,
            recipient_address=recipient_address,
            expires=expires,
            description=description or f"Payment for context {context_id[:16]}",
            metadata={"context_id": context_id}
        )

        self.payment_requirements[context_id] = requirement
        return requirement

    def create_payment_receipt(
        self,
        payment_requirement: PaymentRequirement,
        payer_did: str,
        transaction_hash: str,
        context_id: Optional[str] = None
    ) -> PaymentReceipt:
        """Create a payment receipt after successful payment"""

        receipt_id = hashlib.sha256(
            f"{payer_did}:{transaction_hash}:{time.time()}".encode()
        ).hexdigest()

        receipt = PaymentReceipt(
            receipt_id=receipt_id,
            payment_requirement_id=id(payment_requirement),
            payer_did=payer_did,
            recipient_did=self.node_did,
            amount=payment_requirement.amount,
            currency=payment_requirement.currency,
            transaction_hash=transaction_hash,
            status=PaymentStatus.PENDING.value,
            timestamp=datetime.utcnow().isoformat() + "Z",
            context_id=context_id
        )

        self.payment_receipts[receipt_id] = receipt
        return receipt

    def verify_payment(self, receipt: PaymentReceipt) -> bool:
        """Verify a payment receipt against blockchain"""

        currency = receipt.currency
        tx_hash = receipt.transaction_hash
        amount = receipt.amount

        # Get payment requirement to check recipient
        requirement = None
        for req in self.payment_requirements.values():
            if req.currency == currency:
                requirement = req
                break

        if not requirement:
            print(f"❌ No payment requirement found for {currency}")
            return False

        # Verify based on currency
        verified = False
        if currency == PaymentMethod.BITCOIN.value:
            verified = PaymentVerifier.verify_bitcoin_payment(
                tx_hash, amount, requirement.recipient_address
            )
        elif currency == PaymentMethod.ETHEREUM.value:
            verified = PaymentVerifier.verify_ethereum_payment(
                tx_hash, amount, requirement.recipient_address
            )
        elif currency == PaymentMethod.LIGHTNING.value:
            verified = PaymentVerifier.verify_lightning_payment(
                tx_hash, amount
            )
        elif currency == PaymentMethod.ARWEAVE_AR.value:
            verified = PaymentVerifier.verify_arweave_payment(
                tx_hash, amount
            )

        # Update receipt status
        if verified:
            receipt.status = PaymentStatus.CONFIRMED.value
            print(f"✓ Payment verified: {receipt.receipt_id[:16]}")
        else:
            receipt.status = PaymentStatus.FAILED.value
            print(f"❌ Payment verification failed: {receipt.receipt_id[:16]}")

        return verified

    def check_payment_for_context(
        self,
        context_id: str,
        requester_did: str
    ) -> Optional[X402Response]:
        """
        Check if payment is required for context access
        Returns X402Response if payment required, None if access granted
        """

        # Check if context has payment requirement
        if context_id not in self.payment_requirements:
            return None  # Free access

        requirement = self.payment_requirements[context_id]

        # Check if payment requirement expired
        if requirement.is_expired():
            return None  # Free access after expiration

        # Check if requester already paid
        for receipt in self.payment_receipts.values():
            if (receipt.context_id == context_id and
                receipt.payer_did == requester_did and
                receipt.status == PaymentStatus.CONFIRMED.value):
                return None  # Already paid

        # Check payment channels
        for channel in self.payment_channels.values():
            if (channel.payer_did == requester_did and
                channel.recipient_did == self.node_did and
                channel.status == "open" and
                channel.has_sufficient_balance(requirement.amount)):
                # Deduct from channel
                channel.current_balance = str(
                    Decimal(channel.current_balance) - Decimal(requirement.amount)
                )
                print(f"✓ Paid via payment channel: {requirement.amount} {requirement.currency}")
                return None  # Access granted

        # Payment required - return 402 response
        return X402Response(
            status_code=402,
            message="Payment Required",
            payment_requirement=requirement,
            payment_methods_accepted=[
                PaymentMethod.BITCOIN.value,
                PaymentMethod.ETHEREUM.value,
                PaymentMethod.LIGHTNING.value
            ],
            payment_endpoint=f"psinet://payments/{self.node_did}"
        )

    def open_payment_channel(
        self,
        payer_did: str,
        total_capacity: str,
        currency: PaymentMethod,
        expires_in_days: int = 30
    ) -> PaymentChannel:
        """Open a Lightning-style payment channel for micropayments"""

        channel_id = hashlib.sha256(
            f"{payer_did}:{self.node_did}:{time.time()}".encode()
        ).hexdigest()

        expires_dt = datetime.utcnow() + timedelta(days=expires_in_days)

        channel = PaymentChannel(
            channel_id=channel_id,
            payer_did=payer_did,
            recipient_did=self.node_did,
            total_capacity=total_capacity,
            current_balance=total_capacity,
            currency=currency.value,
            opened=datetime.utcnow().isoformat() + "Z",
            expires=expires_dt.isoformat() + "Z",
            status="open"
        )

        self.payment_channels[channel_id] = channel
        print(f"✓ Payment channel opened: {channel_id[:16]}")
        print(f"  Capacity: {total_capacity} {currency.value}")

        return channel

    def close_payment_channel(self, channel_id: str):
        """Close a payment channel"""
        if channel_id in self.payment_channels:
            channel = self.payment_channels[channel_id]
            channel.status = "closed"
            print(f"✓ Payment channel closed: {channel_id[:16]}")
            print(f"  Remaining balance: {channel.current_balance}")

    def generate_payment_invoice(
        self,
        context_id: str,
        amount: str,
        currency: PaymentMethod,
        description: str
    ) -> Dict[str, Any]:
        """Generate a payment invoice"""

        invoice_id = hashlib.sha256(
            f"{context_id}:{amount}:{time.time()}".encode()
        ).hexdigest()

        recipient_address = self.wallet_addresses.get(currency.value, "")

        invoice = {
            "invoice_id": invoice_id,
            "context_id": context_id,
            "amount": amount,
            "currency": currency.value,
            "recipient_address": recipient_address,
            "recipient_did": self.node_did,
            "description": description,
            "created": datetime.utcnow().isoformat() + "Z",
            "qr_code_data": self._generate_payment_uri(
                currency, recipient_address, amount
            )
        }

        return invoice

    def _generate_payment_uri(
        self,
        currency: PaymentMethod,
        address: str,
        amount: str
    ) -> str:
        """Generate payment URI for QR codes"""

        if currency == PaymentMethod.BITCOIN:
            return f"bitcoin:{address}?amount={amount}"
        elif currency == PaymentMethod.ETHEREUM:
            return f"ethereum:{address}?value={amount}"
        elif currency == PaymentMethod.LIGHTNING:
            return f"lightning:{address}?amount={amount}"
        else:
            return f"{currency.value}:{address}?amount={amount}"

    def get_pricing_stats(self) -> Dict[str, Any]:
        """Get payment and pricing statistics"""

        total_receipts = len(self.payment_receipts)
        confirmed_payments = sum(
            1 for r in self.payment_receipts.values()
            if r.status == PaymentStatus.CONFIRMED.value
        )

        total_revenue = {}
        for receipt in self.payment_receipts.values():
            if receipt.status == PaymentStatus.CONFIRMED.value:
                currency = receipt.currency
                amount = Decimal(receipt.amount)
                total_revenue[currency] = total_revenue.get(currency, Decimal(0)) + amount

        return {
            "total_receipts": total_receipts,
            "confirmed_payments": confirmed_payments,
            "pending_payments": total_receipts - confirmed_payments,
            "total_revenue": {k: str(v) for k, v in total_revenue.items()},
            "open_channels": len([c for c in self.payment_channels.values() if c.status == "open"]),
            "monetized_contexts": len(self.payment_requirements)
        }


# Helper functions for integration

def create_paid_context(node, payment_manager, context_data, price, currency):
    """Helper: Create a context with payment requirement"""
    from psinet_simple import ContextType

    # Create context
    context = node.create_context(
        context_type=ContextType.CONVERSATION,
        content=context_data
    )

    # Add payment requirement
    requirement = payment_manager.create_payment_requirement(
        context_id=context.id,
        pricing_model=PricingModel.PAY_PER_ACCESS,
        amount=price,
        currency=currency,
        recipient_address=payment_manager.wallet_addresses.get(currency.value, "demo-address")
    )

    return context, requirement


def access_paid_context(payment_manager, context_id, requester_did):
    """Helper: Check payment and access context"""

    response = payment_manager.check_payment_for_context(context_id, requester_did)

    if response:
        # Payment required
        return False, response
    else:
        # Access granted
        return True, None


if __name__ == "__main__":
    print("ΨNet X402 Payment Protocol - Use examples/demo_payment.py")
