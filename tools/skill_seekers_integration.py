#!/usr/bin/env python3
"""
ΨNet + Skill Seekers Integration Tool

This script integrates Skill Seekers (https://github.com/yusufkaraaslan/Skill_Seekers)
with ΨNet's SkillRegistry smart contract and IPFS context graphs.

WORKFLOW:
1. Run Skill Seekers to extract skill from docs/GitHub/PDF
2. Convert Skill Seekers output to ΨNet skill context graph format
3. Upload skill package to IPFS
4. Register skill in SkillRegistry smart contract (Harberger NFT)
5. Optionally submit for CRPC validation

USAGE:
    # Extract skill from documentation
    python skill_seekers_integration.py extract-docs https://react.dev --name "React Expert"

    # Extract from GitHub repo
    python skill_seekers_integration.py extract-github https://github.com/fastapi/fastapi --name "FastAPI Backend"

    # Extract from PDF
    python skill_seekers_integration.py extract-pdf ./solidity-docs.pdf --name "Solidity Auditor"

    # Unified extraction (all sources)
    python skill_seekers_integration.py extract-unified \\
        --docs https://fastapi.tiangolo.com \\
        --github https://github.com/fastapi/fastapi \\
        --name "FastAPI Complete"

    # Register existing skill package
    python skill_seekers_integration.py register ./skill-package.json --value 1000

Requirements:
    pip install web3 ipfshttpclient jsonschema requests
"""

import json
import os
import sys
import subprocess
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

try:
    from web3 import Web3
    import ipfshttpclient
    import jsonschema
except ImportError:
    print("ERROR: Missing dependencies. Install with:")
    print("  pip install web3 ipfshttpclient jsonschema requests")
    sys.exit(1)


class SkillSeekersIntegration:
    """Integration between Skill Seekers and ΨNet"""

    def __init__(
        self,
        rpc_url: str = "http://localhost:8545",
        ipfs_gateway: str = "/ip4/127.0.0.1/tcp/5001",
        skill_registry_address: Optional[str] = None
    ):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.ipfs = ipfshttpclient.connect(ipfs_gateway)
        self.skill_registry_address = skill_registry_address

        # Load schema
        schema_path = Path(__file__).parent.parent / "schemas" / "skill-context-graph.json"
        with open(schema_path) as f:
            self.schema = json.load(f)

    def extract_skill_from_docs(
        self,
        url: str,
        name: str,
        description: str = "",
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """
        Extract skill from documentation using Skill Seekers

        Args:
            url: Documentation URL
            name: Skill name (e.g., "React Expert")
            description: Skill description
            tags: Tags for discovery (e.g., ["react", "javascript", "frontend"])

        Returns:
            Skill context graph (validated against schema)
        """
        print(f"🔍 Extracting skill from documentation: {url}")

        # Run Skill Seekers
        output_dir = f"/tmp/psinet-skill-{hashlib.md5(url.encode()).hexdigest()[:8]}"
        os.makedirs(output_dir, exist_ok=True)

        try:
            # Call Skill Seekers (assumes installed and in PATH)
            subprocess.run([
                "skill-seekers",
                "--url", url,
                "--output", output_dir,
                "--format", "json"
            ], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Skill Seekers extraction failed: {e}")
            raise

        # Load Skill Seekers output
        skill_seekers_output = self._load_skill_seekers_output(output_dir)

        # Convert to ΨNet format
        skill_graph = self._convert_to_psinet_format(
            skill_seekers_output,
            name=name,
            description=description,
            tags=tags or [],
            source_type="DOCUMENTATION",
            source_url=url
        )

        # Validate against schema
        jsonschema.validate(skill_graph, self.schema)

        print(f"✅ Skill extracted successfully")
        return skill_graph

    def extract_skill_from_github(
        self,
        repo_url: str,
        name: str,
        description: str = "",
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """Extract skill from GitHub repository using Skill Seekers"""
        print(f"🔍 Extracting skill from GitHub: {repo_url}")

        output_dir = f"/tmp/psinet-skill-github-{hashlib.md5(repo_url.encode()).hexdigest()[:8]}"
        os.makedirs(output_dir, exist_ok=True)

        try:
            subprocess.run([
                "skill-seekers",
                "--github", repo_url,
                "--output", output_dir,
                "--format", "json",
                "--deep-analysis"  # Enable AST parsing
            ], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Skill Seekers extraction failed: {e}")
            raise

        skill_seekers_output = self._load_skill_seekers_output(output_dir)

        skill_graph = self._convert_to_psinet_format(
            skill_seekers_output,
            name=name,
            description=description,
            tags=tags or [],
            source_type="CODE_ANALYSIS",
            source_url=repo_url
        )

        jsonschema.validate(skill_graph, self.schema)

        print(f"✅ Skill extracted successfully")
        return skill_graph

    def extract_skill_from_pdf(
        self,
        pdf_path: str,
        name: str,
        description: str = "",
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """Extract skill from PDF using Skill Seekers"""
        print(f"🔍 Extracting skill from PDF: {pdf_path}")

        output_dir = f"/tmp/psinet-skill-pdf-{hashlib.md5(pdf_path.encode()).hexdigest()[:8]}"
        os.makedirs(output_dir, exist_ok=True)

        try:
            subprocess.run([
                "skill-seekers",
                "--pdf", pdf_path,
                "--output", output_dir,
                "--format", "json",
                "--ocr"  # Enable OCR for scanned PDFs
            ], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Skill Seekers extraction failed: {e}")
            raise

        skill_seekers_output = self._load_skill_seekers_output(output_dir)

        skill_graph = self._convert_to_psinet_format(
            skill_seekers_output,
            name=name,
            description=description,
            tags=tags or [],
            source_type="PDF_KNOWLEDGE",
            source_url=f"file://{os.path.abspath(pdf_path)}"
        )

        jsonschema.validate(skill_graph, self.schema)

        print(f"✅ Skill extracted successfully")
        return skill_graph

    def extract_unified_skill(
        self,
        name: str,
        docs_url: Optional[str] = None,
        github_url: Optional[str] = None,
        pdf_path: Optional[str] = None,
        description: str = "",
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """
        Extract skill from multiple sources (unified)
        Combines documentation, GitHub, and PDF sources
        """
        print(f"🔍 Extracting unified skill from multiple sources")

        sources = []
        if docs_url:
            sources.extend(["--url", docs_url])
        if github_url:
            sources.extend(["--github", github_url])
        if pdf_path:
            sources.extend(["--pdf", pdf_path])

        if not sources:
            raise ValueError("At least one source (docs/github/pdf) required")

        output_dir = f"/tmp/psinet-skill-unified-{hashlib.md5(name.encode()).hexdigest()[:8]}"
        os.makedirs(output_dir, exist_ok=True)

        try:
            subprocess.run([
                "skill-seekers",
                *sources,
                "--output", output_dir,
                "--format", "json",
                "--unified",  # Unified mode
                "--conflict-detection"  # Detect conflicts between sources
            ], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Skill Seekers extraction failed: {e}")
            raise

        skill_seekers_output = self._load_skill_seekers_output(output_dir)

        # Collect all source URLs
        source_urls = []
        if docs_url:
            source_urls.append(("documentation", docs_url))
        if github_url:
            source_urls.append(("github", github_url))
        if pdf_path:
            source_urls.append(("pdf", f"file://{os.path.abspath(pdf_path)}"))

        skill_graph = self._convert_to_psinet_format(
            skill_seekers_output,
            name=name,
            description=description,
            tags=tags or [],
            source_type="UNIFIED",
            source_urls=source_urls
        )

        jsonschema.validate(skill_graph, self.schema)

        print(f"✅ Unified skill extracted successfully")
        return skill_graph

    def upload_to_ipfs(self, skill_graph: Dict[str, Any]) -> str:
        """
        Upload skill graph to IPFS

        Returns:
            IPFS hash (CID)
        """
        print(f"📤 Uploading skill to IPFS...")

        # Convert to JSON bytes
        skill_json = json.dumps(skill_graph, indent=2).encode('utf-8')

        # Upload to IPFS
        result = self.ipfs.add_bytes(skill_json)
        ipfs_hash = result

        print(f"✅ Uploaded to IPFS: {ipfs_hash}")

        # Update skill graph with IPFS hash
        skill_graph["ipfsHash"] = ipfs_hash

        return ipfs_hash

    def register_skill_on_chain(
        self,
        skill_graph: Dict[str, Any],
        initial_value_psi: int,
        private_key: str,
        agent_id: int = 0
    ) -> str:
        """
        Register skill in SkillRegistry smart contract

        Args:
            skill_graph: Skill context graph (must have ipfsHash)
            initial_value_psi: Initial self-assessed value in PSI (ether units)
            private_key: Private key for transaction signing
            agent_id: ERC-8004 agent ID (0 if none)

        Returns:
            Transaction hash
        """
        if not self.skill_registry_address:
            raise ValueError("SkillRegistry address not configured")

        if "ipfsHash" not in skill_graph:
            raise ValueError("Skill must be uploaded to IPFS first")

        print(f"📝 Registering skill on-chain...")

        # Load contract ABI (simplified for example)
        # In production, load from compiled contract artifacts
        contract_abi = self._get_skill_registry_abi()

        contract = self.w3.eth.contract(
            address=self.skill_registry_address,
            abi=contract_abi
        )

        account = self.w3.eth.account.from_key(private_key)

        # Convert PSI to wei
        value_wei = self.w3.to_wei(initial_value_psi, 'ether')

        # Build transaction
        tx = contract.functions.registerSkill(
            skill_graph["metadata"]["name"],
            skill_graph["metadata"]["description"],
            skill_graph["ipfsHash"],
            skill_graph["metadata"]["tags"],
            self._skill_type_to_enum(skill_graph["metadata"]["skillType"]),
            value_wei,
            agent_id
        ).build_transaction({
            'from': account.address,
            'nonce': self.w3.eth.get_transaction_count(account.address),
            'gas': 500000,
            'gasPrice': self.w3.eth.gas_price
        })

        # Sign and send
        signed_tx = account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        print(f"✅ Transaction sent: {tx_hash.hex()}")
        print(f"⏳ Waiting for confirmation...")

        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        if receipt['status'] == 1:
            # Extract skillId from event logs
            skill_id = self._extract_skill_id_from_receipt(receipt, contract)
            print(f"✅ Skill registered! Skill ID: {skill_id}")

            # Update skill graph with on-chain data
            skill_graph["onChainData"] = {
                "skillRegistryId": str(skill_id),
                "owner": account.address,
                "creator": account.address,
                "selfAssessedValue": str(value_wei),
                "verified": False,
                "usageCount": 0
            }

            return tx_hash.hex()
        else:
            raise Exception(f"Transaction failed: {receipt}")

    def _load_skill_seekers_output(self, output_dir: str) -> Dict[str, Any]:
        """Load Skill Seekers JSON output"""
        output_file = Path(output_dir) / "skill.json"
        if not output_file.exists():
            raise FileNotFoundError(f"Skill Seekers output not found: {output_file}")

        with open(output_file) as f:
            return json.load(f)

    def _convert_to_psinet_format(
        self,
        skill_seekers_data: Dict[str, Any],
        name: str,
        description: str,
        tags: List[str],
        source_type: str,
        source_url: Optional[str] = None,
        source_urls: Optional[List[tuple]] = None
    ) -> Dict[str, Any]:
        """Convert Skill Seekers output to ΨNet skill context graph format"""

        # Build provenance
        sources = []
        if source_urls:
            for source_type_inner, url in source_urls:
                sources.append({
                    "type": source_type_inner,
                    "url": url,
                    "scrapedAt": datetime.utcnow().isoformat() + "Z"
                })
        elif source_url:
            sources.append({
                "type": source_type.lower().replace("_", ""),
                "url": source_url,
                "scrapedAt": datetime.utcnow().isoformat() + "Z"
            })

        # Extract APIs from Skill Seekers output
        apis = skill_seekers_data.get("apis", [])
        examples = skill_seekers_data.get("examples", [])
        documentation = skill_seekers_data.get("documentation", [])

        skill_graph = {
            "skillId": "",  # Will be set after on-chain registration
            "metadata": {
                "name": name,
                "description": description or skill_seekers_data.get("description", ""),
                "tags": tags,
                "skillType": source_type,
                "version": "1.0.0",
                "language": skill_seekers_data.get("language"),
                "framework": skill_seekers_data.get("framework"),
                "difficulty": "intermediate"  # Could be inferred
            },
            "content": {
                "apis": apis,
                "examples": examples,
                "documentation": documentation,
                "codeSnippets": skill_seekers_data.get("snippets", {})
            },
            "provenance": {
                "sources": sources,
                "extractedAt": datetime.utcnow().isoformat() + "Z",
                "extractorVersion": "1.0.0",  # Skill Seekers version
                "conflicts": skill_seekers_data.get("conflicts", [])
            },
            "ipfsHash": "",  # Will be set after IPFS upload
            "relationships": {
                "dependencies": [],
                "relatedSkills": []
            },
            "performance": {
                "totalExecutions": 0
            },
            "encryption": {
                "encrypted": False,
                "accessControl": "public"
            },
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z"
        }

        return skill_graph

    def _skill_type_to_enum(self, skill_type: str) -> int:
        """Convert skill type string to Solidity enum value"""
        mapping = {
            "DOCUMENTATION": 0,
            "CODE_ANALYSIS": 1,
            "PDF_KNOWLEDGE": 2,
            "UNIFIED": 3
        }
        return mapping.get(skill_type, 0)

    def _get_skill_registry_abi(self) -> List:
        """Get SkillRegistry contract ABI"""
        # Simplified ABI - in production, load from build artifacts
        return [
            {
                "inputs": [
                    {"name": "name", "type": "string"},
                    {"name": "description", "type": "string"},
                    {"name": "ipfsHash", "type": "string"},
                    {"name": "tags", "type": "string[]"},
                    {"name": "skillType", "type": "uint8"},
                    {"name": "initialValue", "type": "uint256"},
                    {"name": "agentId", "type": "uint256"}
                ],
                "name": "registerSkill",
                "outputs": [{"name": "skillId", "type": "uint256"}],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]

    def _extract_skill_id_from_receipt(self, receipt: Dict, contract: Any) -> int:
        """Extract skill ID from transaction receipt"""
        # Parse SkillRegistered event
        # Simplified - in production, use proper event parsing
        for log in receipt['logs']:
            try:
                # This is simplified - use contract.events.SkillRegistered().processReceipt(receipt)
                if log['topics'][0].hex() == "...":  # SkillRegistered event signature
                    return int(log['data'], 16)
            except:
                continue
        return 0


def main():
    """CLI interface"""
    import argparse

    parser = argparse.ArgumentParser(description="ΨNet + Skill Seekers Integration")
    subparsers = parser.add_subparsers(dest='command', help='Command to run')

    # Extract from docs
    docs_parser = subparsers.add_parser('extract-docs', help='Extract skill from documentation')
    docs_parser.add_argument('url', help='Documentation URL')
    docs_parser.add_argument('--name', required=True, help='Skill name')
    docs_parser.add_argument('--description', default='', help='Skill description')
    docs_parser.add_argument('--tags', nargs='+', default=[], help='Tags')
    docs_parser.add_argument('--output', default='skill.json', help='Output file')

    # Extract from GitHub
    github_parser = subparsers.add_parser('extract-github', help='Extract skill from GitHub')
    github_parser.add_argument('repo', help='GitHub repository URL')
    github_parser.add_argument('--name', required=True, help='Skill name')
    github_parser.add_argument('--description', default='', help='Skill description')
    github_parser.add_argument('--tags', nargs='+', default=[], help='Tags')
    github_parser.add_argument('--output', default='skill.json', help='Output file')

    # Register skill
    register_parser = subparsers.add_parser('register', help='Register skill on-chain')
    register_parser.add_argument('skill_file', help='Skill JSON file')
    register_parser.add_argument('--value', type=int, required=True, help='Initial value in PSI')
    register_parser.add_argument('--private-key', required=True, help='Private key')
    register_parser.add_argument('--registry', help='SkillRegistry contract address')

    args = parser.parse_args()

    integration = SkillSeekersIntegration(
        skill_registry_address=getattr(args, 'registry', None)
    )

    if args.command == 'extract-docs':
        skill = integration.extract_skill_from_docs(
            args.url,
            args.name,
            args.description,
            args.tags
        )
        with open(args.output, 'w') as f:
            json.dump(skill, f, indent=2)
        print(f"💾 Saved to {args.output}")

    elif args.command == 'extract-github':
        skill = integration.extract_skill_from_github(
            args.repo,
            args.name,
            args.description,
            args.tags
        )
        with open(args.output, 'w') as f:
            json.dump(skill, f, indent=2)
        print(f"💾 Saved to {args.output}")

    elif args.command == 'register':
        with open(args.skill_file) as f:
            skill = json.load(f)

        # Upload to IPFS
        ipfs_hash = integration.upload_to_ipfs(skill)

        # Register on-chain
        tx_hash = integration.register_skill_on_chain(
            skill,
            args.value,
            args.private_key
        )

        print(f"✅ Skill registered! TX: {tx_hash}")


if __name__ == "__main__":
    main()
