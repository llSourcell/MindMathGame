var MindMathGame = artifacts.require("./MindMathGame.sol");

module.exports = function(deployer) {
  deployer.deploy(MindMathGame);
};
