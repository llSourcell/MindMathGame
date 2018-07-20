pragma solidity ^0.4.0;

contract MindMathGame
{
    event GameCreated(int game_score, int game_power_up, address game_address );
    event GameUpdated(int game_score, int game_power_up, address game_address );    

    struct game 
    {
        int game_score;  //Store game score
        int game_power_up; //Store game pwoer up, possible v alues 1, 10, 100, 1000, 10000, 100000
    }

    // Store fore each user account score and last PowerUp bought
    mapping (address => game) games;
    address owner; // Only owner is allowed to modify data in the contract but evryone can view it

    // Init contract owner. Only owner is allowed to update the values
    function MindMathGameSetOwner() public 
    {
        owner = msg.sender;
    }

    // Create new game
    function createGame( address game_address ) public returns (address)
    {
        // If it is not owner, don't allow game creation
        if (msg.sender != owner) return;

        games[game_address].game_score = 0;
        games[game_address].game_power_up = 1;
        emit GameCreated(games[game_address].game_score, games[game_address].game_power_up, game_address);  // Send event back to game client that game is created
        return game_address;
    }

    // Update game score
    function updateGameScore(int score_new, address game_address ) public returns (bool updated) 
    {
        // If it is not owner, don't allow game creation
        if (msg.sender != owner) return;

        // Allow only positive socre to be stored here
        if( score_new >= 0 )
        {
            games[game_address].game_score = score_new;
            emit GameUpdated(games[game_address].game_score, games[game_address].game_power_up, game_address);  // Send event back to game client that game is updated
            return true;
        }
        return false;
    }
    
    // Read the game details for address
    function getGameDetails( address game_address ) public returns (int score) 
    {
        emit GameUpdated(games[game_address].game_score, games[game_address].game_power_up, game_address);  // Send event back to game client that game is updated
        return games[game_address].game_score;
    }

    /// Buy power up if player has enough score points in the account.
    function buyPowerUp(int power_up_amount, address game_address ) public returns (bool sufficient) 
    {
        // If it is not owner, don't allow game creation
        if (msg.sender != owner) return;

        if( power_up_amount > 0 )
        {
            if( games[game_address].game_score - power_up_amount < 0 ) 
                return false; // Insuficenet Funds
            games[game_address].game_score = games[game_address].game_score - power_up_amount;
            games[game_address].game_power_up = power_up_amount;
            emit GameUpdated(games[game_address].game_score, games[game_address].game_power_up, game_address);  // Send event back to game client that game is updated
            return true; // PowerUp successfully bought
        }
        return false; // Negaitve PowerUpAmmount not supported
    }
}