/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Global variables and constants
var express = require('express')
var app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mmgContract = require('./blockchain_interactions');


const GAME_WIN_SCORE=1000000; // If Player accumulated 1000000 it will win the game
const QUESTION_TIME_TO_ANSWER=20; // Question time to answer in seconds.
const START_POWERUP = 1;
var timer; // How often game client will be updated.

var active_games={}; // Hold all running games for each Ethereum account


/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Utility functions
/*
 * Return current time in milliseconds
 */
function get_time_milliseconds()
{
    let d = new Date();
    return d.getTime(); 
}

/*
 * Generate random positive integer number using input to decide on number of digits
 */
function generate_random_number(powerup)
{
    let decimal_points=1;
    if(powerup>1000 &&  powerup<10000 )
        decimal_points=10;
    else if(powerup>10000 &&  powerup<100000000 )
        decimal_points=100;
    
    return Math.trunc(Math.random()*decimal_points);
}


/* Change randomly item positions in array
*/
function shuffle_array(array) 
{
    for (let i = array.length - 1; i > 0; i--) 
    {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Game related functions
/* Return true if game is stared, otherwise false
*/
function game_is_started(account_id)
{
    if(typeof active_games[account_id] != 'undefined' &&  (
        active_games[account_id].game_state == "started" ||
        active_games[account_id].game_state == "correct_answer" ||
        active_games[account_id].game_state == "wrong_answer" ) )
        return true;
    return false;
}

/* Push back to game client details for the game using ethereum account
*/
function game_client_update(account_id) 
{
    let question = active_games[account_id].game_first_number.toString() + " + " +  active_games[account_id].game_second_number.toString();
    let time_delta = (get_time_milliseconds() - active_games[account_id].game_question_time_start)/1000; // Calculate elapsed time from start convert in seconds
    let game_question_time_countdown = Math.trunc(QUESTION_TIME_TO_ANSWER - time_delta); // Convert from float to integer
    let response={"game_state":active_games[account_id].game_state,
    "question":question,
    "reward":active_games[account_id].game_reward,
    "score":active_games[account_id].game_score,
    "powerup":active_games[account_id].game_powerup,
    "time_to_answer":game_question_time_countdown,
    "response":active_games[account_id].game_response,
    "response_correct":active_games[account_id].response_correct,
    "answers":"",
    "account_id":account_id};

    console.log("Update game client " + game_question_time_countdown)

    clearTimeout(timer); // Stop updating client

   if( game_is_started(account_id) )
   {
        response.answers = active_games[account_id].game_answers;
        if( game_question_time_countdown > 0 && active_games[account_id].game_score >= 0 ) // Player still have time continue updating the game client
        {
            // Game in the sessions continue, updating the client.
            // Schedule next game client update every 800 milliseconds
            timer = setTimeout(game_client_update, 800, account_id);
        }
        else // player run out of time generate new question
        {
            active_games[account_id].game_score = active_games[account_id].game_score - active_games[account_id].game_reward; // TODO update -1 to be based on powerup level
            if( game_round_generate_question(account_id) == true )
                timer = setTimeout(game_client_update, 800, account_id);
            else // Game over no more score points in the account
            {
                response.time_to_answer = 0;
                active_games[account_id].game_state="game_over";
                response.score = active_games[account_id].game_score = 0;
                response.game_state = active_games[account_id].game_state;
                response.response = "Game Over. I am really sorry. You reached score 0. Solve AI or Die Trying!"
                io.emit('MESSAGE_GAME_OVER', response);  // Notify player game over
                return;
            }
        }
    }

    if( response.time_to_answer < 0 ) // Fix for negative time. Client must see only positive time or 0.
        response.time_to_answer = 0;
    io.emit('MESSAGE_GAME_GUI_UPDATE', response); // Update game client with new data
}

/* Generate 2 integer numbers for the question
* Generate 4 possible answer 1 of it is correct
*/
function game_round_generate_question_answers(account_id, powerup)
{
    // TODO change question generation to be more realistic.
    active_games[account_id].game_first_number = generate_random_number(powerup);
    active_games[account_id].game_second_number = generate_random_number(powerup); 

    active_games[account_id].game_answers[0] = active_games[account_id].game_first_number + active_games[account_id].game_second_number;
    active_games[account_id].game_answers[1] = generate_random_number(powerup); 
    active_games[account_id].game_answers[2] = generate_random_number(powerup); 
    active_games[account_id].game_answers[3] = generate_random_number(powerup);
    shuffle_array(active_games[account_id].game_answers); //randomize game array positions
}

/*
 * Generate new game question round
 * @param {address} account_id 
 * @return true if successful, false if not enough funds game over event
 */
function game_round_generate_question(account_id)
{
    if( game_is_started(account_id) == true ) // update existing game, player hasn't provided answer yet
    {
        if( active_games[account_id].game_score < 0 ) // Player don't have more funds game over
            return false;
        game_round_generate_question_answers(account_id, active_games[account_id].game_powerup)
        active_games[account_id].game_reward = active_games[account_id].game_powerup;
        active_games[account_id].game_question_time_start = get_time_milliseconds();
    }
    else // Generate new game
    {
        active_games[account_id] = {
        game_state:"started",
        game_powerup:START_POWERUP,
        game_first_number:START_POWERUP,
        game_second_number:START_POWERUP,
        game_reward:START_POWERUP,
        game_question_time_start:get_time_milliseconds(),
        game_score:0,
        game_response:"",
        game_answers:[0,0,0,0]};
        game_round_generate_question_answers(account_id, START_POWERUP);
    }

    return true;
}

/* Process MESSAGE_GAME_START event from client
*/
function game_start(msg)
{
    let account_id = msg.account_id;
    console.log('game_start: ' + account_id);
    // Call Ethereum contract to initialize game storage structures.
    mmgContract.mmgCreateGame(account_id);
}

/* Process MESSAGE_GAME_INIT event from client
* Init game state structure for first time
*/
function game_init(msg)
{
    let account_id = msg.account_id;
    if(typeof active_games[account_id] == 'undefined') // Game account don't exists initialize
    {
        console.log('game_init: ' + account_id);
        // Initialize new game account
        active_games[account_id] = {
            game_state:"game_init",
            game_powerup:START_POWERUP,
            game_first_number:generate_random_number(START_POWERUP),
            game_second_number:generate_random_number(START_POWERUP),
            game_reward:START_POWERUP,
            game_question_time_start:get_time_milliseconds(),
            game_score:0,
            game_response:"",
            game_answers:[0,0,0,0]};
        
        console.log(active_games[account_id]);
    }
    // update game client GUI
    game_client_update(account_id);
}

/* Process MESSAGE_GAME_GIVEUP event from client
* Update game stated that is stopped and notify client for it
*/
function game_giveup(msg)
{
    let account_id = msg.account_id;
    console.log('game_giveup: ' + account_id);
    clearTimeout(timer); // Stop updating clients
    if( game_is_started(account_id) == true ) // Stop only if game is started
    {
        active_games[account_id].game_state = "stopped";
        active_games[account_id].game_answers = "Game give up.";
        // Call ethereum contract mmgUpdateGameScore to update score
        mmgContract.mmgUpdateGameScore(active_games[account_id].game_score, account_id);
    }
    io.emit('MESSAGE_GAME_GIVEUP_RESPONSE', {"account_id":account_id});
}

/* Process MESSAGE_GAME_SEND_ANSWER event from client
* Player answer the question evaluate if it is correct or not and send response back to the client
*/
function game_player_answer(msg)
{
    let account_id = msg.account_id;
    console.log('game_player_answer: ' + account_id + " answer:" + msg.answer);
    let sum = active_games[account_id].game_first_number +  active_games[account_id].game_second_number;
   
    if( !(!msg.answer || 0 === msg.answer.length) &&  Number(msg.answer) == sum ) // correct answer
    {
        // Increase game_score
        active_games[account_id].game_score = active_games[account_id].game_score + active_games[account_id].game_reward;
        // Check if player WON
        if( active_games[account_id].game_score >= GAME_WIN_SCORE )
        {
            game_giveup(account_id);
            io.emit('MESSAGE_GAME_WIN', {"account_id":account_id}); // Send message to game client to end the game and show WIN prize :)
            console.log("Game WON:" + account_id );
        }
        else
        {
            // Continue playing
            // Send success message back to player
            active_games[account_id].game_response = "Your answer " + msg.answer + " is correct! You won: " + active_games[account_id].game_reward;
            active_games[account_id].game_state="correct_answer";
            game_round_generate_question(account_id);
            // update game client GUI
            game_client_update(account_id);
            // Send message to game client that answer is correct
            io.emit('MESSAGE_GAME_ANSWER_CORRECT', {"account_id":account_id});
        }
    }
    else // Incorrect answer decrease score and try to generate new question
    {
        // Decrement player game_score
        active_games[account_id].game_score = active_games[account_id].game_score - active_games[account_id].game_reward;
        // Send wrong answer message back to player
        active_games[account_id].game_response = "Your answer " + msg.answer + " is WRONG! You lost: " + active_games[account_id].game_reward;
        active_games[account_id].game_state="wrong_answer";
        let result = game_round_generate_question(account_id);
        // update game client GUI
        game_client_update(account_id);
        // Send message to game client that answer is wrong
        io.emit('MESSAGE_GAME_ANSWER_WRONG', {"account_id":account_id});
    }
}

/* Process MESSAGE_GAME_BUY_POWERUP event from client
* Player want to buy power up check if it has enough score funds
*/
function game_buy_powerup(msg)
{
    let account_id = msg.account_id;
    let requested_power_up = msg.requested_powerup;
    if( game_is_started(account_id) == true ) // Buy power up only if game is started
    {
        console.log("game_buy_powerup: " + account_id + " Power Up:" +  requested_power_up);
        // If player have sufficient funds allow buy power up.
        if( requested_power_up > 0 && (active_games[account_id].game_score-requested_power_up) >= 0  )
        {
            // Call ethereum contract mmgUpdateGameScore to update score first
            mmgContract.mmgUpdateGameScore(active_games[account_id].game_score, account_id);
            // Call ethereum contract mmgBuyPowerUp to buy power u p. If successful it will emit gameUpdatedEvent
            mmgContract.mmgBuyPowerUp(requested_power_up, account_id);
        }
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Ethereum contract emited events
var gameCreatedEvent = mmgContract.MindMathGameInstance.GameCreated();
var gameUpdatedEvent = mmgContract.MindMathGameInstance.GameUpdated();

/* Process events from Ethereum call mmgCreateGame()
*  Event is generated once Ethereum call is processed
*/
gameCreatedEvent.watch(function(error, result){
	if (!error)
		{
            let address = result.args.game_address.toString(10);
            let power_up = Number(result.args.game_power_up.toString(10));
            let score  = Number(result.args.game_score.toString(10));

            // If game structure is already initialized update it and the client
            if( active_games[address] != null )
            {
                // Generate question and reward
                game_round_generate_question(address);
                // Update game state
                active_games[address].game_powerup = power_up; 
                active_games[address].game_score = score; 
                active_games[address].game_reward = power_up;
                // Init game client
                io.emit('MESSAGE_GAME_START_RESPONSE', {"account_id":address}); // Update game client with new data
                // start updating game GUI
                game_client_update(address);
            }
		} else {
			console.log(error);
		}
});

gameUpdatedEvent.watch(function(error, result){
	if (!error)
		{
            let address = result.args.game_address.toString(10);
            let power_up = Number(result.args.game_power_up.toString(10));
            let score  = Number(result.args.game_score.toString(10));

            // If game structure is already initialized update it and the client
            if( active_games[address] != null )
            {
                active_games[address].game_powerup = power_up; 
                active_games[address].game_score = score; 
                active_games[address].game_reward = power_up;

                // update game client GUI
                game_client_update(address);
            }
		} else {
			console.log(error);
		}
});


/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Socket.io listen for incoming messages from browser client
io.on('connection', function(socket){
    console.log('Game client connected');
    socket.on('disconnect', function(){
      console.log('Game client disconnected');
    });
    socket.on('MESSAGE_GAME_INIT', function(msg){
        game_init(msg);
    });
    socket.on('MESSAGE_GAME_START', function(msg){
        game_start(msg);
    });
    socket.on('MESSAGE_GAME_GIVEUP', function(msg){
        game_giveup(msg);
    });
    socket.on('MESSAGE_GAME_SEND_ANSWER', function(msg){
        game_player_answer(msg);
    });
    socket.on('MESSAGE_GAME_BUY_POWERUP', function(msg){
        game_buy_powerup(msg);
    });
  });


/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Server static pages from /public folder
app.use(express.static('public'))

http.listen(3000, function(){
  console.log('http://localhost:3000');
});