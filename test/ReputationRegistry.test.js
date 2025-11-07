const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationRegistry", function () {
  let identityRegistry, reputationRegistry;
  let owner, agent1, reviewer1, reviewer2, resolver;
  const minimumStake = ethers.parseEther("0.01");

  beforeEach(async function () {
    [owner, agent1, reviewer1, reviewer2, resolver] = await ethers.getSigners();

    // Deploy Identity Registry
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();

    // Deploy Reputation Registry
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationRegistry.deploy(
      await identityRegistry.getAddress(),
      minimumStake
    );
    await reputationRegistry.waitForDeployment();

    // Register an agent
    await identityRegistry.connect(agent1).registerAgent("ipfs://QmAgent1");
  });

  describe("Deployment", function () {
    it("Should set correct identity registry", async function () {
      expect(await reputationRegistry.identityRegistry()).to.equal(
        await identityRegistry.getAddress()
      );
    });

    it("Should set correct minimum stake", async function () {
      expect(await reputationRegistry.minimumStake()).to.equal(minimumStake);
    });

    it("Should grant admin role to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(
        await reputationRegistry.hasRole(DEFAULT_ADMIN_ROLE, owner.address)
      ).to.be.true;
    });
  });

  describe("Posting Feedback", function () {
    it("Should post positive feedback", async function () {
      const tx = await reputationRegistry.connect(reviewer1).postFeedback(
        1, // agentId
        0, // FeedbackType.POSITIVE
        85, // rating
        "ipfs://QmContext123",
        "ipfs://QmReview123"
      );
      const receipt = await tx.wait();

      // Check event
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "FeedbackPosted"
      );
      expect(event.args.feedbackId).to.equal(1);
      expect(event.args.agentId).to.equal(1);
      expect(event.args.reviewer).to.equal(reviewer1.address);
      expect(event.args.rating).to.equal(85);
    });

    it("Should post staked feedback", async function () {
      const stakeAmount = ethers.parseEther("0.05");
      const tx = await reputationRegistry.connect(reviewer1).postStakedFeedback(
        1,
        0, // POSITIVE
        90,
        "ipfs://QmContext",
        "ipfs://QmReview",
        { value: stakeAmount }
      );

      const receipt = await tx.wait();
      const feedback = await reputationRegistry.getFeedback(1);

      expect(feedback.stake).to.equal(stakeAmount);
      expect(feedback.rating).to.equal(90);
    });

    it("Should revert staked feedback with insufficient stake", async function () {
      await expect(
        reputationRegistry.connect(reviewer1).postStakedFeedback(
          1,
          0,
          90,
          "ipfs://QmContext",
          "ipfs://QmReview",
          { value: ethers.parseEther("0.005") } // Less than minimum
        )
      ).to.be.revertedWith("ReputationRegistry: insufficient stake");
    });

    it("Should revert feedback for inactive agent", async function () {
      await identityRegistry.connect(agent1).deactivateAgent(1);

      await expect(
        reputationRegistry.connect(reviewer1).postFeedback(
          1,
          0,
          85,
          "ipfs://QmContext",
          "ipfs://QmReview"
        )
      ).to.be.revertedWith("ReputationRegistry: agent does not exist or is inactive");
    });

    it("Should revert feedback with invalid rating", async function () {
      await expect(
        reputationRegistry.connect(reviewer1).postFeedback(
          1,
          0,
          101, // > 100
          "ipfs://QmContext",
          "ipfs://QmReview"
        )
      ).to.be.revertedWith("ReputationRegistry: rating must be 0-100");
    });

    it("Should handle multiple feedback types", async function () {
      // Positive
      await reputationRegistry.connect(reviewer1).postFeedback(
        1, 0, 90, "ipfs://Ctx1", "ipfs://Rev1"
      );

      // Negative
      await reputationRegistry.connect(reviewer1).postFeedback(
        1, 1, 30, "ipfs://Ctx2", "ipfs://Rev2"
      );

      // Neutral
      await reputationRegistry.connect(reviewer1).postFeedback(
        1, 2, 50, "ipfs://Ctx3", "ipfs://Rev3"
      );

      const feedbackIds = await reputationRegistry.getAgentFeedback(1);
      expect(feedbackIds.length).to.equal(3);
    });

    it("Should update reputation score after feedback", async function () {
      await reputationRegistry.connect(reviewer1).postFeedback(
        1, 0, 80, "ipfs://Ctx", "ipfs://Rev"
      );

      const [score, count] = await reputationRegistry.getReputationScore(1);
      expect(count).to.equal(1);
      expect(score).to.be.greaterThan(0);
    });
  });

  describe("Reputation Score Calculation", function () {
    it("Should calculate correct score for positive feedback", async function () {
      await reputationRegistry.connect(reviewer1).postFeedback(
        1, 0, 100, "ipfs://Ctx", "ipfs://Rev"
      );

      const [score] = await reputationRegistry.getReputationScore(1);
      expect(score).to.equal(10000); // 100.00%
    });

    it("Should weight staked feedback higher", async function () {
      // Regular feedback
      await reputationRegistry.connect(reviewer1).postFeedback(
        1, 0, 80, "ipfs://Ctx1", "ipfs://Rev1"
      );

      const [scoreWithoutStake] = await reputationRegistry.getReputationScore(1);

      // Register another agent for comparison
      await identityRegistry.connect(agent1).registerAgent("ipfs://QmAgent2");

      // Staked feedback
      await reputationRegistry.connect(reviewer1).postStakedFeedback(
        2, 0, 80, "ipfs://Ctx2", "ipfs://Rev2",
        { value: ethers.parseEther("0.05") }
      );

      const [scoreWithStake] = await reputationRegistry.getReputationScore(2);

      // Staked feedback should have higher weight
      expect(scoreWithStake).to.be.greaterThan(scoreWithoutStake);
    });

    it("Should return default score for agent with no feedback", async function () {
      const [score, count] = await reputationRegistry.getReputationScore(1);
      expect(score).to.equal(5000); // 50.00% default
      expect(count).to.equal(0);
    });

    it("Should handle mixed positive and negative feedback", async function () {
      await reputationRegistry.connect(reviewer1).postFeedback(
        1, 0, 100, "ipfs://Ctx1", "ipfs://Rev1" // Positive
      );
      await reputationRegistry.connect(reviewer2).postFeedback(
        1, 1, 100, "ipfs://Ctx2", "ipfs://Rev2" // Negative
      );

      const [score] = await reputationRegistry.getReputationScore(1);
      // Should be balanced around 5000 (50%)
      expect(score).to.be.greaterThan(4000);
      expect(score).to.be.lessThan(6000);
    });
  });

  describe("Feedback Retrieval", function () {
    beforeEach(async function () {
      await reputationRegistry.connect(reviewer1).postFeedback(
        1, 0, 85, "ipfs://Ctx1", "ipfs://Rev1"
      );
      await reputationRegistry.connect(reviewer2).postFeedback(
        1, 0, 90, "ipfs://Ctx2", "ipfs://Rev2"
      );
    });

    it("Should retrieve feedback by ID", async function () {
      const feedback = await reputationRegistry.getFeedback(1);

      expect(feedback.agentId).to.equal(1);
      expect(feedback.reviewer).to.equal(reviewer1.address);
      expect(feedback.rating).to.equal(85);
      expect(feedback.contextHash).to.equal("ipfs://Ctx1");
    });

    it("Should get all feedback for an agent", async function () {
      const feedbackIds = await reputationRegistry.getAgentFeedback(1);
      expect(feedbackIds.length).to.equal(2);
    });

    it("Should get feedback by reviewer", async function () {
      const feedbackIds = await reputationRegistry.getFeedbackByReviewer(
        reviewer1.address
      );
      expect(feedbackIds.length).to.equal(1);
      expect(feedbackIds[0]).to.equal(1);
    });

    it("Should count feedback by type", async function () {
      const count = await reputationRegistry.getFeedbackCountByType(1, 0); // POSITIVE
      expect(count).to.equal(2);
    });
  });

  describe("Dispute Resolution", function () {
    beforeEach(async function () {
      // Post feedback
      await reputationRegistry.connect(reviewer1).postStakedFeedback(
        1, 0, 85, "ipfs://Ctx", "ipfs://Rev",
        { value: ethers.parseEther("0.05") }
      );

      // Grant resolver role
      const DISPUTE_RESOLVER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("DISPUTE_RESOLVER_ROLE")
      );
      await reputationRegistry.grantRole(DISPUTE_RESOLVER_ROLE, resolver.address);
    });

    it("Should allow agent owner to dispute feedback", async function () {
      const tx = await reputationRegistry.connect(agent1).disputeFeedback(
        1,
        "ipfs://DisputeReason"
      );

      const feedback = await reputationRegistry.getFeedback(1);
      expect(feedback.disputed).to.be.true;
    });

    it("Should revert if non-authorized user disputes", async function () {
      await expect(
        reputationRegistry.connect(reviewer2).disputeFeedback(1, "ipfs://Dispute")
      ).to.be.revertedWith("ReputationRegistry: caller not authorized to dispute");
    });

    it("Should resolve dispute and remove feedback", async function () {
      await reputationRegistry.connect(agent1).disputeFeedback(1, "ipfs://Dispute");

      await reputationRegistry.connect(resolver).resolveDispute(
        1,
        true, // removeFeedback
        false // slashStake
      );

      const feedback = await reputationRegistry.getFeedback(1);
      expect(feedback.disputed).to.be.false;
      expect(feedback.rating).to.equal(0); // Removed
    });

    it("Should slash stake on dispute resolution", async function () {
      await reputationRegistry.connect(agent1).disputeFeedback(1, "ipfs://Dispute");

      const resolverBalanceBefore = await ethers.provider.getBalance(
        resolver.address
      );

      await reputationRegistry.connect(resolver).resolveDispute(
        1,
        true, // removeFeedback
        true  // slashStake
      );

      const resolverBalanceAfter = await ethers.provider.getBalance(
        resolver.address
      );

      // Resolver should receive stake (minus gas)
      expect(resolverBalanceAfter).to.be.greaterThan(resolverBalanceBefore);
    });

    it("Should return stake if dispute rejected", async function () {
      await reputationRegistry.connect(agent1).disputeFeedback(1, "ipfs://Dispute");

      const reviewerBalanceBefore = await ethers.provider.getBalance(
        reviewer1.address
      );

      await reputationRegistry.connect(resolver).resolveDispute(
        1,
        false, // keep feedback
        false  // don't slash
      );

      const reviewerBalanceAfter = await ethers.provider.getBalance(
        reviewer1.address
      );

      expect(reviewerBalanceAfter).to.be.greaterThan(reviewerBalanceBefore);
    });
  });

  describe("Access Control", function () {
    it("Should check if address is dispute resolver", async function () {
      const DISPUTE_RESOLVER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("DISPUTE_RESOLVER_ROLE")
      );
      await reputationRegistry.grantRole(DISPUTE_RESOLVER_ROLE, resolver.address);

      expect(await reputationRegistry.isDisputeResolver(resolver.address)).to.be.true;
      expect(await reputationRegistry.isDisputeResolver(reviewer1.address)).to.be.false;
    });

    it("Should allow admin to update minimum stake", async function () {
      const newStake = ethers.parseEther("0.02");
      await reputationRegistry.setMinimumStake(newStake);
      expect(await reputationRegistry.minimumStake()).to.equal(newStake);
    });

    it("Should revert if non-admin updates minimum stake", async function () {
      await expect(
        reputationRegistry.connect(reviewer1).setMinimumStake(
          ethers.parseEther("0.02")
        )
      ).to.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should revert when getting non-existent feedback", async function () {
      await expect(
        reputationRegistry.getFeedback(999)
      ).to.be.revertedWith("ReputationRegistry: feedback does not exist");
    });

    it("Should handle agent with many feedbacks", async function () {
      for (let i = 0; i < 10; i++) {
        await reputationRegistry.connect(reviewer1).postFeedback(
          1, 0, 80 + i, `ipfs://Ctx${i}`, `ipfs://Rev${i}`
        );
      }

      const feedbackIds = await reputationRegistry.getAgentFeedback(1);
      expect(feedbackIds.length).to.equal(10);
    });

    it("Should not count disputed feedback in score", async function () {
      await reputationRegistry.connect(reviewer1).postFeedback(
        1, 0, 100, "ipfs://Ctx", "ipfs://Rev"
      );

      const [scoreBefore] = await reputationRegistry.getReputationScore(1);

      const DISPUTE_RESOLVER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("DISPUTE_RESOLVER_ROLE")
      );
      await reputationRegistry.grantRole(DISPUTE_RESOLVER_ROLE, resolver.address);

      await reputationRegistry.connect(agent1).disputeFeedback(1, "ipfs://Dispute");
      await reputationRegistry.connect(resolver).resolveDispute(1, true, false);

      const [scoreAfter] = await reputationRegistry.getReputationScore(1);

      // Score should be default after removal
      expect(scoreAfter).to.equal(5000);
    });
  });
});
