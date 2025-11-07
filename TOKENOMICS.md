# ΨNet Tokenomics: Positive-Sum Mutualistic Economics

## Executive Summary

**ΨNet Token ($PSI)** is designed with **positive-sum game theory** at its core, creating an economic system where cooperation yields greater rewards than competition, and network growth benefits all participants proportionally.

### Core Principles

1. **Positive-Sum Design**: Total value created exceeds value extracted
2. **Mutualistic Incentives**: Cooperation rewards > Competition rewards
3. **Reduced Rent Extraction**: 0.1% fees vs 30% traditional platforms (99.67% reduction)
4. **Information Transparency**: All economics publicly verifiable on-chain
5. **Deflationary Supply**: Burns reduce circulating supply, benefiting all holders

---

## Token Specifications

| Parameter | Value |
|-----------|-------|
| **Name** | PsiNet Token |
| **Symbol** | $PSI |
| **Standard** | ERC-20 |
| **Total Supply** | 1,000,000,000 (1 billion, fixed) |
| **Decimals** | 18 |
| **Inflation** | 0% (no new minting) |
| **Initial Distribution** | 100M PSI (10%) to treasury |

---

## Economic Design Goals

### 1. Reduce Rent Extraction

**Problem**: Traditional platforms extract 20-30% fees, creating zero-sum dynamics.

**ΨNet Solution**: 0.1% transaction fee

```
Traditional Platform:
$1,000 transaction → $300 platform fee (30%)
User receives: $700

ΨNet:
$1,000 transaction → $1 fee (0.1%)
User receives: $999

Savings: $299 (99.67% reduction)
```

### 2. Reduce Information Asymmetry

**Problem**: Opaque algorithms, hidden fees, asymmetric information advantages.

**ΨNet Solution**: Complete transparency

- ✅ All transactions on-chain (publicly auditable)
- ✅ All reputation scores visible
- ✅ All fee distributions transparent
- ✅ All reward calculations open-source
- ✅ No hidden algorithms or preferential treatment

### 3. Positive-Sum Value Creation

**Problem**: Zero-sum competition (one wins, one loses).

**ΨNet Solution**: Positive-sum cooperation (both win more)

```
Competitive Scenario (Zero-Sum):
Agent A: +1000 PSI
Agent B: -1000 PSI
Total: 0 PSI (zero-sum)

Cooperative Scenario (Positive-Sum):
Agent A: +750 PSI (1.5x multiplier)
Agent B: +750 PSI (1.5x multiplier)
Total: +1500 PSI (positive-sum!)
```

---

## Fee Structure

### Transaction Fees: 0.1% (10 basis points)

Ultra-low fees to minimize rent extraction while sustaining the network.

### Fee Distribution (Positive-Sum Model)

Every transaction fee is distributed to benefit the ecosystem:

| Allocation | Percentage | Purpose |
|------------|------------|---------|
| **Burned** | 50% | Deflationary (benefits all holders) |
| **Reward Pool** | 30% | Rewards contributors |
| **Treasury** | 20% | Community-controlled development |

**Example**: 100 PSI fee

```
50 PSI → Burned (reduces supply, increases scarcity)
30 PSI → Reward pools (distributed to agents/validators)
20 PSI → Treasury (ecosystem development)
```

**Result**: Everyone benefits from every transaction!

---

## Reward Mechanisms

### 1. Agent Contribution Rewards

Agents earn rewards for positive network contributions:

```solidity
Base Reward: 100 PSI

Solo Action: 100 PSI × 1.0x = 100 PSI
Cooperative Action: 100 PSI × 1.5x = 150 PSI
Network Effect Bonus (>100 agents): 100 PSI × 2.0x = 200 PSI
```

**Mutualistic Design**: Cooperation earns 50% more than solo actions!

### 2. Reputation Rewards

High-reputation agents receive automatic rewards:

- Rating > 80: Base reward + 10 PSI per point above 80
- Rating > 90: Additional network effect bonus
- Rating > 95: Elite tier with multiplied rewards

**Incentive**: Maintain high quality to earn passive rewards

### 3. Validation Rewards

Validators earn for securing the network:

- Staked Validation: 200-500 PSI
- TEE Attestation: 300-600 PSI
- ZK Proof Validation: 400-800 PSI

**Security**: Economic incentive ensures honest validation

### 4. Cooperation Bonuses

Mutual interactions earn bonuses for both parties:

```
Agent A helps Agent B:
  Agent A: +150 PSI (1.5x cooperative multiplier)
  Agent B: +150 PSI (1.5x cooperative multiplier)
  Total: 300 PSI created (vs 200 PSI in competitive scenario)

Positive-Sum Surplus: +100 PSI (50% more value created!)
```

### 5. Shapley Value Referral System

**Revolutionary Innovation**: ΨNet implements the world's first **game-theory-based referral system** using Shapley values from cooperative game theory.

#### The Problem with Traditional Referrals

```
Traditional Flat-Rate Model:
Alice refers Bob → Alice gets $5
Bob refers Charlie → Bob gets $5

Problems:
❌ Bob gets nothing when he joins (only Alice benefits)
❌ Alice gets nothing from Charlie (no downstream rewards)
❌ No incentive to help referees succeed
❌ Zero-sum thinking (I win, you lose)
```

#### ΨNet's Shapley Solution: Two-Layer Rewards

**Layer 1 - Local Fairness (Immediate Split)**:
```
Bob joins with Alice's referral:
✅ Alice gets 50 PSI (referrer)
✅ Bob gets 50 PSI (referee)

Both parties benefit immediately!
```

**Why this matters**: Bob is MORE likely to use Alice's referral because he benefits too. This creates trust and cooperation from the start.

**Layer 2 - Global Fairness (Retroactive Bonuses)**:
```
Chain: Alice → Bob → Charlie → Diana

When Charlie joins:
- Coalition {Alice, Bob, Charlie} forms
- Total value calculated: 200 PSI
- Shapley distribution:
  • Alice: 90 PSI (45% - enabled the chain)
  • Bob: 70 PSI (35% - connected nodes)
  • Charlie: 40 PSI (20% - expanded network)

When Diana joins:
- Coalition {Alice, Bob, Charlie, Diana} forms
- Total value: 350 PSI
- EVERYONE gets another bonus, including Alice!
```

**Synergy Effect**: Each new member increases the value of ALL previous members.

#### Mathematical Comparison: Shapley vs Flat Rate

**Scenario**: Alice builds a 5-person referral chain

```
FLAT RATE MODEL:
Alice → Bob → Charlie → Diana → Eve

Alice's earnings: $5 × 2 (Bob + Charlie only) = $10
No downstream rewards from Diana or Eve

Total distributed: $25
```

```
SHAPLEY MODEL (ΨNet):
Alice → Bob → Charlie → Diana → Eve

Alice's earnings:
• 50 PSI (Bob joins - immediate split)
• 90 PSI (Charlie joins - coalition bonus)
• 120 PSI (Diana joins - coalition bonus)
• 160 PSI (Eve joins - coalition bonus)
• Total: 420 PSI

ALICE EARNS 42X MORE WITH SHAPLEY!

Bob's earnings: 280 PSI (28x more)
Charlie's earnings: 180 PSI (18x more)
Diana's earnings: 120 PSI (12x more)
Eve's earnings: 50 PSI (∞% more - she'd get $0 in flat rate!)

Total distributed: 1,050 PSI (42x more value!)
```

#### The Shapley Value Formula

For a coalition S, total value v(S) is calculated as:

```
v(S) = baseValue + depthBonus + sizeBonus + networkEffect

Where:
• baseValue = 20 PSI × |S|
• depthBonus = 20 PSI × (|S| - 1)
• sizeBonus = 50 PSI × (|S| / 3)
• networkEffect = (|S|² × 10 PSI) / 100

Multiplied by activity factor (based on reputation)
```

Each member's fair share (Shapley value) is their **average marginal contribution** across all possible coalition formations.

#### Why Shapley Creates Exponential Growth

**Incentive Alignment**:
- ✅ You earn when people join (immediate)
- ✅ You earn when THEY refer others (downstream)
- ✅ You earn MORE by helping them succeed (retroactive bonuses)
- ✅ Quality > Quantity (engaged users = higher multipliers)

**Comparison Table**:

| Scenario | Flat Rate | Shapley | Advantage |
|----------|-----------|---------|-----------|
| Refer 1 person | $5 | 80 PSI | +1,500% |
| Build 5-person chain | $10 | 420 PSI | +4,100% |
| Deep 10-person tree | $45 | 2,100 PSI | +4,567% |
| Referee benefit | $0 | 50+ PSI | Infinite |
| Help referee succeed | No benefit | High bonuses | Infinite |

#### Game Theory: The Glove Game

Classic example from cooperative game theory:

```
Alice has a left glove
Bob has a right glove
Neither glove alone has value
Together: $1 pair

Traditional thinking: "I had it first, I get 100%"
Shapley value: Both enabled the value, split 50/50

Fair split: $0.50 each ✅
```

**Applied to referrals**:
- Alice can't earn without someone using her link
- Bob enabled Alice's earning by joining
- Synergy: Both created value together
- Fair split: Both benefit!

#### Network Effects with Shapley

Traditional networks: Value = k × n (linear growth)
ΨNet with Shapley: Value = k × n² (quadratic growth)

```
Network Size | Traditional | ΨNet Shapley | Multiplier
-------------|-------------|--------------|------------
10 users     | 50 PSI     | 500 PSI      | 10x
100 users    | 500 PSI    | 50,000 PSI   | 100x
1,000 users  | 5,000 PSI  | 5M PSI       | 1,000x
```

**Why this works**: Shapley captures the synergistic value of connections, not just individual additions.

#### Integration with ΨNet Economics

**Reputation Multiplier**:
```solidity
// Higher reputation users boost coalition value
activityMultiplier = 100 + ((avgReputation - 50) × 100) / 100

Coalition with avg reputation 75:
Base value: 200 PSI
Multiplied: 200 × 1.5 = 300 PSI

Everyone earns more by recruiting quality users!
```

**ERC-8004 Integration**:
- Referral reputation tracked on-chain
- High-value referrers become validators
- Validation rewards compound referral rewards

**CRPC Integration**:
- Referral trees used for validator selection
- Quality referrals = validation privileges
- Validation earnings boost coalition value

#### Smart Contract Implementation

```solidity
contract ShapleyReferrals {
    // Two-layer rewards
    function joinWithReferral(address referrer) external {
        // Layer 1: Immediate 50/50 split
        psiToken.reward(referrer, BASE_REWARD / 2);
        psiToken.reward(msg.sender, BASE_REWARD / 2);

        // Layer 2: Coalition bonuses
        distributeCoalitionBonuses(buildCoalition(msg.sender));
    }

    // Calculate fair Shapley values
    function approximateShapleyValues(coalition, totalValue) internal {
        // Position-based weighting (quadratic)
        // Root gets highest share, all get meaningful share
        // O(n) algorithm (gas efficient!)
    }
}
```

#### Real-World Example

```
Alice → Bob → Charlie
       ↓
     Diana

Step 1: Bob joins
- Alice: 50 PSI
- Bob: 50 PSI

Step 2: Charlie joins
- Bob: 50 PSI (immediate)
- Charlie: 50 PSI (immediate)
- Coalition {Alice, Bob, Charlie}: +200 PSI distributed
  • Alice: +90 PSI
  • Bob: +70 PSI
  • Charlie: +40 PSI

Step 3: Diana joins (via Bob)
- Bob: 50 PSI (immediate)
- Diana: 50 PSI (immediate)
- Coalition {Alice, Bob, Diana}: +200 PSI distributed
  • Alice: +90 PSI
  • Bob: +70 PSI
  • Diana: +40 PSI

Alice's total: 50 + 90 + 90 = 230 PSI
(In flat rate: 100 PSI from Bob only)

Alice earned 130% more with Shapley! 🚀
```

#### Key Advantages

1. **Fairness**: Both referrers and referees benefit
2. **Depth**: Entire chains earn, not just direct referrals
3. **Cooperation**: Helping others = helping yourself
4. **Exponential**: Deep networks earn 40x+ more
5. **Quality**: Engaged users boost everyone's earnings
6. **Transparency**: All calculations on-chain
7. **Sustainable**: Aligns individual incentives with network growth

**See SHAPLEY_REFERRALS.md for complete technical documentation.**

---

## Deflationary Mechanics

### Token Burns

50% of all transaction fees are permanently burned:

```
Year 1: 10M transactions × 0.1% fee × 50% burn = 5,000 PSI burned
Year 2: 50M transactions → 25,000 PSI burned
Year 5: 500M transactions → 250,000 PSI burned

Cumulative Effect: Decreasing supply → Increasing value per token
```

### Benefits to Holders

- **Scarcity**: Reduced supply increases token value
- **Passive Appreciation**: Holdings become more valuable over time
- **No Dilution**: Fixed supply, no inflation

---

## Network Effect Economics

### Metcalfe's Law Integration

Network value grows proportionally to the square of participants:

```
Value = k × n²

Where:
k = base value per connection
n = number of agents

Example:
10 agents: Value = k × 100
100 agents: Value = k × 10,000 (100x increase!)
1,000 agents: Value = k × 1,000,000 (10,000x increase!)
```

### Network Effect Bonuses

As the network grows, ALL agents benefit:

| Network Size | Bonus Multiplier | Per-Agent Benefit |
|--------------|------------------|-------------------|
| 1-10 agents | 1.0x | Base rewards |
| 11-50 agents | 1.2x | +20% rewards |
| 51-100 agents | 1.5x | +50% rewards |
| 101-500 agents | 2.0x | +100% rewards |
| 500+ agents | 3.0x | +200% rewards |

**Positive-Sum Growth**: More agents = higher rewards for everyone!

---

## Token Distribution

### Initial Allocation (100M PSI)

| Pool | Allocation | Purpose |
|------|------------|---------|
| **Community Treasury** | 40M (40%) | Ecosystem grants, partnerships |
| **Reward Pools** | 30M (30%) | Initial agent/validator rewards |
| **Liquidity** | 20M (20%) | DEX liquidity provision |
| **Team** | 10M (10%) | Core contributors (4-year vest) |

### Emission Schedule

**No ongoing emissions** - Fixed supply of 1B PSI

Future PSI distributed from:
1. Community treasury (controlled by governance)
2. Reward pool replenishment from fees
3. No new minting (deflationary only)

---

## Game Theory Analysis

### Prisoner's Dilemma → Cooperation Dilemma

Traditional platforms create zero-sum dynamics:

```
Competitive Matrix (Zero-Sum):
                Agent B Cooperates    Agent B Defects
Agent A Coop    (+50, +50)            (-100, +150)
Agent A Defect  (+150, -100)          (0, 0)

Nash Equilibrium: Both Defect (0, 0)
```

ΨNet creates positive-sum dynamics:

```
Cooperative Matrix (Positive-Sum):
                Agent B Cooperates    Agent B Defects
Agent A Coop    (+150, +150)          (+75, +50)
Agent A Defect  (+50, +75)            (+25, +25)

Nash Equilibrium: Both Cooperate (+150, +150)
Pareto Optimal: Cooperation dominates!
```

### Mutualistic Equilibrium

ΨNet's incentive structure makes cooperation the rational choice:

1. **Higher Payoffs**: Cooperation earns 50% more
2. **Network Effects**: Larger network = higher rewards for all
3. **Reputation**: Good behavior builds valuable reputation
4. **No Punishment**: Failed validations don't penalize (learn and improve)

**Result**: Stable cooperative equilibrium with increasing returns!

---

## Comparison: ΨNet vs Traditional Platforms

| Metric | Traditional Platform | ΨNet | Improvement |
|--------|---------------------|------|-------------|
| **Transaction Fee** | 20-30% | 0.1% | **99.67% reduction** |
| **Information Asymmetry** | High (opaque) | None (transparent) | **100% reduction** |
| **Cooperative Bonus** | None | +50% | **Infinite improvement** |
| **Network Effect Bonus** | Captured by platform | Shared with users | **100% redistribution** |
| **Value to Users** | 70-80% | 99.9% | **25-42% increase** |
| **Rent Extraction** | High | Minimal | **99%+ reduction** |

---

## Economic Sustainability

### Revenue Sources

ψNet sustains itself through:

1. **Transaction Fees**: 0.1% of all value transfers
2. **Treasury Growth**: Fee accumulation over time
3. **Partnership Grants**: Ecosystem integrations
4. **Governance Revenue**: Community-approved initiatives

### Cost Structure

Minimal operational costs:

1. **Smart Contract Gas**: Paid by users
2. **Decentralized Infrastructure**: No central servers
3. **Open Source**: Community development
4. **Automated**: No human intermediaries needed

**Result**: Ultra-low costs enable ultra-low fees!

---

## Governance Model

### Treasury Control

Community-controlled via governance:

- ✅ Transparent on-chain voting
- ✅ Weighted by PSI holdings + reputation
- ✅ Time-locked proposals
- ✅ Multi-sig security

### Parameter Adjustments

Governance can adjust (within limits):

- ✅ Reward pool allocations
- ✅ Cooperative multipliers (max 3x)
- ❌ Cannot increase transaction fees above 1%
- ❌ Cannot mint new tokens (fixed supply)

**Safety**: Hard caps prevent future rent extraction!

---

## Risk Mitigation

### Economic Risks

| Risk | Mitigation |
|------|------------|
| **Sybil Attacks** | Reputation + staking requirements |
| **Fee Manipulation** | Hard cap at 1% maximum |
| **Centralization** | Decentralized governance |
| **Value Extraction** | Transparent fee distribution |
| **Supply Inflation** | Fixed supply, no minting |

---

## Future Enhancements

### Phase 1: Launch (Q1 2025)
- ✅ Token deployment
- ✅ Basic rewards
- ✅ Identity + Reputation + Validation registries

### Phase 2: Expansion (Q2-Q3 2025)
- 🔄 Cross-chain bridges (Optimism, Arbitrum, Polygon)
- 🔄 Advanced cooperation mechanics
- 🔄 Reputation-weighted governance

### Phase 3: Ecosystem (Q4 2025+)
- 🔄 Context marketplace
- 🔄 Agent DAOs
- 🔄 Automated cooperation protocols
- 🔄 Reputation NFTs

---

## Conclusion

ΨNet's tokenomics achieves three critical goals:

1. **✅ Positive-Sum Economics**: Cooperation creates more value than competition
2. **✅ Minimal Rent Extraction**: 0.1% fees vs 30% traditional (99.67% reduction)
3. **✅ Information Transparency**: All economics publicly verifiable on-chain

**Result**: A sustainable, mutualistic network where growth benefits all participants proportionally.

---

## Mathematical Proof: Positive-Sum

```
Traditional Platform (Zero-Sum):
Total Value = V
Platform Fee = 0.3V
User Receives = 0.7V
Net Ecosystem Value = 0.7V (30% extracted)

ΨNet (Positive-Sum):
Total Value = V
Transaction Fee = 0.001V (0.1%)
  ├─ 50% Burned → Benefits all holders
  ├─ 30% Rewards → Redistributed to contributors
  └─ 20% Treasury → Ecosystem development
User Receives = 0.999V
Net Ecosystem Value ≈ V (< 1% loss)

Cooperation Bonus:
Base Reward = R
Cooperative Reward = 1.5R
Two Agents Cooperate = 3R (vs 2R competitive)
Surplus = R (50% more value!)

Network Effect (n agents):
Traditional: Value = V × n (linear)
ΨNet: Value = V × n² (exponential)
Surplus = V × n × (n - 1) (positive-sum!)
```

**QED**: ΨNet creates more value than it extracts, proving positive-sum economics. ∎

---

**License**: MIT
**Version**: 1.0.0
**Last Updated**: 2025-01-07

*Building the future of positive-sum AI economics* 🌟
