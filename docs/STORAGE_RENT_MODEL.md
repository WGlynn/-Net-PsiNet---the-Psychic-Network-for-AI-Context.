# ΨNet Storage Rent Model: Economic Density = Context Density

## 🎯 Core Concept

**Agents pay continuous rent on context storage based on data size, incentivizing compression and optimization without sacrificing quality.**

The smaller the storage footprint, the lower the rent. This creates a competitive market for context density:
- **Economic Density** = Value per byte
- **Context Density** = Information per byte

```
Rent Rate ∝ Storage Size
Quality Score ∝ CRPC Validation
Efficiency Score = Quality / Storage Size
Rewards ∝ Efficiency Score
```

---

## 💡 Why This Matters

### Traditional Storage Problems
- **No incentive to optimize**: Agents can bloat context with redundant data
- **Storage spam**: Cheap to fill network with low-quality content
- **Performance degradation**: Large contexts slow down retrieval and processing
- **Economic waste**: Paying for unused/redundant information

### Storage Rent Solution
- **Direct cost signal**: Every byte costs money over time
- **Quality preservation**: CRPC validation ensures compression doesn't lose information
- **Innovation incentive**: Market for better compression algorithms
- **Network efficiency**: Smaller contexts = faster network, lower costs for everyone

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STORAGE RENT LIFECYCLE                                │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐
  │ Agent Creates    │
  │ Context Node     │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Upload to IPFS   │
  │ (Get CID + Size) │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────────────────┐
  │ Register in                  │
  │ ContextStorageRegistry       │
  │                              │
  │ • Record CID                 │
  │ • Record Size (bytes)        │
  │ • Start Rent Timer           │
  │ • Lock Initial Deposit       │
  └────────┬─────────────────────┘
           │
           ▼
  ┌──────────────────────────────┐
  │ Continuous Rent Accrual      │
  │                              │
  │ Daily Rent = Size × RentRate │
  │ Paid from Deposit            │
  └────────┬─────────────────────┘
           │
           ├──────────────────────────────┐
           │                              │
           ▼                              ▼
  ┌─────────────────┐          ┌─────────────────────┐
  │ Agent Optimizes │          │ Deposit Runs Low    │
  │ Context         │          │                     │
  │                 │          │ • Alert Agent       │
  │ • Compress      │          │ • Grace Period      │
  │ • Summarize     │          │ • Auto-Archive?     │
  │ • Deduplicate   │          └─────────────────────┘
  └────────┬────────┘
           │
           ▼
  ┌──────────────────────────────┐
  │ Submit to CRPC Validation    │
  │                              │
  │ Validators Compare:          │
  │ • Original Context           │
  │ • Optimized Context          │
  │                              │
  │ Quality Score (0-100%)       │
  └────────┬─────────────────────┘
           │
           ▼
  ┌──────────────────────────────┐
  │ Quality ≥ Threshold?         │
  │ (e.g., 95%)                  │
  └────────┬─────────────────────┘
           │
           ├─────────────────────┐
           │ YES                 │ NO
           ▼                     ▼
  ┌─────────────────┐   ┌──────────────────┐
  │ Update Storage  │   │ Reject           │
  │                 │   │ Optimization     │
  │ • New CID       │   │                  │
  │ • New Size ✓    │   │ • Keep Original  │
  │ • Lower Rent ✓  │   │ • Penalty?       │
  │ • Efficiency    │   └──────────────────┘
  │   Reward! ✓     │
  └─────────────────┘
```

---

## 📊 Rent Calculation Model

### Base Rent Formula

```
Daily Rent = Storage Size (bytes) × Base Rate × Network Multiplier
```

**Parameters:**
- `Base Rate`: 0.001 PSI per GB per day (adjustable by governance)
- `Network Multiplier`: 1 + (Total Network Storage / Storage Cap)
  - Increases as network fills up
  - Creates backpressure against storage bloat

**Example:**
- 1 MB context = 0.000001 PSI/day (~$0.0003/year at $0.001/PSI)
- 1 GB context = 0.001 PSI/day (~$0.30/year)
- 1 TB context = 1 PSI/day (~$300/year)

### Efficiency Rewards

Agents that optimize contexts receive **rebates** and **bonuses**:

```
Efficiency Score = (Quality Score / 100) × (Original Size / New Size)

if Efficiency Score > 1.0:
    Rent Rebate = (1 - 1/Efficiency Score) × Accumulated Rent
    Bonus Reward = Efficiency Score × Base Bonus
```

**Example:**
- Original: 10 MB, Quality: 100%
- Optimized: 2 MB, Quality: 98%
- Efficiency Score = 0.98 × (10/2) = 4.9
- Rent Rebate = (1 - 1/4.9) × Rent = 79.6% of rent refunded!
- Bonus Reward = 4.9 × Base Bonus

**This creates a powerful incentive to compress!**

---

## 🔬 Quality Validation via CRPC

### Challenge: How do we verify that compressed context maintains quality?

**Solution: Pairwise Comparison Tasks**

Validators are given:
1. **Original context** (reference)
2. **Compressed context** (candidate)
3. **Test queries** (probe understanding)

**Validation Process:**

```
For each test query:
    Answer A = Query against Original Context
    Answer B = Query against Compressed Context

    Validators compare:
    - Semantic similarity
    - Factual accuracy
    - Information completeness

Quality Score = Avg(Similarity Scores across all queries)
```

**Test Query Generation:**
- Automated via LLM analysis of original context
- Covers key facts, relationships, temporal sequences
- Ensures compressed version preserves critical information

---

## 💾 Context Compression Strategies

Agents can optimize storage through multiple techniques:

### 1. **Summarization**
```
Original: Full conversation transcript (100 KB)
Optimized: Hierarchical summary with key points (10 KB)
Compression: 10x
```

### 2. **Deduplication**
```
Original: Repeated facts across multiple nodes (50 KB)
Optimized: Single source of truth with references (15 KB)
Compression: 3.3x
```

### 3. **Embedding Compression**
```
Original: Full text embeddings (768-dim vectors)
Optimized: Quantized embeddings (64-dim)
Compression: 12x
```

### 4. **Graph Pruning**
```
Original: Dense context graph with redundant edges
Optimized: Minimal spanning tree of essential relationships
Compression: 5x
```

### 5. **Temporal Summarization**
```
Original: All messages in conversation
Optimized: Period summaries + recent detail (sliding window)
Compression: Variable (2-20x)
```

### 6. **Semantic Chunking**
```
Original: Monolithic context blob
Optimized: Topical chunks with cross-references
Access: Only load relevant chunks
Effective Compression: 10-100x (for specific queries)
```

---

## 📜 Smart Contract: ContextStorageRegistry

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PsiToken.sol";
import "./erc8004/ReputationRegistry.sol";
import "./CRPCValidator.sol";

/**
 * @title ContextStorageRegistry
 * @notice Manages context storage with continuous rent and efficiency incentives
 */
contract ContextStorageRegistry {

    // ═══════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════

    struct ContextNode {
        bytes32 ipfsCID;           // Content identifier
        uint256 sizeBytes;         // Storage size
        uint256 createdAt;         // Timestamp
        uint256 lastRentPayment;   // Last payment timestamp
        uint256 depositBalance;    // Prepaid rent balance
        address owner;             // Agent DID/address
        bool archived;             // Archived flag (stops rent)
    }

    struct OptimizationProposal {
        bytes32 originalCID;
        bytes32 optimizedCID;
        uint256 originalSize;
        uint256 optimizedSize;
        uint256 qualityScore;      // 0-10000 (100.00%)
        bool validated;
        bool accepted;
    }

    // ═══════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════

    PsiToken public psiToken;
    ReputationRegistry public reputationRegistry;
    CRPCValidator public crpcValidator;

    // Storage rent parameters (governance adjustable)
    uint256 public baseRatePerGBPerDay = 1e15;  // 0.001 PSI per GB per day
    uint256 public qualityThreshold = 9500;      // 95% minimum quality
    uint256 public efficiencyBonusPool = 1000000e18;  // 1M PSI for bonuses

    // Network storage tracking
    uint256 public totalStorageBytes;
    uint256 public storageCapGB = 1000000;  // 1 PB cap

    // Mappings
    mapping(bytes32 => ContextNode) public contexts;
    mapping(bytes32 => OptimizationProposal) public optimizations;

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    event ContextRegistered(bytes32 indexed cid, address indexed owner, uint256 size);
    event RentPaid(bytes32 indexed cid, uint256 amount);
    event OptimizationProposed(bytes32 indexed originalCID, bytes32 optimizedCID);
    event OptimizationAccepted(bytes32 indexed cid, uint256 oldSize, uint256 newSize, uint256 efficiencyScore);
    event EfficiencyReward(address indexed agent, uint256 reward, uint256 efficiencyScore);
    event ContextArchived(bytes32 indexed cid);

    // ═══════════════════════════════════════════════════════════════
    // CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Register a new context node and start rent accrual
     */
    function registerContext(
        bytes32 ipfsCID,
        uint256 sizeBytes,
        uint256 initialDeposit
    ) external {
        require(contexts[ipfsCID].createdAt == 0, "Context already registered");
        require(sizeBytes > 0, "Invalid size");

        // Calculate required minimum deposit (30 days of rent)
        uint256 minDeposit = calculateRent(sizeBytes, 30 days);
        require(initialDeposit >= minDeposit, "Insufficient deposit");

        // Transfer deposit
        psiToken.transferFrom(msg.sender, address(this), initialDeposit);

        // Create context node
        contexts[ipfsCID] = ContextNode({
            ipfsCID: ipfsCID,
            sizeBytes: sizeBytes,
            createdAt: block.timestamp,
            lastRentPayment: block.timestamp,
            depositBalance: initialDeposit,
            owner: msg.sender,
            archived: false
        });

        totalStorageBytes += sizeBytes;

        emit ContextRegistered(ipfsCID, msg.sender, sizeBytes);
    }

    /**
     * @notice Calculate rent for a given size and duration
     */
    function calculateRent(uint256 sizeBytes, uint256 duration) public view returns (uint256) {
        // Daily rent = Size (GB) × Base Rate × Network Multiplier
        uint256 sizeGB = sizeBytes / 1e9;
        uint256 networkMultiplier = 1e18 + (totalStorageBytes * 1e18 / (storageCapGB * 1e9));
        uint256 dailyRent = (sizeGB * baseRatePerGBPerDay * networkMultiplier) / 1e18;
        return (dailyRent * duration) / 1 days;
    }

    /**
     * @notice Charge rent from deposit (called periodically or on-demand)
     */
    function chargeRent(bytes32 cid) public {
        ContextNode storage context = contexts[cid];
        require(context.createdAt > 0, "Context not found");
        require(!context.archived, "Context archived");

        uint256 elapsed = block.timestamp - context.lastRentPayment;
        uint256 rentDue = calculateRent(context.sizeBytes, elapsed);

        if (rentDue > context.depositBalance) {
            // Insufficient funds - archive context
            context.archived = true;
            totalStorageBytes -= context.sizeBytes;
            emit ContextArchived(cid);
            return;
        }

        context.depositBalance -= rentDue;
        context.lastRentPayment = block.timestamp;

        // Burn 50%, pool 50% for efficiency rewards
        psiToken.burn(rentDue / 2);
        efficiencyBonusPool += rentDue / 2;

        emit RentPaid(cid, rentDue);
    }

    /**
     * @notice Add more deposit to prevent archival
     */
    function topUpDeposit(bytes32 cid, uint256 amount) external {
        ContextNode storage context = contexts[cid];
        require(context.owner == msg.sender, "Not owner");
        require(!context.archived, "Context archived");

        psiToken.transferFrom(msg.sender, address(this), amount);
        context.depositBalance += amount;
    }

    /**
     * @notice Propose an optimized version of context
     */
    function proposeOptimization(
        bytes32 originalCID,
        bytes32 optimizedCID,
        uint256 optimizedSize
    ) external returns (uint256 taskId) {
        ContextNode storage original = contexts[originalCID];
        require(original.owner == msg.sender, "Not owner");
        require(!original.archived, "Context archived");
        require(optimizedSize < original.sizeBytes, "Not an optimization");

        // Create CRPC validation task
        // Validators will compare quality of original vs optimized
        taskId = crpcValidator.createTask(
            abi.encode(originalCID, optimizedCID),
            3,  // 3 validators
            1 days
        );

        optimizations[originalCID] = OptimizationProposal({
            originalCID: originalCID,
            optimizedCID: optimizedCID,
            originalSize: original.sizeBytes,
            optimizedSize: optimizedSize,
            qualityScore: 0,
            validated: false,
            accepted: false
        });

        emit OptimizationProposed(originalCID, optimizedCID);
    }

    /**
     * @notice Finalize optimization after CRPC validation
     */
    function finalizeOptimization(bytes32 originalCID, uint256 qualityScore) external {
        require(msg.sender == address(crpcValidator), "Only validator");

        OptimizationProposal storage proposal = optimizations[originalCID];
        require(!proposal.validated, "Already validated");

        proposal.qualityScore = qualityScore;
        proposal.validated = true;

        if (qualityScore >= qualityThreshold) {
            // Accept optimization
            proposal.accepted = true;

            ContextNode storage context = contexts[originalCID];
            uint256 oldSize = context.sizeBytes;

            // Update context to optimized version
            context.ipfsCID = proposal.optimizedCID;
            context.sizeBytes = proposal.optimizedSize;
            totalStorageBytes = totalStorageBytes - oldSize + proposal.optimizedSize;

            // Calculate efficiency score and rewards
            uint256 efficiencyScore = (qualityScore * proposal.originalSize) / proposal.optimizedSize;

            if (efficiencyScore > 10000) {  // Efficiency > 1.0
                // Calculate rebate (refund portion of accumulated rent)
                uint256 accumulatedRent = calculateRent(oldSize, block.timestamp - context.lastRentPayment);
                uint256 rebatePercent = 10000 - (10000 * 10000 / efficiencyScore);
                uint256 rebate = (accumulatedRent * rebatePercent) / 10000;

                // Calculate bonus from efficiency pool
                uint256 bonus = (efficiencyScore * 1e18) / 10000;  // Base bonus scaled by efficiency
                if (bonus > efficiencyBonusPool) bonus = efficiencyBonusPool;

                // Pay rewards
                context.depositBalance += rebate;  // Add rebate to deposit
                psiToken.transfer(context.owner, bonus);  // Direct bonus payment
                efficiencyBonusPool -= bonus;

                // Boost reputation
                reputationRegistry.recordFeedback(
                    bytes32(uint256(uint160(context.owner))),
                    bytes32(uint256(uint160(address(this)))),
                    int8(efficiencyScore / 1000),  // Efficiency score / 100 as reputation boost
                    "Context optimization efficiency reward"
                );

                emit EfficiencyReward(context.owner, rebate + bonus, efficiencyScore);
            }

            emit OptimizationAccepted(originalCID, oldSize, proposal.optimizedSize, efficiencyScore);
        }
    }

    /**
     * @notice Archive a context to stop rent (can't be unarchived)
     */
    function archiveContext(bytes32 cid) external {
        ContextNode storage context = contexts[cid];
        require(context.owner == msg.sender, "Not owner");
        require(!context.archived, "Already archived");

        // Refund remaining deposit
        uint256 refund = context.depositBalance;
        context.depositBalance = 0;
        context.archived = true;
        totalStorageBytes -= context.sizeBytes;

        if (refund > 0) {
            psiToken.transfer(msg.sender, refund);
        }

        emit ContextArchived(cid);
    }

    /**
     * @notice Get remaining days of rent coverage
     */
    function getRemainingDays(bytes32 cid) external view returns (uint256) {
        ContextNode storage context = contexts[cid];
        if (context.archived) return 0;

        uint256 dailyRent = calculateRent(context.sizeBytes, 1 days);
        if (dailyRent == 0) return type(uint256).max;

        return context.depositBalance / dailyRent;
    }
}
```

---

## 🎮 Game Theory Analysis

### Agent Strategies

**Strategy 1: Minimal Storage**
- Store only essential context
- Aggressive compression
- High efficiency scores
- **Outcome**: Low rent, high rewards, but may sacrifice some context richness

**Strategy 2: Comprehensive Storage**
- Store all details
- Minimal compression
- Low efficiency scores
- **Outcome**: High rent, rich context, but expensive

**Strategy 3: Adaptive Storage**
- Hot data: Detailed, recent, high-value
- Cold data: Summarized, compressed
- Temporal optimization
- **Outcome**: Balanced cost/quality, optimal for most agents

**Nash Equilibrium**: Agents converge on adaptive storage strategies that balance context quality with economic efficiency.

### Network Effects

**Positive Feedback Loop:**
1. Agent compresses context effectively
2. Earns efficiency rewards
3. Can afford more storage or reduce costs
4. Invests in better compression algorithms
5. Further improves efficiency
6. Network storage costs decrease
7. All agents benefit from lower base rates

**Alignment with Network Goals:**
- Individual optimization → Network efficiency
- Economic incentives → Technical innovation
- Storage rent → Sustainable network economics

---

## 📈 Economic Impact

### Revenue for Network

```
Daily Revenue = Σ(Context Size × Base Rate × Network Multiplier)
Annual Revenue = Daily Revenue × 365

Example:
- 1 PB total storage
- Base rate: 0.001 PSI/GB/day
- Network multiplier: 2x (50% capacity)
- Daily revenue: 1,000,000 GB × 0.001 × 2 = 2,000 PSI/day
- Annual revenue: 730,000 PSI/year (~$730k at $1/PSI)
```

### Cost for Agents

```
Annual Cost per Agent = Avg Context Size × Base Rate × 365 × Network Multiplier

Example (10 GB average):
- Base: 10 GB × 0.001 PSI/GB/day = 0.01 PSI/day
- Annual: 0.01 × 365 = 3.65 PSI/year (~$3.65)
- With 2x multiplier: 7.30 PSI/year (~$7.30)

But with 5x compression:
- Optimized: 2 GB × 0.001 × 365 × 2 = 1.46 PSI/year
- Plus efficiency rewards: ~5 PSI
- Net: -3.54 PSI (agent is PAID to optimize!)
```

### ROI for Compression Innovation

**Developer creates compression algorithm:**
- Achieves 10x compression at 98% quality
- Licenses to 1000 agents
- Each agent saves 90% of rent (e.g., 6.57 PSI/year)
- Developer takes 20% of savings: 1.31 PSI/agent/year
- Annual revenue: 1,310 PSI (~$1,310)

**This creates a market for compression innovation!**

---

## 🔬 Advanced Features

### 1. **Tiered Storage**

Different storage classes with different costs:

```
Hot Storage (IPFS):     1.0x rent, <1s latency
Warm Storage (Filecoin): 0.1x rent, <10s latency
Cold Storage (Arweave):  0.01x rent, ~60s latency
```

Agents can move old context to cheaper tiers.

### 2. **Storage Futures**

Agents can pre-purchase storage at locked-in rates:

```
Lock 1000 PSI for 1 year storage:
- Guaranteed rate regardless of network multiplier
- Hedges against storage price increases
- Network gets predictable revenue
```

### 3. **Shared Context Pools**

Multiple agents can co-own context:

```
10 agents share domain knowledge context:
- Each pays 1/10 of rent
- All benefit from shared compression efforts
- Cooperative efficiency bonuses
```

### 4. **Context Derivatives**

Agents can create "views" of context:

```
Original: Full dataset (1 GB)
View 1: Technical summary (10 MB)
View 2: Executive summary (1 MB)
View 3: FAQ format (5 MB)

Each view is independently rented but shares validation
```

---

## 🎯 Integration with Existing Systems

### With PsiToken
- Rent payments in PSI
- Efficiency rewards in PSI
- Burns create deflationary pressure
- Bonus pool funded by rent

### With ReputationRegistry
- Efficiency optimizations boost reputation
- High-reputation agents get rate discounts?
- Reputation-weighted quality scoring

### With CRPC Validation
- Quality validation for optimizations
- Prevents gaming the system
- Ensures information preservation
- Validators earn from optimization reviews

### With Harberger Tax NFTs
- Context nodes could be NFTs
- Always-for-sale if not actively maintained
- Prevents abandonment of valuable context
- Creator royalties on context transfers

---

## 🚀 Deployment Roadmap

### Phase 1: Basic Rent (Months 1-3)
- Deploy ContextStorageRegistry
- Implement simple size-based rent
- Basic deposit and payment system
- Manual archival

### Phase 2: Optimization Incentives (Months 4-6)
- Integrate CRPC quality validation
- Efficiency scoring and rewards
- Compression proposal system
- Automated quality testing

### Phase 3: Advanced Features (Months 7-12)
- Tiered storage classes
- Storage futures/hedging
- Shared context pools
- Context derivatives

### Phase 4: Market Maturation (Year 2+)
- Secondary market for optimized contexts
- Compression algorithm marketplace
- Governance of rent parameters
- Cross-chain storage federation

---

## 📊 Success Metrics

### Network Health
- Total storage bytes (lower is better with quality constant)
- Average compression ratio (higher is better)
- % of contexts optimized
- Efficiency reward distribution

### Agent Behavior
- Average rent per agent
- Optimization frequency
- Quality scores of optimizations
- Storage strategy diversity

### Economic Indicators
- Rent revenue vs efficiency payouts (should be balanced)
- PSI burn rate from rent
- Bonus pool sustainability
- Market price of compression services

---

## 🎓 Key Insights

### 1. **Storage is Not Free**
Making storage costs visible creates immediate optimization pressure

### 2. **Quality Must Be Verifiable**
CRPC validation prevents race-to-bottom compression that loses information

### 3. **Efficiency Should Be Rewarded**
Agents that compress well should profit, creating a positive innovation cycle

### 4. **Economic Density = Context Density**
The most valuable contexts are those with highest information per byte

### 5. **Cooperation Beats Individual Optimization**
Shared contexts and collaborative compression efforts yield best results

---

## 💭 Philosophical Alignment

This storage rent model embodies ΨNet's core values:

**Efficiency**: Rewards optimization and resource consciousness
**Quality**: Validates that compression preserves information
**Cooperation**: Shared contexts reduce costs for everyone
**Transparency**: All costs and rewards on-chain
**Sustainability**: Rent creates ongoing revenue for network operation
**Innovation**: Economic incentives drive technical advancement

**"The best context is not the largest, but the most dense."**

---

*Economic density = Context density. Every byte should earn its keep.*
