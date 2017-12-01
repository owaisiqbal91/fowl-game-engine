var express = require('express');
var app = express();
var path = require('path')
var http = require('http').Server(app);
var io = require('socket.io')(http);

var public_path = path.join(__dirname, 'public');

app.use('/', express.static(public_path));

app.get('/documentation', function(req, res){
  res.sendFile('app/documentation.html', { root: public_path});
});

app.get('/game/:id', function(req, res){
  var name = req.params['id'];
  res.sendFile('games/' + name + '/' + name + '.html', { root: public_path});
});

app.get('/game-data', function(req, res){
  res.send(game);
});

app.get('/', function(req, res){
  res.sendFile('app/index.html', { root: public_path});
});

var game = {
	availability: false,
	limit: 2,
	users: []
};

app.get('/reset', function(req, res){
  game = {
	availability: false,
	limit: 2,
	users: []
  };
  res.send(game);
});

io.on('connection', function(socket){
  var userInContext;
  socket.on('disconnect', function(socket) {
    console.log('some user disconnected', userInContext);
    if (userInContext === 'host') {
      game = {
        availability: false,
        limit: 2,
        users: []
      };
    }
  });
  socket.on('check-availability', function(){
    socket.emit('check-availability-response', game);
  });
  socket.on('create-game', function(config){
  	if (!game.availability) {
		console.log('Game created by : ' + config);
	    game.availability = true;
	    game.host = config.user;
	    game.limit = config.limit || game.limit;
	    socket.emit('game-created', game);
  	} else {
  		console.log('Cant create game');
  	}
  });
  socket.on('update-game-data', function(data) {
  	if (game.availability) {
  			//update game
  			game.data = data;
  			console.log('Updating game data');
		    io.emit('game-data-updated', game);
  	} else {
  		console.log('Cant update game');
  	}
  });
  socket.on('update-score', function(data) {
    if (game.availability) {
      if (data.name) {
        console.log('score-update',data.name);
        game.users.forEach(function(user) {
          if (user.name === data.name) {
            user.data.score = data.data.score;
            console.log('Updating game score', user.name, user.data.score);
          };
        });
      }
      io.emit('score-updated', game);
    } else {
      console.log('Cant update score');
    }
  });
  socket.on('update-keypress', function(data) {
    if (game.availability) {
      if (data.name) {
        game.users.forEach(function(user) {
          if (user.name === data.name) {
            user.data.keypress = data.data.keypress;
            console.log('Updating game user keypress', user.name, user.data.keypress);
          };
        });
      }
    io.emit('keypress-updated', game);
    } else {
      console.log('Cant update keypress');
    }
  });
  socket.on('start-game', function(){
  	if (game.availability) {
  		console.log('Starting game');
		socket.emit('game-started', game);
  	} else {
  		console.log('Cant start game');
  	}
  });
  socket.on('restart-game', function(){
  	if (game.availability) {
  		console.log('Restarting game');
  		game.users.forEach(function(user) {
  			user.data = {
          keypress: user.data_initial.keypress,
          score: user.data_initial.score
        }
  		});
		io.emit('game-restarted', game);
  	} else {
  		console.log('Cant restart game');
  	}
  });
  socket.on('join-game', function(user){
    userInContext = user.name;
  	if (game.users.length >= game.limit) {
  		//no more users allowed
    	console.log('Cant join: ' + user);
    	socket.emit('game-joined', false);
  	} else {
		  game.users.push(user)
    	io.emit('game-joined', game);
    	console.log('User joined: ' + user);
  	}
  });
});

http.listen(process.env.PORT || 3000, function(){
  console.log('listening on *:3000');
});