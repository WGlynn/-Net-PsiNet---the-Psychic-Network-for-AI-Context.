# Commit-Reveal Pairwise Comparison Protocol (CRPC) for ΨNet

## Overview

ΨNet integrates the **Commit-Reveal Pairwise Comparison Protocol (CRPC)** to enable decentralized, trustless verification of non-deterministic AI outputs without requiring expensive Zero-Knowledge Proofs.

**Credit**: Based on Tim Cotten's CRPC protocol
**Source**: https://blog.cotten.io/the-commit-reveal-pairwise-comparison-protocol-crpc-e1434fff94c4

## Why CRPC is Perfect for ΨNet

### The AI Verification Challenge

Traditional blockchain verification requires **deterministic** computations:
- Smart contracts can verify: `2 + 2 = 4` ✅
- Smart contracts cannot verify: "Is this AI response high quality?" ❌

**AI outputs are:**
- **Non-deterministic**: Same input → different outputs
- **Fuzzy**: No single "correct" answer
- **Subjective**: Quality depends on human judgment
- **Creative**: Cannot be computed deterministically

### Existing Solutions (and their problems)

| Solution | Problem |
|----------|---------|
| **Zero-Knowledge Proofs** | Extremely expensive, complex, not suitable for fuzzy AI outputs |
| **Trusted Oracles** | Centralized, single point of failure, rent extraction |
| **Optimistic Rollups** | Require "correct answer" to be known, doesn't work for creativity |
| **Multi-Party Computation** | High overhead, synchronous, doesn't scale |

### CRPC Solution

CRPC solves AI verification through:

✅ **Trustless**: No centralized oracle needed
✅ **Lightweight**: Simple hash commitments, no ZKP
✅ **Handles Fuzziness**: Pairwise comparisons aggregate human judgment
✅ **Prevents Cheating**: Two-round commit-reveal prevents copying and lying
✅ **Scalable**: Asynchronous, efficient on-chain operations
✅ **Aligns with ΨNet**: Reduces information asymmetry, positive-sum economics

---

## How CRPC Works

### Two-Round Protocol

CRPC uses **two rounds** of commit-reveal to prevent cheating:

```
Round 1: Work Commitment & Reveal
├─ 1a. Agents submit hash(workResult, secret)
├─ 1b. Deadline passes
└─ 1c. Agents reveal workResult + secret

Round 2: Comparison Commitment & Reveal
├─ 2a. Validators submit hash(rankings, secret)
├─ 2b. Deadline passes
├─ 2c. Validators reveal rankings + secret
└─ 2d. Smart contract aggregates scores
```

### Round 1: Work Commitment

**Purpose**: Prevent lazy nodes from copying others' work

**Process**:

1. **Commitment Phase** (1a):
   ```
   Agent computes: commitment = keccak256(workResult, secret)
   Agent submits: commitment (hash only)
   ```
   - `workResult`: IPFS/Arweave URI pointing to AI output
   - `secret`: Random bytes32 (kept private)
   - Contract stores: `commitment` + `agent address`

2. **Work Deadline**: Passes (e.g., 24 hours)

3. **Reveal Phase** (1b-1c):
   ```
   Agent reveals: workResult + secret
   Contract verifies: keccak256(workResult, secret) == commitment
   ```
   - If verified ✅: Work accepted
   - If mismatched ❌: Submission invalid (slashed)

**Why This Works**:
- Agents cannot see others' work during commitment phase
- Cannot change work after deadline
- Lazy nodes cannot copy high-quality submissions

### Round 2: Comparison Commitment

**Purpose**: Prevent validators from lying about rankings

**Process**:

1. **Comparison Phase** (2a):
   ```
   Validator reviews all revealed work
   Validator performs pairwise comparisons
   Validator assigns scores: [score1, score2, score3, ...]
   Validator computes: commitment = keccak256(rankings[], secret)
   Validator submits: commitment (hash only)
   ```

2. **Comparison Deadline**: Passes (e.g., 12 hours)

3. **Reveal Phase** (2b-2c):
   ```
   Validator reveals: rankings[] + secret
   Contract verifies: keccak256(rankings[], secret) == commitment
   ```

4. **Aggregation** (2d):
   ```
   For each submission i:
     totalScore[i] = sum of all validators' scores for submission i

   Winner = submission with highest totalScore
   ```

**Why This Works**:
- Validators cannot see others' rankings during commitment
- Cannot change rankings after seeing consensus
- Honest majority produces accurate results
- Dishonest validators are detected (outliers)

---

## ΨNet Implementation

### Smart Contracts

**CRPCValidator.sol** (450 lines)
- Core CRPC protocol implementation
- Manages two-round commit-reveal
- Handles task creation, submissions, comparisons
- Distributes rewards automatically

**CRPCIntegration.sol** (230 lines)
- Integrates CRPC with ΨNet reputation system
- Awards PSI tokens for quality work
- Promotes high-reputation agents to validators
- Tracks economics for transparency

### Task Lifecycle

```
1. CREATE TASK
   Requester: Creates task with reward pool
   Contract: Sets deadlines for all phases

2. ROUND 1A: COMMIT WORK
   Agents: Submit keccak256(workResult, secret)
   Deadline: workDeadline (e.g., 24 hours)

3. ROUND 1B: REVEAL WORK
   Agents: Submit workResult + secret
   Contract: Verifies hash matches
   Deadline: revealDeadline (e.g., +12 hours)

4. ROUND 2A: COMMIT COMPARISONS
   Validators: Submit keccak256(rankings[], secret)
   Deadline: comparisonDeadline (e.g., +12 hours)

5. ROUND 2B: REVEAL COMPARISONS
   Validators: Submit rankings[] + secret
   Contract: Verifies hash matches
   Contract: Aggregates scores
   Deadline: finalDeadline (e.g., +12 hours)

6. FINALIZE
   Contract: Finds highest-scored submission
   Contract: Distributes rewards
     ├─ Winner: 70% of reward pool + PSI bonus
     ├─ Validators: 30% of reward pool (split)
     └─ Top 3: PSI bonuses + reputation boosts
```

### Example Use Case: AI-Generated Art

**Task**: "Generate a beautiful sunset landscape"

**Round 1: Artists Create**
- Artist A submits: `hash("ipfs://QmArtA", secret_A)`
- Artist B submits: `hash("ipfs://QmArtB", secret_B)`
- Artist C submits: `hash("ipfs://QmArtC", secret_C)`
- *Deadline passes*
- Artists reveal their IPFS URIs + secrets
- Contract verifies hashes match

**Round 2: Community Judges**
- Validator 1 reviews all 3 artworks, ranks: `[85, 70, 90]` (C is best)
- Validator 2 reviews, ranks: `[80, 75, 88]` (C is best)
- Validator 3 reviews, ranks: `[90, 65, 92]` (C is best)
- *Validators commit hashes of their rankings*
- *Deadline passes*
- Validators reveal rankings + secrets
- Contract aggregates:
  - A: 85 + 80 + 90 = 255
  - B: 70 + 75 + 65 = 210
  - C: 90 + 88 + 92 = **270** ← Winner!

**Result**:
- Artist C wins 70% reward pool + 1000 PSI bonus
- Validators split 30% reward pool + 100 PSI each
- Everyone gets reputation boost (positive-sum!)

---

## Integration with ΨNet Economics

### Positive-Sum Rewards

CRPC aligns with ΨNet's positive-sum economics:

```
Traditional Competition (Zero-Sum):
Winner: +1000 PSI
Losers: +0 PSI
Total: 1000 PSI

ΨNet CRPC (Positive-Sum):
Winner (Rank 1): +1000 PSI + 70% reward + 15 reputation
Top 3 (Rank 2-3): +500 PSI + reputation boost
Participants (All): +5 reputation (learning bonus)
Validators: +100 PSI each + 3 reputation
Total: Much more value created!
```

**Key Insight**: Even "losers" gain reputation and knowledge. Everyone benefits from high-quality work being created and verified.

### Reducing Information Asymmetry

CRPC provides **full transparency**:

✅ All work commitments visible (hashes)
✅ All revealed work publicly viewable (IPFS)
✅ All validator rankings visible (after reveal)
✅ Aggregation algorithm open-source
✅ Rewards distribution automatic and verifiable

**No hidden algorithms, no opaque judgments, no centralized control.**

### Validator Promotion

High-reputation agents become trusted validators:

```solidity
// Trustless promotion based on verifiable reputation
function promoteToValidator(uint256 agentId) {
    require(reputation[agentId] >= 75, "Reputation too low");
    require(feedbackCount[agentId] >= 5, "Insufficient history");

    grantValidatorRole(agentId);
}
```

**Result**: Meritocratic system where quality participation earns validator privileges.

---

## Technical Specifications

### Commitment Scheme

**Hash Function**: `keccak256` (Ethereum standard)

**Work Commitment**:
```solidity
bytes32 commitment = keccak256(abi.encodePacked(workResult, secret));
```

**Comparison Commitment**:
```solidity
bytes32 commitment = keccak256(abi.encodePacked(rankings[], secret));
```

### Security Properties

| Attack | Prevention |
|--------|-----------|
| **Copying Work** | Round 1 commitment prevents seeing others' work |
| **Changing Work** | Cryptographic hash binds agent to their work |
| **Lazy Validation** | Round 2 commitment prevents copying rankings |
| **Lying About Scores** | Hash commitment + majority consensus |
| **Sybil Attacks** | Validator role requires high reputation + stake |
| **Collusion** | Distributed validators + reputation at stake |

### Gas Optimization

CRPC is designed for efficiency:

| Operation | Estimated Gas |
|-----------|---------------|
| Create Task | ~150,000 |
| Submit Work Commitment | ~50,000 |
| Reveal Work | ~80,000 |
| Submit Comparison | ~60,000 |
| Reveal Comparison | ~100,000 |
| Finalize Task | ~200,000 |

**Total**: ~640,000 gas for complete workflow
**L2 Cost**: ~10-100x cheaper on Optimism/Arbitrum

---

## Pairwise Comparison Algorithm

### Why Pairwise?

**Pairwise comparisons** are more reliable than absolute ratings:

**Absolute Rating**:
- "Rate this artwork 1-10"
- ❌ Different people have different scales
- ❌ Anchoring bias (first seen sets baseline)
- ❌ Cultural differences in rating behavior

**Pairwise Comparison**:
- "Which artwork is better: A or B?"
- ✅ Relative comparison is more consistent
- ✅ Reduces bias
- ✅ Can be aggregated mathematically

### Example Algorithm

Given N submissions, validators compare all pairs:

```
For submissions [A, B, C]:

Comparisons needed:
1. A vs B → Which is better?
2. A vs C → Which is better?
3. B vs C → Which is better?

Total comparisons = N × (N-1) / 2
```

**Scoring**:
```
If A > B: A gets +1, B gets +0
If A < B: A gets +0, B gets +1
If A = B: A gets +0.5, B gets +0.5

Final Score = Sum of all comparison results
```

### Aggregation Across Validators

```
Validator 1 scores: [A=85, B=70, C=90]
Validator 2 scores: [A=80, B=75, C=88]
Validator 3 scores: [A=90, B=65, C=92]

Aggregated:
A = 85 + 80 + 90 = 255
B = 70 + 75 + 65 = 210
C = 90 + 88 + 92 = 270 ← Winner
```

**Robust to Outliers**: One dishonest validator doesn't skew results much.

---

## Use Cases in ΨNet

### 1. AI-Generated Content Verification

**Task**: "Write a compelling story about time travel"

**Challenge**: No "correct" answer, purely creative
**Solution**: CRPC lets community validate best story
**Benefit**: High-quality AI content gets rewarded

### 2. AI Model Output Comparison

**Task**: "Which AI model generates better code?"

**Challenge**: Multiple models, subjective quality
**Solution**: CRPC compares outputs from different models
**Benefit**: Discover best models through crowd validation

### 3. Context Graph Quality

**Task**: "Create comprehensive context for medical diagnosis"

**Challenge**: Context quality is fuzzy
**Solution**: CRPC validates which context is most useful
**Benefit**: High-quality contexts become trusted references

### 4. Multi-Agent Debate Resolution

**Task**: "Which agent provided the most helpful advice?"

**Challenge**: No objective metric for "helpful"
**Solution**: CRPC aggregates human judgment
**Benefit**: Agents learn what humans value

### 5. Reputation Bootstrapping

**Task**: New agents complete starter tasks

**Challenge**: Need reputation to participate
**Solution**: CRPC tasks provide entry point
**Benefit**: Meritocratic onboarding

---

## Comparison to Alternatives

| Method | Cost | Handles Fuzzy AI | Trustless | Scalable |
|--------|------|------------------|-----------|----------|
| **CRPC** | Low | ✅ Yes | ✅ Yes | ✅ Yes |
| **Zero-Knowledge Proofs** | Very High | ❌ No | ✅ Yes | ⚠️ Limited |
| **Optimistic Rollups** | Medium | ❌ No | ✅ Yes | ✅ Yes |
| **Trusted Oracles** | Low | ✅ Yes | ❌ No | ✅ Yes |
| **Human Voting** | Medium | ✅ Yes | ⚠️ Partial | ⚠️ Limited |

**CRPC is the best fit** for AI verification: trustless, scalable, handles fuzziness, and low-cost.

---

## Economic Sustainability

### Revenue Model

CRPC tasks generate revenue through:

1. **Task Creation Fees**: Requesters pay for task creation
2. **Validator Staking**: Validators stake reputation/tokens
3. **Network Fees**: Small percentage of reward pools
4. **Integration Fees**: ΨNet integration fee (0.1%)

### Cost Model

Minimal operational costs:

1. **Gas Fees**: Paid by participants
2. **Storage**: IPFS/Arweave (decentralized)
3. **Validation**: Performed by distributed validators
4. **Aggregation**: Automatic via smart contract

**Result**: Sustainable economics with minimal rent extraction!

---

## Future Enhancements

### Planned Features

- [ ] **Quadratic Pairwise Voting**: Reduce whale manipulation
- [ ] **ML-Based Outlier Detection**: Identify dishonest validators
- [ ] **Recursive CRPC**: Use CRPC to validate CRPC validators
- [ ] **Privacy-Preserving Comparisons**: ZK proofs for rankings
- [ ] **Cross-Chain CRPC**: Validate across multiple blockchains
- [ ] **Reputation-Weighted Voting**: Higher reputation = more influence
- [ ] **Automated Dispute Resolution**: ML-based dispute handling
- [ ] **CRPC Marketplace**: Tokenized task templates

### Research Directions

- **Byzantine Risk Tolerance (BRT)**: AI-native consensus mechanism
- **Mixture of Fools**: Agent emulation validation
- **Autonomous Virtual Beings**: Self-validating AI agents
- **Federated CRPC**: Privacy-preserving validation
- **Temporal CRPC**: Time-series validation for evolving AI

---

## Getting Started

### For Task Requesters

```solidity
// 1. Create a task
uint256 taskId = crpcValidator.createTask{value: 1 ether}(
    "ipfs://QmTaskDescription",
    24 hours,  // Work duration
    12 hours,  // Reveal duration
    12 hours   // Comparison duration
);

// 2. Wait for completion
// 3. Call integrateCRPCTask() for reputation bonuses
```

### For Agents (Workers)

```solidity
// 1. Generate commitment
bytes32 commitment = crpcValidator.generateWorkCommitment(
    "ipfs://QmMyWork",
    keccak256("my_secret")
);

// 2. Submit commitment
crpcValidator.submitWorkCommitment(taskId, commitment);

// 3. After deadline, reveal
crpcValidator.revealWork(
    taskId,
    submissionId,
    "ipfs://QmMyWork",
    keccak256("my_secret")
);
```

### For Validators

```solidity
// 1. Review all revealed work
// 2. Perform pairwise comparisons
// 3. Generate rankings: [score1, score2, score3, ...]

// 4. Generate commitment
bytes32 commitment = crpcValidator.generateComparisonCommitment(
    rankings,
    keccak256("validator_secret")
);

// 5. Submit commitment
crpcValidator.submitComparisonCommitment(taskId, commitment);

// 6. After deadline, reveal
crpcValidator.revealComparison(
    taskId,
    rankings,
    keccak256("validator_secret")
);
```

---

## Conclusion

CRPC is a **game-changing protocol** for ΨNet:

✅ **Solves AI Verification**: Trustless validation of non-deterministic outputs
✅ **Reduces Information Asymmetry**: Fully transparent, verifiable process
✅ **Positive-Sum Economics**: All participants gain reputation and knowledge
✅ **Scalable**: Lightweight, efficient, works on L1 and L2
✅ **Meritocratic**: Quality work earns rewards and validator privileges
✅ **No Rent Extraction**: Minimal fees, community-controlled

**CRPC + ΨNet = The future of trustless AI verification** 🚀

---

**References**:
- Tim Cotten's CRPC: https://blog.cotten.io/the-commit-reveal-pairwise-comparison-protocol-crpc-e1434fff94c4
- Scrypted (CRPC Development): https://scrypted.com
- Byzantine Risk Tolerance: Research paper (forthcoming)
- ΨNet Tokenomics: See TOKENOMICS.md
- ΨNet Architecture: See NETWORK_DESIGN_BREAKDOWN.md

**License**: MIT
**Version**: 1.0.0
**Last Updated**: 2025-01-07
