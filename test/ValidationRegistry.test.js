const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ValidationRegistry", function () {
  let identityRegistry, validationRegistry;
  let owner, agent1, validator1, validator2, resolver;
  const requestStake = ethers.parseEther("0.01");
  const validatorStake = ethers.parseEther("0.05");

  beforeEach(async function () {
    [owner, agent1, validator1, validator2, resolver] = await ethers.getSigners();

    // Deploy Identity Registry
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();

    // Deploy Validation Registry
    const ValidationRegistry = await ethers.getContractFactory("ValidationRegistry");
    validationRegistry = await ValidationRegistry.deploy(
      await identityRegistry.getAddress(),
      requestStake,
      validatorStake
    );
    await validationRegistry.waitForDeployment();

    // Register an agent
    await identityRegistry.connect(agent1).registerAgent("ipfs://QmAgent1");
  });

  describe("Deployment", function () {
    it("Should set correct parameters", async function () {
      expect(await validationRegistry.identityRegistry()).to.equal(
        await identityRegistry.getAddress()
      );
      expect(await validationRegistry.minimumRequestStake()).to.equal(requestStake);
      expect(await validationRegistry.minimumValidatorStake()).to.equal(validatorStake);
    });

    it("Should grant roles to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(
        await validationRegistry.hasRole(DEFAULT_ADMIN_ROLE, owner.address)
      ).to.be.true;
    });
  });

  describe("Request Validation", function () {
    it("Should request staked validation", async function () {
      const deadline = (await time.latest()) + 86400; // 1 day from now
      const tx = await validationRegistry.connect(agent1).requestValidation(
        1, // agentId
        0, // ValidationType.STAKED
        "0x1234...", // taskHash
        "ipfs://QmTask",
        deadline,
        { value: requestStake }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "ValidationRequested"
      );

      expect(event.args.requestId).to.equal(1);
      expect(event.args.agentId).to.equal(1);
      expect(event.args.validationType).to.equal(0);
    });

    it("Should revert if insufficient stake for staked validation", async function () {
      const deadline = (await time.latest()) + 86400;

      await expect(
        validationRegistry.connect(agent1).requestValidation(
          1,
          0, // STAKED
          "0x1234",
          "ipfs://QmTask",
          deadline,
          { value: ethers.parseEther("0.005") } // Too low
        )
      ).to.be.revertedWith("ValidationRegistry: insufficient stake");
    });

    it("Should revert if deadline is in the past", async function () {
      const pastDeadline = (await time.latest()) - 100;

      await expect(
        validationRegistry.connect(agent1).requestValidation(
          1,
          0,
          "0x1234",
          "ipfs://QmTask",
          pastDeadline,
          { value: requestStake }
        )
      ).to.be.revertedWith("ValidationRegistry: deadline must be in future");
    });

    it("Should request TEE validation without stake", async function () {
      const deadline = (await time.latest()) + 86400;
      await validationRegistry.connect(agent1).requestValidation(
        1,
        1, // ValidationType.TEE_ATTESTATION
        "0x1234",
        "ipfs://QmTask",
        deadline
        // No value needed for TEE
      );

      const request = await validationRegistry.getValidationRequest(1);
      expect(request.validationType).to.equal(1);
      expect(request.stake).to.equal(0);
    });

    it("Should request ZK proof validation", async function () {
      const deadline = (await time.latest()) + 86400;
      await validationRegistry.connect(agent1).requestValidation(
        1,
        2, // ValidationType.ZK_PROOF
        "0x1234",
        "ipfs://QmTask",
        deadline
      );

      const request = await validationRegistry.getValidationRequest(1);
      expect(request.validationType).to.equal(2);
    });
  });

  describe("Submit Staked Validation", function () {
    let requestId, deadline;

    beforeEach(async function () {
      deadline = (await time.latest()) + 86400;
      const tx = await validationRegistry.connect(agent1).requestValidation(
        1, 0, "0x1234", "ipfs://QmTask", deadline,
        { value: requestStake }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "ValidationRequested"
      );
      requestId = event.args.requestId;
    });

    it("Should submit staked validation", async function () {
      const tx = await validationRegistry.connect(validator1).submitStakedValidation(
        requestId,
        true, // approved
        "ipfs://QmProof",
        "ipfs://QmMetadata",
        { value: validatorStake }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "ValidationSubmitted"
      );

      expect(event.args.requestId).to.equal(requestId);
      expect(event.args.validator).to.equal(validator1.address);
      expect(event.args.approved).to.be.true;
    });

    it("Should revert if insufficient validator stake", async function () {
      await expect(
        validationRegistry.connect(validator1).submitStakedValidation(
          requestId,
          true,
          "ipfs://QmProof",
          "ipfs://QmMetadata",
          { value: ethers.parseEther("0.01") } // Too low
        )
      ).to.be.revertedWith("ValidationRegistry: insufficient validator stake");
    });

    it("Should revert if deadline passed", async function () {
      await time.increase(86401); // Move past deadline

      await expect(
        validationRegistry.connect(validator1).submitStakedValidation(
          requestId,
          true,
          "ipfs://QmProof",
          "ipfs://QmMetadata",
          { value: validatorStake }
        )
      ).to.be.revertedWith("ValidationRegistry: deadline passed");
    });

    it("Should update agent validation statistics", async function () {
      await validationRegistry.connect(validator1).submitStakedValidation(
        requestId, true, "ipfs://QmProof", "ipfs://QmMetadata",
        { value: validatorStake }
      );

      const [successRate, total] = await validationRegistry.getValidationSuccessRate(1);
      expect(total).to.equal(1);
      expect(successRate).to.equal(10000); // 100%
    });

    it("Should track validator submissions", async function () {
      await validationRegistry.connect(validator1).submitStakedValidation(
        requestId, true, "ipfs://QmProof", "ipfs://QmMetadata",
        { value: validatorStake }
      );

      const submissions = await validationRegistry.getValidatorSubmissions(
        validator1.address
      );
      expect(submissions.length).to.equal(1);
      expect(submissions[0]).to.equal(requestId);
    });
  });

  describe("Submit TEE Validation", function () {
    let requestId;

    beforeEach(async function () {
      const deadline = (await time.latest()) + 86400;
      const tx = await validationRegistry.connect(agent1).requestValidation(
        1, 1, "0x1234", "ipfs://QmTask", deadline // TEE validation
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "ValidationRequested"
      );
      requestId = event.args.requestId;

      // Grant TEE validator role
      const TEE_VALIDATOR_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("TEE_VALIDATOR_ROLE")
      );
      await validationRegistry.grantRole(TEE_VALIDATOR_ROLE, validator1.address);
    });

    it("Should submit TEE validation", async function () {
      const attestation = ethers.hexlify(ethers.randomBytes(64));

      const tx = await validationRegistry.connect(validator1).submitTEEValidation(
        requestId,
        true,
        attestation,
        "ipfs://QmMetadata"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "ValidationSubmitted"
      );
      expect(event.args.approved).to.be.true;
    });

    it("Should revert if caller is not TEE validator", async function () {
      const attestation = ethers.hexlify(ethers.randomBytes(64));

      await expect(
        validationRegistry.connect(validator2).submitTEEValidation(
          requestId, true, attestation, "ipfs://QmMetadata"
        )
      ).to.be.reverted;
    });

    it("Should check if address is TEE validator", async function () {
      expect(await validationRegistry.isTEEValidator(validator1.address)).to.be.true;
      expect(await validationRegistry.isTEEValidator(validator2.address)).to.be.false;
    });
  });

  describe("Submit ZK Proof Validation", function () {
    let requestId;

    beforeEach(async function () {
      const deadline = (await time.latest()) + 86400;
      const tx = await validationRegistry.connect(agent1).requestValidation(
        1, 2, "0x1234", "ipfs://QmTask", deadline // ZK_PROOF validation
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "ValidationRequested"
      );
      requestId = event.args.requestId;

      // Grant ZK verifier role
      const ZK_VERIFIER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("ZK_VERIFIER_ROLE")
      );
      await validationRegistry.grantRole(ZK_VERIFIER_ROLE, validator1.address);
    });

    it("Should submit ZK proof validation", async function () {
      const zkProof = ethers.hexlify(ethers.randomBytes(128));

      await validationRegistry.connect(validator1).submitZKProofValidation(
        requestId,
        true,
        zkProof,
        "ipfs://QmMetadata"
      );

      const response = await validationRegistry.getValidationResponse(requestId);
      expect(response.approved).to.be.true;
    });

    it("Should revert if caller is not ZK verifier", async function () {
      const zkProof = ethers.hexlify(ethers.randomBytes(128));

      await expect(
        validationRegistry.connect(validator2).submitZKProofValidation(
          requestId, true, zkProof, "ipfs://QmMetadata"
        )
      ).to.be.reverted;
    });
  });

  describe("Finalize Validation", function () {
    let requestId;

    beforeEach(async function () {
      const deadline = (await time.latest()) + 86400;
      const tx = await validationRegistry.connect(agent1).requestValidation(
        1, 0, "0x1234", "ipfs://QmTask", deadline,
        { value: requestStake }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "ValidationRequested"
      );
      requestId = event.args.requestId;
    });

    it("Should finalize successful validation", async function () {
      await validationRegistry.connect(validator1).submitStakedValidation(
        requestId, true, "ipfs://QmProof", "ipfs://QmMetadata",
        { value: validatorStake }
      );

      const validatorBalanceBefore = await ethers.provider.getBalance(
        validator1.address
      );

      await validationRegistry.finalizeValidation(requestId);

      const validatorBalanceAfter = await ethers.provider.getBalance(
        validator1.address
      );

      // Validator should receive both stakes
      expect(validatorBalanceAfter).to.be.greaterThan(validatorBalanceBefore);
    });

    it("Should finalize rejected validation", async function () {
      await validationRegistry.connect(validator1).submitStakedValidation(
        requestId, false, "ipfs://QmProof", "ipfs://QmMetadata",
        { value: validatorStake }
      );

      await validationRegistry.finalizeValidation(requestId);

      const request = await validationRegistry.getValidationRequest(requestId);
      expect(request.status).to.equal(2); // REJECTED
    });

    it("Should finalize expired validation", async function () {
      await time.increase(86401); // Move past deadline

      await validationRegistry.finalizeValidation(requestId);

      const request = await validationRegistry.getValidationRequest(requestId);
      expect(request.status).to.equal(4); // EXPIRED
    });

    it("Should return stakes on expiry", async function () {
      const requesterBalanceBefore = await ethers.provider.getBalance(
        agent1.address
      );

      await time.increase(86401);
      await validationRegistry.finalizeValidation(requestId);

      const requesterBalanceAfter = await ethers.provider.getBalance(
        agent1.address
      );

      expect(requesterBalanceAfter).to.be.greaterThan(requesterBalanceBefore);
    });
  });

  describe("Dispute Validation", function () {
    let requestId;

    beforeEach(async function () {
      const deadline = (await time.latest()) + 86400;
      const tx = await validationRegistry.connect(agent1).requestValidation(
        1, 0, "0x1234", "ipfs://QmTask", deadline,
        { value: requestStake }
      );
      const receipt = await tx.wait();
      requestId = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "ValidationRequested"
      ).args.requestId;

      await validationRegistry.connect(validator1).submitStakedValidation(
        requestId, true, "ipfs://QmProof", "ipfs://QmMetadata",
        { value: validatorStake }
      );
    });

    it("Should allow requester to dispute validation", async function () {
      await validationRegistry.connect(agent1).disputeValidation(
        requestId,
        "ipfs://DisputeReason"
      );

      const request = await validationRegistry.getValidationRequest(requestId);
      expect(request.status).to.equal(3); // DISPUTED
    });

    it("Should revert if non-authorized user disputes", async function () {
      await expect(
        validationRegistry.connect(validator2).disputeValidation(
          requestId,
          "ipfs://Dispute"
        )
      ).to.be.revertedWith("ValidationRegistry: caller not authorized");
    });
  });

  describe("Resolve Dispute", function () {
    let requestId;

    beforeEach(async function () {
      const deadline = (await time.latest()) + 86400;
      const tx = await validationRegistry.connect(agent1).requestValidation(
        1, 0, "0x1234", "ipfs://QmTask", deadline,
        { value: requestStake }
      );
      requestId = (await tx.wait()).logs.find(
        (log) => log.fragment && log.fragment.name === "ValidationRequested"
      ).args.requestId;

      await validationRegistry.connect(validator1).submitStakedValidation(
        requestId, true, "ipfs://QmProof", "ipfs://QmMetadata",
        { value: validatorStake }
      );

      await validationRegistry.connect(agent1).disputeValidation(
        requestId, "ipfs://Dispute"
      );

      // Grant resolver role
      const DISPUTE_RESOLVER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("DISPUTE_RESOLVER_ROLE")
      );
      await validationRegistry.grantRole(DISPUTE_RESOLVER_ROLE, resolver.address);
    });

    it("Should resolve dispute in favor of validator", async function () {
      await validationRegistry.connect(resolver).resolveValidationDispute(
        requestId,
        1, // VALIDATED status
        false, // don't slash requester
        false  // don't slash validator
      );

      const request = await validationRegistry.getValidationRequest(requestId);
      expect(request.status).to.equal(1); // VALIDATED
    });

    it("Should slash requester if appropriate", async function () {
      const validatorBalanceBefore = await ethers.provider.getBalance(
        validator1.address
      );

      await validationRegistry.connect(resolver).resolveValidationDispute(
        requestId,
        2, // REJECTED
        true,  // slash requester
        false  // don't slash validator
      );

      const validatorBalanceAfter = await ethers.provider.getBalance(
        validator1.address
      );

      expect(validatorBalanceAfter).to.be.greaterThan(validatorBalanceBefore);
    });

    it("Should slash validator if appropriate", async function () {
      const requesterBalanceBefore = await ethers.provider.getBalance(
        agent1.address
      );

      await validationRegistry.connect(resolver).resolveValidationDispute(
        requestId,
        2, // REJECTED
        false, // don't slash requester
        true   // slash validator
      );

      const requesterBalanceAfter = await ethers.provider.getBalance(
        agent1.address
      );

      expect(requesterBalanceAfter).to.be.greaterThan(requesterBalanceBefore);
    });

    it("Should check if address is dispute resolver", async function () {
      expect(
        await validationRegistry.isValidationDisputeResolver(resolver.address)
      ).to.be.true;
      expect(
        await validationRegistry.isValidationDisputeResolver(validator1.address)
      ).to.be.false;
    });
  });

  describe("Validation Success Rate", function () {
    it("Should return 100% for new agent", async function () {
      const [rate, total] = await validationRegistry.getValidationSuccessRate(1);
      expect(rate).to.equal(10000); // 100%
      expect(total).to.equal(0);
    });

    it("Should calculate correct success rate", async function () {
      // Submit 3 successful validations
      for (let i = 0; i < 3; i++) {
        const deadline = (await time.latest()) + 86400;
        const tx = await validationRegistry.connect(agent1).requestValidation(
          1, 0, `0x${i}`, "ipfs://QmTask", deadline,
          { value: requestStake }
        );
        const requestId = (await tx.wait()).logs.find(
          (log) => log.fragment && log.fragment.name === "ValidationRequested"
        ).args.requestId;

        await validationRegistry.connect(validator1).submitStakedValidation(
          requestId, true, "ipfs://QmProof", "ipfs://QmMetadata",
          { value: validatorStake }
        );
      }

      // Submit 1 failed validation
      const deadline = (await time.latest()) + 86400;
      const tx = await validationRegistry.connect(agent1).requestValidation(
        1, 0, "0x999", "ipfs://QmTask", deadline,
        { value: requestStake }
      );
      const requestId = (await tx.wait()).logs.find(
        (log) => log.fragment && log.fragment.name === "ValidationRequested"
      ).args.requestId;

      await validationRegistry.connect(validator1).submitStakedValidation(
        requestId, false, "ipfs://QmProof", "ipfs://QmMetadata",
        { value: validatorStake }
      );

      const [rate, total] = await validationRegistry.getValidationSuccessRate(1);
      expect(total).to.equal(4);
      expect(rate).to.equal(7500); // 75%
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to update minimum stakes", async function () {
      await validationRegistry.setMinimumStakes(
        ethers.parseEther("0.02"),
        ethers.parseEther("0.1")
      );

      expect(await validationRegistry.minimumRequestStake()).to.equal(
        ethers.parseEther("0.02")
      );
      expect(await validationRegistry.minimumValidatorStake()).to.equal(
        ethers.parseEther("0.1")
      );
    });

    it("Should revert if non-admin updates stakes", async function () {
      await expect(
        validationRegistry.connect(validator1).setMinimumStakes(
          ethers.parseEther("0.02"),
          ethers.parseEther("0.1")
        )
      ).to.be.reverted;
    });
  });
});
