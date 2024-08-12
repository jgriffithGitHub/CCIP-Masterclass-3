The resources in the repository ae my own work based on the instructions provided in the CCIP Bootcamp.

To use them:

1: clone the https://github.com/smartcontractkit/ccip-cross-chain-name-service repository
2: "cd" into the repository directory ("ccip-cross-chain-name-service" in my case).
3: install "node.js" and use version 18 with "nvm use 18" (this was the version Hardhat required - you may need a different version)
4: install Hardhat locally with "npm install --save-dev hardhat". I did not run "npx hardhat init" as tis was covered by the repository.
5: place "CCIPLocalSimulator.sol" in the "contracts" directory.
6: create a directory named "test" an place "test/test.ts" from this repository in it
7: run the test with "npx hardhat test --network localhost"
