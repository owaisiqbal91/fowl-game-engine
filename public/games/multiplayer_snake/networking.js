var socket = io();

gameData = {
	joined: false,
	limit: 2
};

remainingPlayerCount = gameData.limit;

socket.emit('check-availability', { 
	user: ''
});

socket.on('check-availability-response', function(game) {
	if (game.availability) {
		//check if already joined
		//else, join
		var data = {
			keypress: 'right',
			score: 0,
			initialPos: {x: 10, y: 14}
		};
		if(!gameData.joined) {
			gameData.user = { 
				name: 'user',
				data: data,
				data_initial: {
					keypress: 'right',
					score: 0,
					foodEaten: 0,
					rottenFoodEaten: 0,
					initialPos: {x: 10, y: 14}
				}
			}
			joinGame(gameData.user);
		}
	} else {
		//create game
		createGame({
			user: 'host',
			limit: gameData.limit
		});
	}
});

socket.on('game-created', function(game) {
	//join game
	var data = {
		keypress: 'right',
		score: 0,
		initialPos: {x: 10, y: 10}
	};
	gameData.user = { 
		name: 'host',
		data: data,
		data_initial: {
			keypress: 'right',
			score: 0,
			foodEaten: 0,
			rottenFoodEaten: 0,
			initialPos: {x: 10, y: 10}
		}
	}
	joinGame(gameData.user);
});

//all users will get this, as this is broadcasted by server
socket.on('game-joined', function(game) {
	if (!game) {
		console.log('Sorry! you could not join the game');
		return;
	};

	//join user as player
	if (!gameData.joined) {
		gameData.joined = true;
		//initialize the game
		init();
	};
	
	//check if all users have joined or not
	if (game.users.length == gameData.limit) {
		//start game
		console.log('Now you can start the game');
		socket.emit('start-game', '');
	} else {
		console.log('Still waiting for ' + (gameData.limit - game.users.length) + ' users');
		remainingPlayerCount = gameData.limit - game.users.length;
	}
	
});

socket.on('game-started', function(game) {
	if (!game) {
		console.log('Sorry! could not start the game');
		return;
	};
	gameData.game = game;
	//start game here
	//start game for all users
	console.log('Starting game');

	startGame(game.users);
});

socket.on('game-data-updated', function(game) {
	if (!game) {
		console.log('Sorry! could not update the game');
		return;
	};
	gameData.game = game;
	//update game here
	//update game for all users
	console.log('Updating food position', game.data.food);
	updateFoodStates(game.data.food);
});

socket.on('keypress-updated', function(game) {
	if (!game) {
		console.log('Sorry! could not update the game');
		return;
	};
	gameData.game = game;
	//update game here
	//update game for all users
	console.log('Updating users');
	updatePlayerStates(game.users);
});

socket.on('score-updated', function(game) {
	if (!game) {
		console.log('Sorry! could not update the game');
		return;
	};
	gameData.game = game;
	//update game here
	//update game for all users
	console.log('Updating score', game.users);
	updateScores(game.users);
});

socket.on('game-restarted', function(game) {
	if (!game) {
		console.log('Sorry! could not restart the game');
		return;
	};
	gameData.game = game;
	gameData.user.data = {
      keypress: gameData.user.data_initial.keypress,
      score: gameData.user.data_initial.score,
      initialPos: gameData.user.data_initial.initialPos
    };
	//update game here
	//update game for all users
	console.log('Restarting game');
	updatePlayerStates(game.users);
	updateScores(game.users);
	PubSub.publishSync("restartGame", {});
});

function updateKeypress(data) {
	socket.emit('update-keypress', data);
}

function updateGameData(data) {
	if (isHost()) {
		socket.emit('update-game-data', data);
	}
}

function createGame(config) {
	socket.emit('create-game', config);
}

function joinGame(user) {
	socket.emit('join-game', user);
}

function restartGame() {
	if (isHost()) {
		socket.emit('restart-game', gameData.user);
	} else {
        alert("Sorry, only host can restart the game!")
    }
}

function getRemainingPlayerCount() {
	return remainingPlayerCount;
}

function incrementScore(playerName) {
	if (isCurrentPlayer(playerName)) {
		gameData.user.data.score += 3;
    	socket.emit('update-score', gameData.user);
	}   
}

function decrementScore(playerName) {
	if (isCurrentPlayer(playerName)) {
    	gameData.user.data.score -= 1;
    	socket.emit('update-score', gameData.user);
	}
}

function isGameValid() {
	if (!gameData && !gameData.user) {
        return false;
    };

    if (!gameData.game) {
        return false;
    };
    return true;
}

function setFoodPosition(gridX, gridY) {
	if (!gameData.game.data) {
        gameData.game.data = {
            food: {}
        }
    };
    gameData.game.data.food.gridX = gridX;
    gameData.game.data.food.gridY = gridY;
	updateGameData(gameData.game.data);
}

function getPlayer() {
	return gameData.user.name;
}

function isHost() {
	return getPlayer() == 'host';
}

function isCurrentPlayer(playerName) {
	return getPlayer() == playerName;
}
