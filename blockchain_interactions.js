/* Configuration variables */
var contractAddress = "0x43833c47907be9780581c0fbee97cc6e4f0a99c9";
var ABI = require("./build/contracts/MindMathGame.json").abi;
var web3Host    = 'http://localhost';
var web3Port    = '8545';
var exports = module.exports = {};

/* web3 initialization */
var Web3 = require('web3');
var web3 = new Web3();

web3.setProvider(new web3.providers.HttpProvider(web3Host + ':' + web3Port));
if (!web3.isConnected()) {
	console.error("Ethereum - no connection to RPC server");
} else {
	console.log("Ethereum - connected to RPC server");
}

// Get first default Ethereum account. This will be contract owner account.
var account = web3.eth.accounts[0];
var sendDataObject = {
	from: account,
	gas: 300000,
};

// creation of contract object
var MindMathGameContract = web3.eth.contract(ABI);
// initiate contract for an address
exports.MindMathGameInstance = MindMathGameContract.at(contractAddress); // export MindMathGameInstance to be visible in other js files 


// Call game MindMathGameSetOwner with var account = web3.eth.accounts[0], no other account can change data inside the contract
var result = exports.MindMathGameInstance.MindMathGameSetOwner.sendTransaction(sendDataObject, function (err, result) {
	if (err) {
		console.error("Ethereum contract. MindMathGameSetOwner, Transaction submission error:", err);
	} else {
		console.log("Ethereum contract. MindMathGameSetOwner success. Transaction hash:", result);
	}
});

/* Call Ethereum contract to create new game
*/
exports.mmgCreateGame = function(_game_address)
//function mmgCreateGame( _game_address )
{
	var result = exports.MindMathGameInstance.createGame.sendTransaction(_game_address, sendDataObject, function (err, result) {
		if (err) {
			console.error("Ethereum contract. createGame, Transaction submission error:", err);
		} else {
			console.log("Ethereum contract. createGame success. Transaction hash:", result);
		}
	});
}

/* Call Ethereum contract to update/store the game score
*/
exports.mmgUpdateGameScore = function( _new_score, _game_address)
{
	var result = exports.MindMathGameInstance.updateGameScore.sendTransaction(_new_score, _game_address, sendDataObject, function (err, result) {
		if (err) {
			console.error("Ethereum contract. updateGameScore submission error:", err);
		} else {
			console.log("Ethereum contract. updateGameScore success. Transaction hash:", result);
		}
	});
	return result;
}

/* Call Ethereum contract to buy power up.
* @return true if success, false if not score funds on the _game_address
*/
exports.mmgBuyPowerUp = function( _desired_power_up, _game_address )
{
	var result = exports.MindMathGameInstance.buyPowerUp.sendTransaction(_desired_power_up, _game_address, sendDataObject, function (err, result) {
		if (err) {
			console.error("Ethereum contract. buyPowerUp submission error:", err);
		} else {
			console.log("Ethereum contract. buyPowerUp success. Transaction hash:", result);
		}
	});
	return result;
}

/* Get from Ethereum contract to get game_score and game_power_up
*/
exports.mmgGetGameDetails = function( _game_address )
{
	var result = exports.MindMathGameInstance.getGameDetails.sendTransaction(_game_address, sendDataObject, function (err, result) {
		if (err) {
			console.error("Ethereum contract. getGameDetails submission error:", err);
		} else {
			console.log("Ethereum contract. getGameDetails success. Transaction hash:", result);
		}
	});
}





