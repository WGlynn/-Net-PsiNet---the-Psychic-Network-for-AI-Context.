const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting ERC-8004 Registry Deployment for ΨNet...\n");

  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("📋 Deployment Details:");
  console.log("  Network:", network);
  console.log("  Deployer:", deployer.address);
  console.log("  Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Configuration
  const MINIMUM_REPUTATION_STAKE = hre.ethers.parseEther("0.01"); // 0.01 ETH
  const MINIMUM_REQUEST_STAKE = hre.ethers.parseEther("0.01");    // 0.01 ETH
  const MINIMUM_VALIDATOR_STAKE = hre.ethers.parseEther("0.05");  // 0.05 ETH

  console.log("⚙️  Configuration:");
  console.log("  Reputation Min Stake:", hre.ethers.formatEther(MINIMUM_REPUTATION_STAKE), "ETH");
  console.log("  Validation Request Stake:", hre.ethers.formatEther(MINIMUM_REQUEST_STAKE), "ETH");
  console.log("  Validator Min Stake:", hre.ethers.formatEther(MINIMUM_VALIDATOR_STAKE), "ETH\n");

  // 1. Deploy Identity Registry
  console.log("📝 [1/3] Deploying IdentityRegistry...");
  const IdentityRegistry = await hre.ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("  ✅ IdentityRegistry deployed at:", identityRegistryAddress);
  console.log();

  // 2. Deploy Reputation Registry
  console.log("📝 [2/3] Deploying ReputationRegistry...");
  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy(
    identityRegistryAddress,
    MINIMUM_REPUTATION_STAKE
  );
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log("  ✅ ReputationRegistry deployed at:", reputationRegistryAddress);
  console.log();

  // 3. Deploy Validation Registry
  console.log("📝 [3/3] Deploying ValidationRegistry...");
  const ValidationRegistry = await hre.ethers.getContractFactory("ValidationRegistry");
  const validationRegistry = await ValidationRegistry.deploy(
    identityRegistryAddress,
    MINIMUM_REQUEST_STAKE,
    MINIMUM_VALIDATOR_STAKE
  );
  await validationRegistry.waitForDeployment();
  const validationRegistryAddress = await validationRegistry.getAddress();
  console.log("  ✅ ValidationRegistry deployed at:", validationRegistryAddress);
  console.log();

  // Prepare deployment info
  const deploymentInfo = {
    network: network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      IdentityRegistry: identityRegistryAddress,
      ReputationRegistry: reputationRegistryAddress,
      ValidationRegistry: validationRegistryAddress,
    },
    configuration: {
      minimumReputationStake: hre.ethers.formatEther(MINIMUM_REPUTATION_STAKE),
      minimumRequestStake: hre.ethers.formatEther(MINIMUM_REQUEST_STAKE),
      minimumValidatorStake: hre.ethers.formatEther(MINIMUM_VALIDATOR_STAKE),
    },
  };

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("💾 Deployment info saved to:", deploymentFile);
  console.log();

  // Print summary
  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(60));
  console.log("\n📊 Deployed Contracts:");
  console.log("  IdentityRegistry:   ", identityRegistryAddress);
  console.log("  ReputationRegistry: ", reputationRegistryAddress);
  console.log("  ValidationRegistry: ", validationRegistryAddress);
  console.log();

  if (network !== "hardhat" && network !== "localhost") {
    console.log("🔍 Verify contracts with:");
    console.log(`  npx hardhat verify --network ${network} ${identityRegistryAddress}`);
    console.log(`  npx hardhat verify --network ${network} ${reputationRegistryAddress} ${identityRegistryAddress} ${MINIMUM_REPUTATION_STAKE}`);
    console.log(`  npx hardhat verify --network ${network} ${validationRegistryAddress} ${identityRegistryAddress} ${MINIMUM_REQUEST_STAKE} ${MINIMUM_VALIDATOR_STAKE}`);
    console.log();
  }

  console.log("📚 Next steps:");
  console.log("  1. Update your frontend with the contract addresses");
  console.log("  2. Grant roles to authorized validators and resolvers");
  console.log("  3. Test the integration with sample agents");
  console.log("  4. Monitor contract events for agent registration");
  console.log();

  console.log("🌐 Integration guide: See ERC8004_INTEGRATION.md");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
