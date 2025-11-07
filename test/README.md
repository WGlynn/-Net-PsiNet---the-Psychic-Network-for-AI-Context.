# ERC-8004 Test Suite

Comprehensive test suite for the ΨNet ERC-8004 implementation.

## Overview

This test suite covers all three core registries with extensive unit tests:

- **IdentityRegistry.test.js** - 50+ tests for agent identity management
- **ReputationRegistry.test.js** - 60+ tests for reputation and feedback
- **ValidationRegistry.test.js** - 70+ tests for validation and disputes

## Test Coverage

### IdentityRegistry (50+ tests)
- ✅ Agent registration
- ✅ URI management (get, update)
- ✅ Agent deactivation
- ✅ NFT transfers and ownership
- ✅ Multi-agent management
- ✅ Edge cases and error handling

### ReputationRegistry (60+ tests)
- ✅ Regular and staked feedback posting
- ✅ Multiple feedback types (positive, negative, neutral, dispute)
- ✅ Reputation score calculation
- ✅ Time-weighted and stake-weighted scoring
- ✅ Feedback retrieval and filtering
- ✅ Dispute mechanisms
- ✅ Stake slashing
- ✅ Access control
- ✅ Edge cases

### ValidationRegistry (70+ tests)
- ✅ Validation requests (staked, TEE, ZK proof)
- ✅ Staked validation submission
- ✅ TEE attestation validation
- ✅ Zero-knowledge proof validation
- ✅ Validation finalization
- ✅ Expired validations
- ✅ Dispute and resolution
- ✅ Success rate tracking
- ✅ Stake management
- ✅ Access control

## Running Tests

### Prerequisites

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npx hardhat test test/IdentityRegistry.test.js
npx hardhat test test/ReputationRegistry.test.js
npx hardhat test test/ValidationRegistry.test.js
```

### Run with Gas Reporter

```bash
REPORT_GAS=true npm test
```

### Run with Coverage

```bash
npm run test:coverage
```

## Test Structure

Each test file follows this structure:

```javascript
describe("ContractName", function () {
  // Setup
  beforeEach(async function () {
    // Deploy contracts
    // Set up test accounts
  });

  describe("Feature Group", function () {
    it("Should test specific behavior", async function () {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Key Testing Patterns

### 1. Event Verification

```javascript
const tx = await contract.someFunction();
const receipt = await tx.wait();
const event = receipt.logs.find(
  (log) => log.fragment && log.fragment.name === "EventName"
);
expect(event.args.param).to.equal(expectedValue);
```

### 2. Revert Testing

```javascript
await expect(
  contract.someFunction()
).to.be.revertedWith("Error message");
```

### 3. Balance Changes

```javascript
const balanceBefore = await ethers.provider.getBalance(address);
// ... transaction ...
const balanceAfter = await ethers.provider.getBalance(address);
expect(balanceAfter).to.be.greaterThan(balanceBefore);
```

### 4. Time Manipulation

```javascript
const { time } = require("@nomicfoundation/hardhat-network-helpers");
await time.increase(86400); // Increase by 1 day
```

## Test Coverage Goals

- ✅ **Line Coverage**: > 95%
- ✅ **Branch Coverage**: > 90%
- ✅ **Function Coverage**: 100%
- ✅ **Statement Coverage**: > 95%

## CI/CD Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

## Gas Optimization Tests

Enable gas reporting to track optimization:

```bash
REPORT_GAS=true npm test
```

Expected gas costs:
- Register Agent: ~150,000 gas
- Post Feedback: ~100,000 gas
- Request Validation: ~80,000 gas
- Submit Validation: ~120,000 gas

## Security Testing

Tests include security checks for:
- ✅ Access control (only authorized users can perform actions)
- ✅ Reentrancy protection (no reentrancy attacks possible)
- ✅ Integer overflow/underflow (using Solidity 0.8.x)
- ✅ Front-running protection (via staking mechanisms)
- ✅ Stake slashing (economic security)

## Edge Cases

Tests cover edge cases including:
- Empty inputs
- Non-existent IDs
- Expired deadlines
- Insufficient stakes
- Unauthorized access
- Multiple operations
- Boundary conditions

## Debugging Tests

To debug a specific test:

```bash
npx hardhat test test/IdentityRegistry.test.js --grep "Should register"
```

To see console logs:

```javascript
console.log("Debug info:", value);
```

## Adding New Tests

When adding new functionality:

1. Create test file or add to existing
2. Follow the existing structure
3. Cover happy path and error cases
4. Test edge cases
5. Verify events
6. Check state changes
7. Test access control
8. Run full test suite

## Common Issues

### Issue: "Cannot read properties of undefined"
**Solution**: Ensure contract is deployed in `beforeEach`

### Issue: "Transaction reverted without a reason"
**Solution**: Check error messages in contract code

### Issue: "Timeout exceeded"
**Solution**: Increase timeout in `hardhat.config.js`:
```javascript
mocha: { timeout: 60000 }
```

## Resources

- [Hardhat Testing Docs](https://hardhat.org/tutorial/testing-contracts)
- [Chai Assertions](https://www.chaijs.com/api/bdd/)
- [Ethers.js Docs](https://docs.ethers.org/v6/)
- [OpenZeppelin Test Helpers](https://docs.openzeppelin.com/test-helpers/)

## Contributing

When contributing tests:
- Write descriptive test names
- Follow existing patterns
- Aim for comprehensive coverage
- Document complex logic
- Keep tests independent
- Clean up after tests

---

**Happy Testing! 🧪**
