const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdentityRegistry", function () {
  let identityRegistry;
  let owner, agent1, agent2, agent3;

  beforeEach(async function () {
    [owner, agent1, agent2, agent3] = await ethers.getSigners();

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await identityRegistry.name()).to.equal("PsiNet Agent Identity");
      expect(await identityRegistry.symbol()).to.equal("PSAI");
    });

    it("Should start with zero agents", async function () {
      expect(await identityRegistry.getTotalAgents()).to.equal(0);
    });
  });

  describe("Agent Registration", function () {
    it("Should register a new agent", async function () {
      const agentURI = "ipfs://QmTest123";
      const tx = await identityRegistry.connect(agent1).registerAgent(agentURI);
      const receipt = await tx.wait();

      // Check event emission
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "AgentRegistered"
      );
      expect(event).to.not.be.undefined;
      expect(event.args.agentId).to.equal(1);
      expect(event.args.owner).to.equal(agent1.address);
      expect(event.args.agentURI).to.equal(agentURI);
    });

    it("Should increment agent IDs", async function () {
      await identityRegistry.connect(agent1).registerAgent("ipfs://QmTest1");
      await identityRegistry.connect(agent2).registerAgent("ipfs://QmTest2");
      await identityRegistry.connect(agent3).registerAgent("ipfs://QmTest3");

      expect(await identityRegistry.getTotalAgents()).to.equal(3);
    });

    it("Should revert if URI is empty", async function () {
      await expect(
        identityRegistry.connect(agent1).registerAgent("")
      ).to.be.revertedWith("IdentityRegistry: URI cannot be empty");
    });

    it("Should assign ownership correctly", async function () {
      await identityRegistry.connect(agent1).registerAgent("ipfs://QmTest");
      expect(await identityRegistry.getAgentOwner(1)).to.equal(agent1.address);
    });

    it("Should set agent as active by default", async function () {
      await identityRegistry.connect(agent1).registerAgent("ipfs://QmTest");
      expect(await identityRegistry.isAgentActive(1)).to.be.true;
    });

    it("Should track agents by owner", async function () {
      await identityRegistry.connect(agent1).registerAgent("ipfs://QmTest1");
      await identityRegistry.connect(agent1).registerAgent("ipfs://QmTest2");

      const agentIds = await identityRegistry.getAgentsByOwner(agent1.address);
      expect(agentIds.length).to.equal(2);
      expect(agentIds[0]).to.equal(1);
      expect(agentIds[1]).to.equal(2);
    });
  });

  describe("Agent URI Management", function () {
    beforeEach(async function () {
      await identityRegistry.connect(agent1).registerAgent("ipfs://QmOriginal");
    });

    it("Should return correct agent URI", async function () {
      expect(await identityRegistry.getAgentURI(1)).to.equal("ipfs://QmOriginal");
    });

    it("Should allow owner to update URI", async function () {
      const newURI = "ipfs://QmUpdated";
      const tx = await identityRegistry.connect(agent1).updateAgentURI(1, newURI);
      const receipt = await tx.wait();

      expect(await identityRegistry.getAgentURI(1)).to.equal(newURI);

      // Check event
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "AgentURIUpdated"
      );
      expect(event.args.agentId).to.equal(1);
      expect(event.args.newURI).to.equal(newURI);
    });

    it("Should revert if non-owner tries to update URI", async function () {
      await expect(
        identityRegistry.connect(agent2).updateAgentURI(1, "ipfs://QmHacked")
      ).to.be.revertedWith("IdentityRegistry: caller is not owner");
    });

    it("Should revert if updating with empty URI", async function () {
      await expect(
        identityRegistry.connect(agent1).updateAgentURI(1, "")
      ).to.be.revertedWith("IdentityRegistry: URI cannot be empty");
    });

    it("Should revert if updating inactive agent", async function () {
      await identityRegistry.connect(agent1).deactivateAgent(1);
      await expect(
        identityRegistry.connect(agent1).updateAgentURI(1, "ipfs://QmNew")
      ).to.be.revertedWith("IdentityRegistry: agent is not active");
    });
  });

  describe("Agent Deactivation", function () {
    beforeEach(async function () {
      await identityRegistry.connect(agent1).registerAgent("ipfs://QmTest");
    });

    it("Should allow owner to deactivate agent", async function () {
      const tx = await identityRegistry.connect(agent1).deactivateAgent(1);
      const receipt = await tx.wait();

      expect(await identityRegistry.isAgentActive(1)).to.be.false;

      // Check event
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "AgentDeactivated"
      );
      expect(event.args.agentId).to.equal(1);
    });

    it("Should revert if non-owner tries to deactivate", async function () {
      await expect(
        identityRegistry.connect(agent2).deactivateAgent(1)
      ).to.be.revertedWith("IdentityRegistry: caller is not owner");
    });

    it("Should revert if already inactive", async function () {
      await identityRegistry.connect(agent1).deactivateAgent(1);
      await expect(
        identityRegistry.connect(agent1).deactivateAgent(1)
      ).to.be.revertedWith("IdentityRegistry: agent already inactive");
    });
  });

  describe("NFT Transfer", function () {
    beforeEach(async function () {
      await identityRegistry.connect(agent1).registerAgent("ipfs://QmTest");
    });

    it("Should transfer agent ownership via NFT transfer", async function () {
      await identityRegistry.connect(agent1).transferFrom(
        agent1.address,
        agent2.address,
        1
      );

      expect(await identityRegistry.getAgentOwner(1)).to.equal(agent2.address);
    });

    it("Should update owner's agent list on transfer", async function () {
      await identityRegistry.connect(agent1).transferFrom(
        agent1.address,
        agent2.address,
        1
      );

      const agent1Agents = await identityRegistry.getAgentsByOwner(agent1.address);
      const agent2Agents = await identityRegistry.getAgentsByOwner(agent2.address);

      expect(agent1Agents.length).to.equal(0);
      expect(agent2Agents.length).to.equal(1);
      expect(agent2Agents[0]).to.equal(1);
    });

    it("Should allow new owner to manage agent after transfer", async function () {
      await identityRegistry.connect(agent1).transferFrom(
        agent1.address,
        agent2.address,
        1
      );

      await identityRegistry.connect(agent2).updateAgentURI(1, "ipfs://QmNewOwner");
      expect(await identityRegistry.getAgentURI(1)).to.equal("ipfs://QmNewOwner");
    });

    it("Should prevent old owner from managing after transfer", async function () {
      await identityRegistry.connect(agent1).transferFrom(
        agent1.address,
        agent2.address,
        1
      );

      await expect(
        identityRegistry.connect(agent1).updateAgentURI(1, "ipfs://QmOldOwner")
      ).to.be.revertedWith("IdentityRegistry: caller is not owner");
    });
  });

  describe("Edge Cases", function () {
    it("Should revert when querying non-existent agent", async function () {
      await expect(
        identityRegistry.getAgentURI(999)
      ).to.be.revertedWith("IdentityRegistry: agent does not exist");
    });

    it("Should revert when querying owner of non-existent agent", async function () {
      await expect(
        identityRegistry.getAgentOwner(999)
      ).to.be.revertedWith("IdentityRegistry: agent does not exist");
    });

    it("Should handle multiple agents per owner", async function () {
      for (let i = 0; i < 5; i++) {
        await identityRegistry.connect(agent1).registerAgent(`ipfs://QmTest${i}`);
      }

      const agents = await identityRegistry.getAgentsByOwner(agent1.address);
      expect(agents.length).to.equal(5);
    });

    it("Should return empty array for address with no agents", async function () {
      const agents = await identityRegistry.getAgentsByOwner(agent1.address);
      expect(agents.length).to.equal(0);
    });
  });
});
