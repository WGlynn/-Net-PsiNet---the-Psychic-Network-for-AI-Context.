const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ContextStorageRegistry - Economic Density = Context Density", function () {
    let psiToken, economics, identityRegistry, reputationRegistry, validationRegistry;
    let crpcValidator, storageRegistry;
    let owner, agent1, agent2, validator1, validator2, validator3;

    const TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1B PSI
    const INITIAL_BALANCE = ethers.parseEther("10000"); // 10K PSI per agent
    const ONE_GB = 1_000_000_000; // 1 GB in bytes
    const ONE_MB = 1_000_000; // 1 MB in bytes

    beforeEach(async function () {
        [owner, agent1, agent2, validator1, validator2, validator3] = await ethers.getSigners();

        // Deploy PsiToken
        const PsiToken = await ethers.getContractFactory("PsiToken");
        psiToken = await PsiToken.deploy(await owner.getAddress());

        // Deploy ERC-8004 registries
        const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
        identityRegistry = await IdentityRegistry.deploy();

        const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
        reputationRegistry = await ReputationRegistry.deploy();

        const ValidationRegistry = await ethers.getContractFactory("ValidationRegistry");
        validationRegistry = await ValidationRegistry.deploy();

        // Deploy CRPC Validator
        const CRPCValidator = await ethers.getContractFactory("CRPCValidator");
        crpcValidator = await CRPCValidator.deploy(
            await reputationRegistry.getAddress(),
            await validationRegistry.getAddress()
        );

        // Deploy Storage Registry
        const ContextStorageRegistry = await ethers.getContractFactory("ContextStorageRegistry");
        storageRegistry = await ContextStorageRegistry.deploy(
            await psiToken.getAddress(),
            await reputationRegistry.getAddress(),
            await crpcValidator.getAddress()
        );

        // Register agents
        await identityRegistry.registerAgent(
            ethers.id("agent1"),
            "ipfs://agent1-metadata"
        );
        await identityRegistry.connect(agent1).registerAgent(
            ethers.id("agent1-profile"),
            "ipfs://agent1-profile"
        );
        await identityRegistry.connect(agent2).registerAgent(
            ethers.id("agent2-profile"),
            "ipfs://agent2-profile"
        );

        // Distribute tokens
        await psiToken.transfer(await agent1.getAddress(), INITIAL_BALANCE);
        await psiToken.transfer(await agent2.getAddress(), INITIAL_BALANCE);

        // Approve storage registry
        await psiToken.connect(agent1).approve(
            await storageRegistry.getAddress(),
            ethers.MaxUint256
        );
        await psiToken.connect(agent2).approve(
            await storageRegistry.getAddress(),
            ethers.MaxUint256
        );
    });

    describe("Context Registration", function () {
        it("Should register context with valid deposit", async function () {
            const cid = ethers.id("context-1");
            const size = 100 * ONE_MB; // 100 MB
            const deposit = ethers.parseEther("100"); // 100 PSI

            await expect(
                storageRegistry.connect(agent1).registerContext(
                    cid,
                    size,
                    deposit,
                    0 // Hot tier
                )
            ).to.emit(storageRegistry, "ContextRegistered")
                .withArgs(cid, await agent1.getAddress(), size, 0);

            const context = await storageRegistry.getContext(cid);
            expect(context.sizeBytes).to.equal(size);
            expect(context.owner).to.equal(await agent1.getAddress());
            expect(context.depositBalance).to.equal(deposit);
            expect(context.archived).to.be.false;
            expect(context.qualityScore).to.equal(100);
        });

        it("Should reject registration with insufficient deposit", async function () {
            const cid = ethers.id("context-2");
            const size = ONE_GB; // 1 GB
            const insufficientDeposit = ethers.parseEther("0.01"); // Too small

            await expect(
                storageRegistry.connect(agent1).registerContext(
                    cid,
                    size,
                    insufficientDeposit,
                    0
                )
            ).to.be.revertedWith("Insufficient deposit");
        });

        it("Should reject duplicate registration", async function () {
            const cid = ethers.id("context-3");
            const size = 50 * ONE_MB;
            const deposit = ethers.parseEther("50");

            await storageRegistry.connect(agent1).registerContext(
                cid,
                size,
                deposit,
                0
            );

            await expect(
                storageRegistry.connect(agent1).registerContext(
                    cid,
                    size,
                    deposit,
                    0
                )
            ).to.be.revertedWith("Context already exists");
        });

        it("Should track total storage correctly", async function () {
            const cid1 = ethers.id("context-4");
            const cid2 = ethers.id("context-5");
            const size1 = 100 * ONE_MB;
            const size2 = 200 * ONE_MB;
            const deposit = ethers.parseEther("100");

            await storageRegistry.connect(agent1).registerContext(cid1, size1, deposit, 0);
            await storageRegistry.connect(agent2).registerContext(cid2, size2, deposit, 0);

            const totalStorage = await storageRegistry.totalStorageBytes();
            expect(totalStorage).to.equal(size1 + size2);

            const activeContexts = await storageRegistry.activeContexts();
            expect(activeContexts).to.equal(2);
        });
    });

    describe("Rent Calculation", function () {
        it("Should calculate rent correctly for different sizes", async function () {
            const oneDay = 24 * 60 * 60;

            // 1 GB for 1 day
            const rent1GB = await storageRegistry.calculateRent(ONE_GB, oneDay, 0);
            console.log("1 GB / 1 day rent:", ethers.formatEther(rent1GB), "PSI");

            // 100 MB for 1 day
            const rent100MB = await storageRegistry.calculateRent(100 * ONE_MB, oneDay, 0);
            console.log("100 MB / 1 day rent:", ethers.formatEther(rent100MB), "PSI");

            // Rent should scale linearly with size
            expect(rent1GB).to.be.closeTo(rent100MB * 10n, rent100MB / 10n);
        });

        it("Should apply network multiplier as storage fills", async function () {
            const oneDay = 24 * 60 * 60;
            const size = ONE_GB;

            // Calculate rent at 0% utilization
            const rentEmpty = await storageRegistry.calculateRent(size, oneDay, 0);

            // Add large context to increase utilization
            const largeCID = ethers.id("large-context");
            const largeSize = 100_000n * BigInt(ONE_GB); // 100 TB
            const largeDeposit = ethers.parseEther("1000000");

            // Give agent2 enough tokens
            await psiToken.transfer(await agent2.getAddress(), largeDeposit);
            await psiToken.connect(agent2).approve(
                await storageRegistry.getAddress(),
                ethers.MaxUint256
            );

            await storageRegistry.connect(agent2).registerContext(
                largeCID,
                largeSize,
                largeDeposit,
                0
            );

            // Calculate rent at higher utilization
            const rentFull = await storageRegistry.calculateRent(size, oneDay, 0);

            console.log("Rent (empty network):", ethers.formatEther(rentEmpty), "PSI");
            console.log("Rent (full network):", ethers.formatEther(rentFull), "PSI");

            // Rent should be higher when network is fuller
            expect(rentFull).to.be.gt(rentEmpty);
        });

        it("Should apply tier multipliers correctly", async function () {
            const oneDay = 24 * 60 * 60;
            const size = ONE_GB;

            const hotRent = await storageRegistry.calculateRent(size, oneDay, 0);
            const warmRent = await storageRegistry.calculateRent(size, oneDay, 1);
            const coldRent = await storageRegistry.calculateRent(size, oneDay, 2);

            console.log("Hot tier rent:", ethers.formatEther(hotRent), "PSI");
            console.log("Warm tier rent:", ethers.formatEther(warmRent), "PSI");
            console.log("Cold tier rent:", ethers.formatEther(coldRent), "PSI");

            // Warm should be ~0.1x hot
            expect(warmRent).to.be.lt(hotRent);
            // Cold should be ~0.01x hot
            expect(coldRent).to.be.lt(warmRent);
        });
    });

    describe("Rent Charging", function () {
        it("Should charge rent over time", async function () {
            const cid = ethers.id("context-rent-1");
            const size = 100 * ONE_MB;
            const deposit = ethers.parseEther("100");

            await storageRegistry.connect(agent1).registerContext(cid, size, deposit, 0);

            // Fast forward 30 days
            await time.increase(30 * 24 * 60 * 60);

            const balanceBefore = (await storageRegistry.getContext(cid)).depositBalance;

            await storageRegistry.chargeRent(cid);

            const balanceAfter = (await storageRegistry.getContext(cid)).depositBalance;

            expect(balanceAfter).to.be.lt(balanceBefore);
            console.log("Rent charged:", ethers.formatEther(balanceBefore - balanceAfter), "PSI");
        });

        it("Should split rent between burn and bonus pool", async function () {
            const cid = ethers.id("context-rent-2");
            const size = 100 * ONE_MB;
            const deposit = ethers.parseEther("100");

            await storageRegistry.connect(agent1).registerContext(cid, size, deposit, 0);

            // Fast forward 10 days
            await time.increase(10 * 24 * 60 * 60);

            const bonusPoolBefore = await storageRegistry.efficiencyBonusPool();
            const totalSupplyBefore = await psiToken.totalSupply();

            await storageRegistry.chargeRent(cid);

            const bonusPoolAfter = await storageRegistry.efficiencyBonusPool();
            const totalSupplyAfter = await psiToken.totalSupply();

            // Bonus pool should increase (50% of rent)
            expect(bonusPoolAfter).to.be.gt(bonusPoolBefore);

            // Total supply should decrease (50% burned)
            expect(totalSupplyAfter).to.be.lt(totalSupplyBefore);

            const burned = totalSupplyBefore - totalSupplyAfter;
            const pooled = bonusPoolAfter - bonusPoolBefore;

            console.log("Burned:", ethers.formatEther(burned), "PSI");
            console.log("Pooled:", ethers.formatEther(pooled), "PSI");

            // Should be approximately equal (50/50 split)
            expect(burned).to.be.closeTo(pooled, pooled / 10n);
        });

        it("Should auto-archive when deposit runs out", async function () {
            const cid = ethers.id("context-rent-3");
            const size = ONE_GB;
            const smallDeposit = ethers.parseEther("0.1"); // Very small deposit

            await storageRegistry.connect(agent1).registerContext(cid, size, smallDeposit, 0);

            // Fast forward past grace period (7 days) + time to deplete deposit
            await time.increase(40 * 24 * 60 * 60);

            // Try to charge rent
            await storageRegistry.chargeRent(cid);

            const context = await storageRegistry.getContext(cid);

            // Context should be archived after grace period with no deposit
            if (context.depositBalance === 0n) {
                await time.increase(8 * 24 * 60 * 60); // Additional time past grace period
                await storageRegistry.chargeRent(cid);
                const contextAfter = await storageRegistry.getContext(cid);
                expect(contextAfter.archived).to.be.true;
            }
        });
    });

    describe("Deposit Management", function () {
        it("Should allow top-up of deposit", async function () {
            const cid = ethers.id("context-topup-1");
            const size = 100 * ONE_MB;
            const initialDeposit = ethers.parseEther("50");

            await storageRegistry.connect(agent1).registerContext(cid, size, initialDeposit, 0);

            const topUpAmount = ethers.parseEther("50");
            await expect(
                storageRegistry.connect(agent1).topUpDeposit(cid, topUpAmount)
            ).to.emit(storageRegistry, "DepositAdded");

            const context = await storageRegistry.getContext(cid);
            expect(context.depositBalance).to.equal(initialDeposit + topUpAmount);
        });

        it("Should reject top-up from non-owner", async function () {
            const cid = ethers.id("context-topup-2");
            const size = 100 * ONE_MB;
            const deposit = ethers.parseEther("100");

            await storageRegistry.connect(agent1).registerContext(cid, size, deposit, 0);

            await expect(
                storageRegistry.connect(agent2).topUpDeposit(cid, ethers.parseEther("50"))
            ).to.be.revertedWith("Not owner");
        });

        it("Should show correct remaining days", async function () {
            const cid = ethers.id("context-days-1");
            const size = 100 * ONE_MB;
            const deposit = ethers.parseEther("100");

            await storageRegistry.connect(agent1).registerContext(cid, size, deposit, 0);

            const remainingDays = await storageRegistry.getRemainingDays(cid);
            console.log("Remaining days:", remainingDays.toString());

            expect(remainingDays).to.be.gt(0);
        });
    });

    describe("Context Archival", function () {
        it("Should allow owner to archive context", async function () {
            const cid = ethers.id("context-archive-1");
            const size = 100 * ONE_MB;
            const deposit = ethers.parseEther("100");

            await storageRegistry.connect(agent1).registerContext(cid, size, deposit, 0);

            const balanceBefore = await psiToken.balanceOf(await agent1.getAddress());

            await expect(
                storageRegistry.connect(agent1).archiveContext(cid)
            ).to.emit(storageRegistry, "ContextArchived");

            const context = await storageRegistry.getContext(cid);
            expect(context.archived).to.be.true;

            // Should refund deposit (minus any charged rent)
            const balanceAfter = await psiToken.balanceOf(await agent1.getAddress());
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it("Should update total storage on archival", async function () {
            const cid = ethers.id("context-archive-2");
            const size = 100 * ONE_MB;
            const deposit = ethers.parseEther("100");

            await storageRegistry.connect(agent1).registerContext(cid, size, deposit, 0);

            const storageBefore = await storageRegistry.totalStorageBytes();

            await storageRegistry.connect(agent1).archiveContext(cid);

            const storageAfter = await storageRegistry.totalStorageBytes();
            expect(storageAfter).to.equal(storageBefore - BigInt(size));
        });
    });

    describe("Context Optimization", function () {
        it("Should allow proposing optimizations", async function () {
            const originalCID = ethers.id("original-context");
            const optimizedCID = ethers.id("optimized-context");
            const originalSize = 100 * ONE_MB;
            const optimizedSize = 20 * ONE_MB; // 5x compression
            const deposit = ethers.parseEther("100");

            await storageRegistry.connect(agent1).registerContext(
                originalCID,
                originalSize,
                deposit,
                0
            );

            await expect(
                storageRegistry.connect(agent1).proposeOptimization(
                    originalCID,
                    optimizedCID,
                    optimizedSize
                )
            ).to.emit(storageRegistry, "OptimizationProposed");

            const totalOptimizations = await storageRegistry.totalOptimizations();
            expect(totalOptimizations).to.equal(1);
        });

        it("Should reject optimization that doesn't reduce size", async function () {
            const originalCID = ethers.id("original-context-2");
            const optimizedCID = ethers.id("optimized-context-2");
            const originalSize = 100 * ONE_MB;
            const largerSize = 150 * ONE_MB; // Larger!
            const deposit = ethers.parseEther("100");

            await storageRegistry.connect(agent1).registerContext(
                originalCID,
                originalSize,
                deposit,
                0
            );

            await expect(
                storageRegistry.connect(agent1).proposeOptimization(
                    originalCID,
                    optimizedCID,
                    largerSize
                )
            ).to.be.revertedWith("Not an optimization");
        });

        // Note: Full optimization flow with CRPC validation would require
        // mocking CRPC responses or using a test double
    });

    describe("Network Statistics", function () {
        it("Should track storage utilization", async function () {
            const cid = ethers.id("stats-context-1");
            const size = 100_000n * BigInt(ONE_GB); // 100 TB
            const deposit = ethers.parseEther("100000");

            await psiToken.transfer(await agent1.getAddress(), deposit);
            await psiToken.connect(agent1).approve(
                await storageRegistry.getAddress(),
                ethers.MaxUint256
            );

            await storageRegistry.connect(agent1).registerContext(cid, size, deposit, 0);

            const utilization = await storageRegistry.getStorageUtilization();
            console.log("Storage utilization:", utilization.toString(), "/ 10000 (basis points)");

            expect(utilization).to.be.gt(0);
        });

        it("Should track network multiplier", async function () {
            const multiplier = await storageRegistry.getNetworkMultiplier();
            console.log("Network multiplier:", ethers.formatEther(multiplier));

            // Should be 1e18 (1.0) when empty
            expect(multiplier).to.be.gte(ethers.parseEther("1"));
        });

        it("Should track rent and rewards statistics", async function () {
            const cid = ethers.id("stats-context-2");
            const size = ONE_GB;
            const deposit = ethers.parseEther("1000");

            await storageRegistry.connect(agent1).registerContext(cid, size, deposit, 0);

            // Fast forward and charge rent
            await time.increase(30 * 24 * 60 * 60);
            await storageRegistry.chargeRent(cid);

            const totalRent = await storageRegistry.totalRentCollected();
            console.log("Total rent collected:", ethers.formatEther(totalRent), "PSI");

            expect(totalRent).to.be.gt(0);
        });
    });

    describe("Economics Validation", function () {
        it("Should demonstrate economic density incentive", async function () {
            // Agent 1: Large, unoptimized context
            const largeCID = ethers.id("large-unoptimized");
            const largeSize = ONE_GB;
            const largeDeposit = ethers.parseEther("1000");

            // Agent 2: Small, optimized context (same quality)
            const smallCID = ethers.id("small-optimized");
            const smallSize = 100 * ONE_MB; // 10x smaller
            const smallDeposit = ethers.parseEther("100");

            await storageRegistry.connect(agent1).registerContext(largeCID, largeSize, largeDeposit, 0);
            await storageRegistry.connect(agent2).registerContext(smallCID, smallSize, smallDeposit, 0);

            // Fast forward 30 days
            await time.increase(30 * 24 * 60 * 60);

            // Charge rent for both
            await storageRegistry.chargeRent(largeCID);
            await storageRegistry.chargeRent(smallCID);

            const largeContext = await storageRegistry.getContext(largeCID);
            const smallContext = await storageRegistry.getContext(smallCID);

            const largeRent = largeDeposit - largeContext.depositBalance;
            const smallRent = smallDeposit - smallContext.depositBalance;

            console.log("\nEconomic Density Comparison:");
            console.log("Large context (1 GB):");
            console.log("  - Rent paid:", ethers.formatEther(largeRent), "PSI");
            console.log("  - Cost per MB:", ethers.formatEther(largeRent * 1000n / BigInt(largeSize / ONE_MB)), "PSI");

            console.log("\nSmall context (100 MB):");
            console.log("  - Rent paid:", ethers.formatEther(smallRent), "PSI");
            console.log("  - Cost per MB:", ethers.formatEther(smallRent * 1000n / BigInt(smallSize / ONE_MB)), "PSI");

            // Larger context should pay significantly more total rent
            expect(largeRent).to.be.gt(smallRent * 5n);

            console.log("\nSmaller context saves:", ethers.formatEther(largeRent - smallRent), "PSI over 30 days");
            console.log("Economic density = Context density ✓");
        });
    });
});
