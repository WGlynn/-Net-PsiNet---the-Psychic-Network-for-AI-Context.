# Context Marketplace Quality Incentive System

**Date**: 2025-11-07
**Purpose**: Design economic mechanisms to promote high-quality, compressed, well-engineered context
**Status**: PARTIALLY IMPLEMENTED

**Implementation Status**:
- ✅ Quality-weighted pricing: **IMPLEMENTED** in SkillRegistry.sol
- ⏳ Compression bounties: Design complete, awaiting implementation
- ⏳ Reliability bonds: Design complete, awaiting implementation
- ⏳ Quality badges: Design complete, awaiting implementation
- ⏳ Discovery ranking: Design complete, awaiting implementation

---

## Current Implementation: Quality-Weighted Pricing in SkillRegistry

### Overview

The `SkillRegistry.sol` contract now includes quality-weighted pricing for skill licensing. This creates immediate economic incentives for high-quality, well-used skills.

### Implementation Details

**Location**: `contracts/SkillRegistry.sol:207-228`

**Function**: `getQualityWeightedPrice(uint256 skillId)`

```solidity
function getQualityWeightedPrice(uint256 skillId) public view returns (uint256) {
    Skill storage skill = skills[skillId];
    uint256 basePrice = assets[skillId].selfAssessedValue / 10; // 10% of value

    // Quality multiplier (50-150%)
    uint256 qualityMultiplier = 150 - (skill.qualityScore / 2);

    // Usage/reliability bonus (80-120%)
    uint256 usageMultiplier = 120;
    if (skill.usageCount > 100) {
        usageMultiplier = 80; // Popular, proven skills get discount
    } else if (skill.usageCount > 10) {
        usageMultiplier = 100;
    }

    // Apply multipliers
    uint256 effectivePrice = (basePrice * qualityMultiplier * usageMultiplier) / (100 * 100);

    return effectivePrice;
}
```

### Price Examples

**Scenario 1: High Quality, Popular Skill**
- Quality Score: 100
- Usage Count: 150
- Base Price: 1000 PSI
- Quality Multiplier: 0.5x (excellent quality)
- Usage Multiplier: 0.8x (proven popularity)
- **Final Price**: 400 PSI (60% discount!)

**Scenario 2: Low Quality, Unused Skill**
- Quality Score: 20
- Usage Count: 0
- Base Price: 1000 PSI
- Quality Multiplier: 1.4x (poor quality)
- Usage Multiplier: 1.2x (unproven)
- **Final Price**: 1680 PSI (68% premium!)

**Scenario 3: Medium Quality, Some Usage**
- Quality Score: 60
- Usage Count: 25
- Base Price: 1000 PSI
- Quality Multiplier: 1.2x
- Usage Multiplier: 1.0x
- **Final Price**: 1200 PSI (20% premium)

### Market Dynamics

This creates a self-reinforcing quality cycle:

1. **High quality** → Lower price → More licenses → More usage
2. **More usage** → Lower price (proven track record) → Even more licenses
3. **More licenses** → More revenue despite lower per-license price
4. **Low quality** → Higher price → Fewer licenses → Less usage → Even higher relative price

**Result**: High-quality skills earn more total revenue through volume, low-quality skills earn less.

### Integration

The quality-weighted pricing is automatically used in:
- `licenseSkill()` - All skill licenses use quality pricing
- Frontend can call `getQualityWeightedPrice()` to show users the effective price before purchase

---

## Problem Statement

The current ΨNet protocol lacks specific incentives for:
1. **Compression**: Efficient, concise context is not rewarded over verbose context
2. **Engineering Quality**: Well-structured, cleanly formatted context has no advantage
3. **Reliability**: Most reliable context providers don't get preferential treatment

**Risk**: Without these incentives, the marketplace will fill with low-quality, bloated context.

---

## Design Principles

### 1. Quality over Quantity
- Smaller, high-quality context should earn more per byte than large, low-quality context
- Compression ratio should be a first-class metric

### 2. Proven Reliability
- Context with consistent validation success should command premium prices
- Unreliable context should be penalized, not just ignored

### 3. Engineering Excellence
- Well-structured context (proper metadata, tagged, versioned) should be discoverable
- Market should naturally surface best-engineered solutions

---

## Proposed Mechanisms

### Mechanism #1: Quality-Weighted Pricing

**Add to Context Pricing Contract:**

```solidity
// contracts/ContextMarketplace.sol

struct ContextListing {
    bytes32 contextHash;
    address provider;
    uint256 basePrice;
    uint256 sizeInBytes;
    uint256 qualityScore; // 0-100 from CRPC validation
    uint256 reliabilityScore; // 0-100 from historical performance
    uint256 compressionRatio; // Efficiency metric
    uint256 totalUsage;
    uint256 successfulValidations;
    uint256 failedValidations;
}

/**
 * @dev Calculate effective price based on quality metrics
 * Better quality = lower effective price = more competitive
 */
function getEffectivePrice(uint256 listingId) public view returns (uint256) {
    ContextListing memory listing = contextListings[listingId];

    // Base price per byte
    uint256 pricePerByte = listing.basePrice / listing.sizeInBytes;

    // Quality multiplier (0.5x to 1.5x)
    // Quality 100 → 0.5x, Quality 50 → 1x, Quality 0 → 1.5x
    uint256 qualityMultiplier = 150 - (listing.qualityScore / 2);

    // Reliability multiplier (0.6x to 1.4x)
    // Reliability 100 → 0.6x, Reliability 50 → 1x, Reliability 0 → 1.4x
    uint256 reliabilityMultiplier = 140 - (listing.reliabilityScore * 8 / 10);

    // Compression bonus (0.7x to 1.3x)
    // High compression (10x) → 0.7x
    // Low compression (1x) → 1.3x
    uint256 compressionMultiplier = 130 - (listing.compressionRatio * 6 / 100);
    if (compressionMultiplier < 70) compressionMultiplier = 70;
    if (compressionMultiplier > 130) compressionMultiplier = 130;

    // Apply all multipliers
    uint256 effectivePrice = (pricePerByte * qualityMultiplier * reliabilityMultiplier * compressionMultiplier) / (100 * 100 * 100);

    return effectivePrice * listing.sizeInBytes;
}
```

**Impact**:
- High quality + high reliability + good compression = 0.5 × 0.6 × 0.7 = **0.21x** (79% discount!)
- Low quality + low reliability + poor compression = 1.5 × 1.4 × 1.3 = **2.73x** (173% premium)

---

### Mechanism #2: Compression Bounties

**Incentivize creating compressed versions of existing context:**

```solidity
// contracts/CompressionBounties.sol

struct CompressionBounty {
    bytes32 originalContextHash;
    uint256 originalSize;
    uint256 bountyAmount;
    uint256 targetCompressionRatio; // e.g., 5x = compress to 20%
    address sponsor;
    bool claimed;
}

/**
 * @dev Submit compressed version and claim bounty
 */
function claimCompressionBounty(
    uint256 bountyId,
    bytes32 compressedContextHash,
    uint256 compressedSize,
    bytes calldata compressionProof
) external {
    CompressionBounty storage bounty = bounties[bountyId];
    require(!bounty.claimed, "Already claimed");

    uint256 compressionRatio = bounty.originalSize / compressedSize;
    require(compressionRatio >= bounty.targetCompressionRatio, "Insufficient compression");

    // Verify compressed version contains same information (via CRPC)
    require(_validateCompressedContext(
        bounty.originalContextHash,
        compressedContextHash,
        compressionProof
    ), "Quality verification failed");

    // Award bounty
    bounty.claimed = true;
    psiToken.transfer(msg.sender, bounty.bountyAmount);

    // Bonus for exceeding target
    if (compressionRatio > bounty.targetCompressionRatio * 2) {
        uint256 bonus = bounty.bountyAmount / 2;
        psiToken.mint(msg.sender, bonus);
    }

    emit BountyClaimed(bountyId, msg.sender, compressionRatio);
}
```

**Use Cases**:
- Protocol sponsors bounties for compressing popular but bloated context
- Users sponsor bounties for specific context they need compressed
- Automated bounties for contexts exceeding size thresholds

---

### Mechanism #3: Reliability Bonds

**Stake tokens on context quality, earn returns for reliable context:**

```solidity
// contracts/ReliabilityBonds.sol

struct ReliabilityBond {
    bytes32 contextHash;
    address provider;
    uint256 bondAmount;
    uint256 stakedAt;
    uint256 successCount;
    uint256 failureCount;
    uint256 accumulatedRewards;
}

/**
 * @dev Stake PSI tokens as reliability bond
 * High reliability earns staking rewards
 * Low reliability leads to slashing
 */
function stakeBond(bytes32 contextHash, uint256 amount) external {
    require(amount >= MIN_BOND_AMOUNT, "Insufficient bond");

    psiToken.transferFrom(msg.sender, address(this), amount);

    bonds[contextHash] = ReliabilityBond({
        contextHash: contextHash,
        provider: msg.sender,
        bondAmount: amount,
        stakedAt: block.timestamp,
        successCount: 0,
        failureCount: 0,
        accumulatedRewards: 0
    });

    emit BondStaked(contextHash, msg.sender, amount);
}

/**
 * @dev Calculate reliability score and rewards
 */
function calculateReliability(bytes32 contextHash) public view returns (
    uint256 score,
    uint256 rewards,
    uint256 slashAmount
) {
    ReliabilityBond memory bond = bonds[contextHash];
    uint256 totalValidations = bond.successCount + bond.failureCount;

    if (totalValidations == 0) return (50, 0, 0); // Neutral starting score

    // Score = (successes / total) * 100
    score = (bond.successCount * 100) / totalValidations;

    // Rewards for high reliability (>90%)
    if (score > 90) {
        uint256 stakingPeriod = block.timestamp - bond.stakedAt;
        // 20% APR for 90%+ reliability
        rewards = (bond.bondAmount * 20 * stakingPeriod) / (365 days * 100);
    }

    // Slashing for low reliability (<50%)
    if (score < 50) {
        // Slash 1% per validation failure below 50%
        uint256 deficitPercent = 50 - score;
        slashAmount = (bond.bondAmount * deficitPercent) / 100;
    }

    return (score, rewards, slashAmount);
}

/**
 * @dev Record validation result and update reliability
 */
function recordValidation(bytes32 contextHash, bool success) external onlyValidator {
    ReliabilityBond storage bond = bonds[contextHash];

    if (success) {
        bond.successCount++;

        // Reward for each successful validation
        uint256 reward = VALIDATION_REWARD_BASE;
        if (bond.successCount > 100) {
            reward = reward * 2; // 2x rewards for proven track record
        }

        bond.accumulatedRewards += reward;
    } else {
        bond.failureCount++;

        // Check if reliability dropped below threshold
        (uint256 score, , uint256 slashAmount) = calculateReliability(contextHash);

        if (slashAmount > 0) {
            // Slash bond
            bond.bondAmount -= slashAmount;

            // Distribute slashed amount to successful validators
            distributionPool += slashAmount;

            emit BondSlashed(contextHash, bond.provider, slashAmount, score);
        }
    }

    emit ValidationRecorded(contextHash, success, bond.successCount, bond.failureCount);
}
```

**Benefits**:
- Providers stake capital on their context quality
- High reliability earns 20% APR on staked amount
- Low reliability leads to slashing (skin in the game)
- Creates financial incentive for quality

---

### Mechanism #4: Engineering Quality Badges

**NFT badges for well-engineered context:**

```solidity
// contracts/QualityBadges.sol

enum BadgeType {
    COMPRESSED_MASTER,    // Context with 10x+ compression
    RELIABILITY_CHAMPION, // 95%+ reliability, 100+ validations
    METADATA_EXCELLENCE,  // Perfect metadata, tagging, versioning
    FAST_RETRIEVAL,       // Sub-100ms average retrieval time
    SEMANTIC_CLARITY      // High semantic coherence score
}

struct Badge {
    BadgeType badgeType;
    uint256 issuedAt;
    bytes32 contextHash;
    uint256 metricValue; // e.g., compression ratio, reliability %
}

mapping(address => Badge[]) public providerBadges;
mapping(BadgeType => uint256) public badgeRewardMultipliers;

/**
 * @dev Award badge for exceptional context quality
 */
function awardBadge(
    address provider,
    BadgeType badgeType,
    bytes32 contextHash,
    uint256 metricValue
) external onlyRole(BADGE_ISSUER_ROLE) {
    // Verify provider meets badge criteria
    require(_verifyBadgeCriteria(provider, badgeType, contextHash, metricValue),
        "Badge criteria not met");

    Badge memory newBadge = Badge({
        badgeType: badgeType,
        issuedAt: block.timestamp,
        contextHash: contextHash,
        metricValue: metricValue
    });

    providerBadges[provider].push(newBadge);

    // Mint NFT badge
    _mintBadgeNFT(provider, badgeType);

    // Award PSI bonus
    uint256 bonus = BADGE_BONUS_AMOUNT * badgeRewardMultipliers[badgeType];
    psiToken.mint(provider, bonus);

    emit BadgeAwarded(provider, badgeType, contextHash, metricValue);
}

/**
 * @dev Get provider's quality multiplier based on badges
 */
function getProviderQualityMultiplier(address provider) public view returns (uint256) {
    Badge[] memory badges = providerBadges[provider];

    uint256 multiplier = 100; // 1x base

    for (uint256 i = 0; i < badges.length; i++) {
        // Each badge adds 10% boost
        multiplier += 10;

        // Recent badges (< 90 days) add extra 5%
        if (block.timestamp - badges[i].issuedAt < 90 days) {
            multiplier += 5;
        }
    }

    // Cap at 3x
    if (multiplier > 300) multiplier = 300;

    return multiplier;
}
```

**Badge Criteria**:
- **COMPRESSED_MASTER**: Achieve 10x compression on 10+ contexts
- **RELIABILITY_CHAMPION**: 95%+ success rate over 100+ validations
- **METADATA_EXCELLENCE**: Perfect metadata score across 50+ contexts
- **FAST_RETRIEVAL**: Sub-100ms retrieval on 100+ queries
- **SEMANTIC_CLARITY**: 90+ coherence score from semantic analysis

---

### Mechanism #5: Discovery & Ranking

**Marketplace surfaces highest quality context first:**

```solidity
// contracts/ContextDiscovery.sol

struct DiscoveryScore {
    uint256 qualityScore;        // From CRPC validation
    uint256 reliabilityScore;    // From historical performance
    uint256 compressionScore;    // Efficiency metric
    uint256 providerReputation;  // From ReputationRegistry
    uint256 usageScore;          // Popularity metric
    uint256 freshnessScore;      // Recent updates
    uint256 badgeBonus;          // Provider's quality badges
}

/**
 * @dev Calculate comprehensive discovery score for ranking
 */
function calculateDiscoveryScore(bytes32 contextHash) public view returns (uint256) {
    ContextListing memory listing = marketplace.getContextListing(contextHash);
    ReliabilityBond memory bond = reliabilityBonds.getBond(contextHash);

    DiscoveryScore memory score;

    // Quality (30% weight)
    score.qualityScore = listing.qualityScore * 30;

    // Reliability (25% weight)
    (uint256 reliabilityPercent, ,) = reliabilityBonds.calculateReliability(contextHash);
    score.reliabilityScore = reliabilityPercent * 25;

    // Compression (15% weight)
    // Higher compression = better score
    uint256 compressionBonus = listing.compressionRatio * 15 / 10;
    if (compressionBonus > 150) compressionBonus = 150; // Cap at 10x compression
    score.compressionScore = compressionBonus;

    // Provider reputation (15% weight)
    (uint256 repScore,) = reputationRegistry.getReputationScore(
        uint256(uint160(listing.provider))
    );
    score.providerReputation = (repScore * 15) / 100; // Normalize from 0-10000 to 0-150

    // Usage/popularity (10% weight)
    score.usageScore = (listing.totalUsage * 10) / 100;
    if (score.usageScore > 100) score.usageScore = 100; // Cap

    // Freshness (5% weight)
    uint256 age = block.timestamp - listing.lastUpdated;
    if (age < 7 days) {
        score.freshnessScore = 50; // Recent update bonus
    } else if (age < 30 days) {
        score.freshnessScore = 25;
    } else {
        score.freshnessScore = 0;
    }

    // Badge bonus (up to 3x multiplier)
    uint256 badgeMultiplier = qualityBadges.getProviderQualityMultiplier(listing.provider);
    score.badgeBonus = badgeMultiplier - 100; // Bonus above 1x

    // Total score
    uint256 totalScore = score.qualityScore +
                        score.reliabilityScore +
                        score.compressionScore +
                        score.providerReputation +
                        score.usageScore +
                        score.freshnessScore;

    // Apply badge multiplier
    totalScore = (totalScore * badgeMultiplier) / 100;

    return totalScore;
}

/**
 * @dev Search and rank contexts by quality
 */
function searchContexts(
    string calldata query,
    uint256 minQualityScore,
    uint256 limit
) external view returns (bytes32[] memory rankedResults) {
    // Get matching contexts
    bytes32[] memory matches = _semanticSearch(query);

    // Score each match
    uint256[] memory scores = new uint256[](matches.length);
    for (uint256 i = 0; i < matches.length; i++) {
        scores[i] = calculateDiscoveryScore(matches[i]);
    }

    // Filter by minimum quality
    uint256 qualifiedCount = 0;
    for (uint256 i = 0; i < matches.length; i++) {
        ContextListing memory listing = marketplace.getContextListing(matches[i]);
        if (listing.qualityScore >= minQualityScore) {
            qualifiedCount++;
        }
    }

    // Sort by score (descending)
    rankedResults = new bytes32[](qualifiedCount > limit ? limit : qualifiedCount);
    uint256[] memory sortedScores = _quickSort(scores);

    uint256 resultIdx = 0;
    for (uint256 i = 0; i < sortedScores.length && resultIdx < limit; i++) {
        ContextListing memory listing = marketplace.getContextListing(matches[i]);
        if (listing.qualityScore >= minQualityScore) {
            rankedResults[resultIdx] = matches[i];
            resultIdx++;
        }
    }

    return rankedResults;
}
```

---

## Economic Incentive Summary

### For Context Providers

**High Quality Context Earns**:
- ✅ 79% lower effective price (more competitive)
- ✅ 20% APR on reliability bonds
- ✅ Compression bounties (up to 2x bonus)
- ✅ Quality badges with 10-15% reward boost per badge
- ✅ Top discovery ranking (more sales)
- ✅ Provider reputation boost

**Low Quality Context Faces**:
- ❌ 173% higher effective price (less competitive)
- ❌ Bond slashing (up to 50% of stake)
- ❌ No badges or bonuses
- ❌ Bottom of discovery ranking (no visibility)
- ❌ Reputation penalties

### For Context Consumers

**Benefits**:
- ✅ Pay less for better quality (quality discount)
- ✅ Easy discovery of best context via ranking
- ✅ Reliability scores reduce risk
- ✅ Compression means faster retrieval
- ✅ Can sponsor compression bounties

---

## Implementation Phases

### Phase 1: Quality Metrics (2-3 months)
- Implement quality-weighted pricing
- Add compression ratio tracking
- Build reliability scoring system
- **Deliverables**: ContextMarketplace.sol, ReliabilityBonds.sol

### Phase 2: Incentive Mechanisms (2-3 months)
- Deploy compression bounties
- Implement badge system
- Create discovery ranking algorithm
- **Deliverables**: CompressionBounties.sol, QualityBadges.sol, ContextDiscovery.sol

### Phase 3: Market Testing (3-4 months)
- Deploy to testnet
- Observe market behavior
- Tune multipliers and thresholds
- Gather user feedback

### Phase 4: Mainnet Launch (1-2 months)
- Professional audit
- Gradual rollout
- Monitor metrics
- Iterate on incentives

---

## Key Metrics to Track

**Quality Metrics**:
- Average compression ratio across marketplace
- % of contexts with 90%+ reliability
- Distribution of quality scores
- Badge acquisition rate

**Economic Metrics**:
- Price spread between high/low quality
- Volume of compression bounties claimed
- Total value locked in reliability bonds
- Revenue to high-quality vs low-quality providers

**User Metrics**:
- Context search success rate
- User satisfaction scores
- Repeat purchase rate
- Average retrieval time

---

## Risk Mitigation

### Risk: Gaming the System

**Mitigation**:
- CRPC validation prevents fake quality scores
- Reliability bonds have skin-in-the-game
- Badges require sustained performance (not one-time)
- Multiple independent metrics (hard to game all)

### Risk: Market Manipulation

**Mitigation**:
- Quality multipliers are capped
- Slashing discourages bad behavior
- Transparent on-chain metrics
- Community governance for parameter changes

### Risk: Centralization

**Mitigation**:
- No permissioned badge issuance (algorithmically verified)
- Anyone can stake reliability bonds
- Open marketplace (no gatekeeping)
- Decentralized validation via CRPC

---

## Comparison to Current State

| Metric | Current (Phase 0) | With Quality Incentives |
|--------|-------------------|------------------------|
| Quality discrimination | None | 79% price advantage |
| Reliability tracking | Basic reputation | Bonded + slashing |
| Compression incentive | None | Bounties + pricing |
| Discovery | Random/chronological | Quality-ranked |
| Provider rewards | Flat | Performance-based |
| Consumer experience | Hit-or-miss | Consistent quality |

---

## Next Steps

1. **Review & Feedback**
   - Stakeholder review of mechanisms
   - Economic modeling of incentives
   - Security analysis

2. **Prototype Development**
   - Implement ContextMarketplace.sol
   - Build ReliabilityBonds.sol
   - Create CompressionBounties.sol

3. **Testing**
   - Unit tests for all contracts
   - Integration tests for incentive flows
   - Economic simulation

4. **Integration**
   - Connect to existing ERC-8004 registries
   - Integrate with CRPC validation
   - Link to reputation system

---

## Conclusion

By implementing these five mechanisms, the ΨNet context marketplace will:

1. ✅ **Promote Compression**: Bounties + pricing incentivize efficient context
2. ✅ **Reward Engineering**: Badges recognize well-structured context
3. ✅ **Ensure Reliability**: Bonds + slashing create accountability
4. ✅ **Enable Discovery**: Ranking surfaces best context first
5. ✅ **Align Incentives**: Better quality = more profit

**Result**: A self-optimizing marketplace where the most valuable context naturally rises to the top through economic incentives rather than centralized curation.

---

**Status**: DESIGN PROPOSAL - Ready for review and implementation
**Estimated Development Time**: 8-12 months for full implementation
**Estimated Cost**: $200k-$300k for development + audit
