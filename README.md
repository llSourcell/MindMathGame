## MindMathGame
This is simple game which demonstrated how to use Ethereum, Solidy code, truffleframework, Integration with Node.js and socket.io and MetaMask browser plugin.

**Instructions**
 The goal of the game is to accumulate 1000000 score by answering simple math questions. Player is presented with two randomly generated numbers if player guess the number within the time limit wins score reward. If player don't guess will loose reward and score will decrease. If time is over and player can't guess reward will be removed from the score and user will be present with new challenge.

**User win the game if it reaches score 1000000.**

**Hints:**
- Accumulate score points and you can click on Power Up to buy it. This will increase reward and potential loose. When buying power up complexity of questions increases.
- 0 is correct answer.


**How to deploy:**
```objc
- Install Node.js, https://nodejs.org/en/download/
- $ npm install -g truffle
- $ npm install -g ganache-cli
- Install MetaMask browser plugin, https://metamask.io/
```

**How to start**
```objc
$ npm install
$ ganache-cli 
$ truffle compile
$ truffle migrate
from output get MindMathGame: 0xb3793a5f3f12d6a3d88c55346348b7cd81c8698a and store it inside blockchain_interactions.js var contractAddress = "0xb3793a5f3f12d6a3d88c55346348b7cd81c8698a";
- In the browser make sure you have MetaMask installed and connected to the ganache-cli network and your logged in into the account
$ node index.js
- Open browser to  > http://localhost:3000, HTML page for the game to start 
- Start Playing
```

## Credits

Credits for this code go to [KrasimirZI](https://github.com/KrasimirZl/MindMathGame/tree/master/public). I've merely created a wrapper to get people started. 
