# Skill Seekers Integration with ΨNet

## Overview

This integration connects [Skill Seekers](https://github.com/yusufkaraaslan/Skill_Seekers) with ΨNet to create a **decentralized AI skills marketplace** where skills are:
- Automatically extracted from documentation, GitHub repos, and PDFs
- Stored as encrypted context graphs on IPFS
- Registered as Harberger-taxed NFTs (prevents hoarding!)
- Validated via CRPC for quality assurance
- Traded with Shapley referral rewards

## Three Integration Layers

### 1. Smart Contract Layer (SkillRegistry.sol)

**What it does**: Creates a decentralized marketplace for AI agent skills

```solidity
// Register skill with Harberger taxation
function registerSkill(
    string name,           // "React Expert"
    string ipfsHash,       // Skill package from Skill Seekers
    string[] tags,         // ["react", "javascript", "frontend"]
    uint256 initialValue   // Self-assessed value in PSI
) returns (uint256 skillId);

// License skill for use (doesn't transfer ownership)
function licenseSkill(uint256 skillId) external;

// Forced purchase at self-assessed price
function forcedPurchase(uint256 skillId) external;
```

**Key Features**:
- Harberger taxation (5% annually)
- Always for sale (prevents hoarding)
- Quality scoring via CRPC
- Usage tracking and analytics
- Trending skills leaderboard

### 2. Context Graph Schema (skill-context-graph.json)

**What it does**: Defines structure for skill packages on IPFS

```json
{
  "skillId": "1",
  "metadata": {
    "name": "React Expert",
    "tags": ["react", "javascript", "frontend"],
    "skillType": "UNIFIED"
  },
  "content": {
    "apis": [/* Extracted function signatures */],
    "examples": [/* Code examples */],
    "documentation": [/* Categorized docs */]
  },
  "provenance": {
    "sources": [
      {"type": "documentation", "url": "https://react.dev"},
      {"type": "github", "url": "https://github.com/facebook/react"}
    ]
  },
  "ipfsHash": "QmXxx..."
}
```

### 3. Development Tooling (skill_seekers_integration.py)

**What it does**: Automates extraction, upload, and registration

```bash
# Extract from documentation
python tools/skill_seekers_integration.py extract-docs \\
    https://react.dev \\
    --name "React Expert" \\
    --tags react javascript frontend

# Extract from GitHub
python tools/skill_seekers_integration.py extract-github \\
    https://github.com/fastapi/fastapi \\
    --name "FastAPI Backend" \\
    --tags python fastapi backend

# Register on-chain
python tools/skill_seekers_integration.py register \\
    skill.json \\
    --value 1000 \\
    --private-key 0x...
```

## Complete Workflow

### Step 1: Install Skill Seekers

```bash
git clone https://github.com/yusufkaraaslan/Skill_Seekers
cd Skill_Seekers
pip install -r requirements.txt
```

### Step 2: Extract Skill

```bash
# From documentation
skill-seekers --url https://fastapi.tiangolo.com --output ./fastapi-skill

# From GitHub (with deep code analysis)
skill-seekers --github https://github.com/fastapi/fastapi --output ./fastapi-skill --deep-analysis

# From PDF
skill-seekers --pdf ./solidity-docs.pdf --output ./solidity-skill --ocr

# Unified (all sources)
skill-seekers \\
    --url https://fastapi.tiangolo.com \\
    --github https://github.com/fastapi/fastapi \\
    --output ./fastapi-complete \\
    --unified \\
    --conflict-detection
```

### Step 3: Convert to ΨNet Format

```bash
cd ΨNet
python tools/skill_seekers_integration.py extract-docs \\
    https://fastapi.tiangolo.com \\
    --name "FastAPI Expert" \\
    --description "Complete FastAPI development skills" \\
    --tags python fastapi backend api \\
    --output fastapi-skill.json
```

### Step 4: Upload to IPFS

```bash
# Start IPFS daemon
ipfs daemon &

# Upload (handled automatically by integration script)
python tools/skill_seekers_integration.py register fastapi-skill.json \\
    --value 5000 \\
    --private-key $PRIVATE_KEY \\
    --registry 0x... # SkillRegistry contract address
```

### Step 5: Skill is Live!

Your skill is now:
- ✅ On IPFS (content-addressed, immutable)
- ✅ Registered on-chain (Harberger NFT)
- ✅ Searchable by tags
- ✅ Available for licensing
- ✅ Earning tax revenue

## Use Cases

### Use Case 1: Open Source Documentation Skills

**Scenario**: Extract skills from popular frameworks

```bash
# React
python tools/skill_seekers_integration.py extract-docs https://react.dev --name "React Expert"

# Vue
python tools/skill_seekers_integration.py extract-docs https://vuejs.org --name "Vue.js Expert"

# Solidity
python tools/skill_seekers_integration.py extract-github https://github.com/OpenZeppelin/openzeppelin-contracts --name "Solidity Security"
```

**Benefits**:
- Community-maintained skills
- Always up-to-date (re-extract on updates)
- Quality-verified via CRPC
- Creators earn ongoing royalties

### Use Case 2: Private/Proprietary Skills

**Scenario**: Company has internal documentation

```bash
# Extract from private docs (requires auth)
skill-seekers --url https://internal-docs.company.com --auth-token $TOKEN

# Encrypt before upload
python tools/skill_seekers_integration.py register skill.json \\
    --value 10000 \\
    --encrypt \\
    --access-control licensed
```

Skills are encrypted on IPFS, only licensees get decryption keys.

### Use Case 3: Skill Marketplace

**Scenario**: Developers buy/sell specialized skills

```javascript
// Find React skills
const reactSkills = await skillRegistry.getSkillsByTag("react");

// License skill for 90 days
await skillRegistry.licenseSkill(skillId);

// Or buy outright (forced purchase)
await skillRegistry.forcedPurchase(skillId);
```

## Economic Model

### Harberger Taxation Benefits

**Traditional NFT**:
- Developer buys skill, holds forever
- No ongoing cost (speculation)
- Market illiquid

**ΨNet Harberger Skill**:
- Developer self-assesses at 1,000 PSI
- Pays 50 PSI/year tax (5%)
- Must use productively to offset tax
- Anyone can buy for 1,000 PSI

**Result**: Only productive skills survive!

### Revenue Distribution

```
Skill valued at 10,000 PSI:
Annual tax: 500 PSI

Distribution:
- Creator: 200 PSI (40%) - ongoing income!
- Rewards: 200 PSI (40%) - funds ecosystem
- Treasury: 100 PSI (20%) - development

vs Traditional:
- One-time royalty: 1,000 PSI (10%)

After 5 years:
- Harberger: 1,000 PSI to creator
- Traditional: 1,000 PSI total

After 10 years:
- Harberger: 2,000 PSI to creator (2x more!)
- Traditional: Still 1,000 PSI
```

### Shapley Referral Bonuses

When you refer someone who licenses skills:

```
Alice refers Bob
Bob licenses "React Expert" (100 PSI)

Immediate split:
- Alice: 50 PSI
- Bob: 50 PSI

Coalition bonus (if chain grows):
Alice → Bob → Charlie
- All three earn retroactive bonuses
- 42x more than flat rate!
```

## CRPC Validation

Skills can be validated for quality:

```solidity
// Submit skill for validation
crpcValidator.createTask(
    "Validate React Expert skill quality",
    workDuration,
    revealDuration,
    comparisonDuration
);

// Validators test the skill
// Pairwise comparisons determine quality score

// Winner gets 1000 PSI + reputation
// Skill gets quality score (0-100)

// Update skill
skillRegistry.verifySkill(skillId, qualityScore);
```

**Benefits**:
- Trustless quality assurance
- No centralized oracle
- Validators earn rewards
- High-quality skills cost more (justified!)

## API Reference

### SkillRegistry Contract

```solidity
// Registration
function registerSkill(
    string name,
    string description,
    string ipfsHash,
    string[] tags,
    SkillType skillType,
    uint256 initialValue,
    uint256 agentId
) returns (uint256 skillId);

// Licensing
function licenseSkill(uint256 skillId) external;
function hasActiveLicense(uint256 skillId, address user) returns (bool);

// Search
function getSkillsByTag(string tag) returns (uint256[] skillIds);
function findQualitySkills(string tag, uint256 minScore) returns (uint256[]);
function getTrendingSkills(uint256 limit) returns (uint256[]);

// Harberger mechanics
function updateSelfAssessment(uint256 skillId, uint256 newValue) external;
function payTax(uint256 skillId) external;
function forcedPurchase(uint256 skillId) external;

// Analytics
function getSkillFullInfo(uint256 skillId) returns (...);
function getRegistryStats() returns (...);
```

### Python Integration Tool

```python
from tools.skill_seekers_integration import SkillSeekersIntegration

# Initialize
integration = SkillSeekersIntegration(
    rpc_url="http://localhost:8545",
    ipfs_gateway="/ip4/127.0.0.1/tcp/5001",
    skill_registry_address="0x..."
)

# Extract from docs
skill = integration.extract_skill_from_docs(
    url="https://react.dev",
    name="React Expert",
    tags=["react", "javascript"]
)

# Upload to IPFS
ipfs_hash = integration.upload_to_ipfs(skill)

# Register on-chain
tx_hash = integration.register_skill_on_chain(
    skill,
    initial_value_psi=5000,
    private_key="0x..."
)
```

## Integration with Existing ΨNet Systems

### 1. ERC-8004 Reputation

```solidity
// Link skill to agent identity
skillRegistry.registerSkill(
    "React Expert",
    ipfsHash,
    tags,
    initialValue,
    agentId  // ERC-8004 agent ID
);

// High-reputation agents = higher skill values
// Skill usage → reputation increase
```

### 2. Shapley Referrals

```solidity
// Refer user to skill
shapleyReferrals.joinWithReferral(referrer);

// User licenses skill
skillRegistry.licenseSkill(skillId);

// Both earn:
// - Immediate split (50/50)
// - Coalition bonuses (retroactive)
```

### 3. CRPC Validation

```solidity
// Validate skill quality
crpcValidator.createTask("Validate skill X");

// Validators test skill
// Quality score assigned

// High quality = higher value justified
skillRegistry.updateSelfAssessment(skillId, higherValue);
```

### 4. $PSI Token Economics

All rewards paid in $PSI:
- Skill licensing fees
- Harberger tax (40% to creators!)
- CRPC validation rewards
- Shapley referral bonuses

## Roadmap

### Phase 1: Core Integration (Current)
- ✅ SkillRegistry smart contract
- ✅ Context graph schema
- ✅ Python integration tool
- ✅ Documentation

### Phase 2: Advanced Features
- [ ] Encrypted skills (licensed access only)
- [ ] Skill versioning and updates
- [ ] Skill dependencies (composable skills)
- [ ] MCP server integration
- [ ] Web UI for skill marketplace

### Phase 3: AI Agent Integration
- [ ] Autonomous skill acquisition
- [ ] Skill recommendation engine
- [ ] Performance analytics dashboard
- [ ] Multi-agent skill collaboration

## Conclusion

Skill Seekers + ΨNet creates the world's first **decentralized, fair, always-liquid AI skills marketplace**:

- **Automatic extraction** (Skill Seekers)
- **Decentralized storage** (IPFS context graphs)
- **Fair pricing** (Harberger self-assessment)
- **Quality assurance** (CRPC validation)
- **Sustainable revenue** (40% to creators forever!)
- **Positive-sum rewards** (Shapley referrals)

**This is the future of AI agent capabilities trading.**

---

**Links**:
- Skill Seekers: https://github.com/yusufkaraaslan/Skill_Seekers
- ΨNet Contracts: ./contracts/SkillRegistry.sol
- Integration Tool: ./tools/skill_seekers_integration.py
- Schema: ./schemas/skill-context-graph.json
