var assert = require('chai').assert;
import hre from "hardhat";

let regName = "alice.ccns";
let chainSelector;

let localSimulator;
let CCNSLookupReceiver;
let CCNSLookupSource;
let CCNSRegister;
let CCNSReceiver;

let config: {
	chainSelector_: BigInt;
	sourceRouter_: String;
	destinationRouter_: String;
	wrappedNative_: String;
	linkToken_: String;
	ccipBnM_: String;
	ccipLnM_: String;
	};

try
{
	describe('Setup CCNS Resources', function() {
		setupLocal();
		deployLocal();
		register();
	});
}
catch(e)
{
	console.log(e.message);
}

function setupLocal(){
	it('Setup Simulator', async function() {
		const localSimulatorFactory = await ethers.getContractFactory("CCIPLocalSimulator");
		localSimulator = await localSimulatorFactory.deploy();

		config = await localSimulator.configuration();

		chainSelector = config.chainSelector_;
		//console.log("Config Chain Selector: " + chainSelector);
		assert.equal(chainSelector, 16015286601757825753, "Chain selector does not match ethereum Sepolia");

		//console.log("Source Router: " + config.sourceRouter_);
		//console.log("Destination Router: " + config.destinationRouter_);
	});
}

function deployLocal(){
	it('Deploy Contracts', async function() {
		// Set up the source side
		// Do this in one block as the objects are constructed to avoid crossing them.
		// Refer to the source network (router for local)
		const CCNSLookupFactory = await ethers.getContractFactory("CrossChainNameServiceLookup");
		CCNSLookupSource = await CCNSLookupFactory.deploy();
		//console.log("CCNSLookupSource deployed: " + CCNSLookupSource.address);

		const CCNSRegisterFactory = await ethers.getContractFactory("CrossChainNameServiceRegister");
		CCNSRegister = await CCNSRegisterFactory.deploy(config.sourceRouter_, CCNSLookupSource.address);
		//console.log("CCNSRegister deployed.");

		const tx = await CCNSLookupSource.setCrossChainNameServiceAddress(CCNSRegister.address);
		//console.log("Source service address set to:" + JSON.stringify(CCNSRegister.address));

		// Now set up the destination/receiver side.
		// Refer to the destination network (router for local)
		CCNSLookupReceiver = await CCNSLookupFactory.deploy();
		//console.log("CCNSLookupReceiver deployed: " + CCNSLookupReceiver.address);

		const CCNSReceiverFactory = await ethers.getContractFactory("CrossChainNameServiceReceiver");
		CCNSReceiver = await CCNSReceiverFactory.deploy(config.destinationRouter_, CCNSLookupReceiver.address, chainSelector);
		//console.log("CCNSReceiver deployed.");

		await CCNSLookupReceiver.setCrossChainNameServiceAddress(CCNSReceiver.address);
		//console.log("Receiver service address set to: " + CCNSReceiver.address);

		// Although the CCNSRegister is "source side", we can't do this until the
		// CCNSReceiver is created.
		await CCNSRegister.enableChain(chainSelector, CCNSReceiver.address, 500_000);
		//console.log("Enabled chain: " + chainSelector);
	});
}

function register () {
	it('Register and Test', async function() {

		// This wasn't required to make this work on "localhost" but
        	// https://github.com/smartcontractkit/ccip-cross-chain-name-service/tree/main?tab=readme-ov-file
        	// discusses funding the CCNSRegister contract, so we'll keep the code (it's useful as a reference).

		//await fund(CCNSRegister.address, BigInt(1000000000000000000));

		const txReg = await CCNSRegister.register(regName); 
		await txReg.wait();
		console.log("Registered: " + regName);

		const resultSource = await CCNSLookupSource.lookup(regName);
		console.log("Source Result: " + resultSource);
		assert.notEqual(resultSource, 0, "Source Receiver Lookup result must not be zero");

		const resultDest = await CCNSLookupReceiver.lookup(regName);
		console.log("Receiver Result: " + resultDest);
		assert.notEqual(resultDest, 0, "Source Receiver Lookup result must not be zero");

		assert.equal(resultSource, resultDest, "Source and Destination lookups don't match.");
	});
}

async function fund(ccnsRegisterAddress, amount)
{
	//console.log("Funding: " + ccnsRegisterAddress + " with " + amount);
	//console.log("Network Name: " + hre.network.name);
	//console.log("Default Network Name: " + hre.config.defaultNetwork);

        const [signer] = await hre.ethers.getSigners();

        //console.log(`ℹ️  Attempting to send ${amount} wei to CrossChainNameServiceRegister smart contract (${ccnsRegisterAddress}) on the ${hre.network.name} blockchain`);

        const tx = await signer.sendTransaction({ to: ccnsRegisterAddress, value: amount });
        await tx.wait();
        //console.log(`✅ Transaction hash: ${tx.hash}`);

        const balance = await hre.ethers.provider.getBalance(ccnsRegisterAddress);
        //console.log(`ℹ️  CrossChainNameServiceRegister balance (in wei): ${balance}`);
	assert.isAtLeast(balance, amount, "Funding failed - balance " + balance + " is less than " + amount);
}
