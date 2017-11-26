CanvasManager.initializeCanvas("snake");

class Grid {
    static getTile(x, y) {
        return {x: Grid.tileWidth * x, y: Grid.tileHeight * y};
    }

    static putAt(x, y, entity) {
        //remove if already placed
        if (Grid.occupyingEntities[entity.id]) {
            delete Grid.occupiedCells[Grid.occupyingEntities[entity.id]];
        }
        Grid.occupiedCells[x + "," + y] = entity;
        Grid.occupyingEntities[entity.id] = x + "," + y;
    }

    static removeFrom(x, y, entity) {
        if (Grid.occupyingEntities[entity.id]) {
            delete Grid.occupiedCells[Grid.occupyingEntities[entity.id]];
        }
        delete Grid.occupyingEntities[entity.id];
    }

    static getAt(x, y) {
        return Grid.occupiedCells[x + "," + y];
    }
}

Grid.tileWidth = 20;
Grid.tileHeight = 20;
Grid.totalColumns = canvas.width / Grid.tileWidth;
Grid.totalRows = canvas.clientHeight / Grid.tileHeight;
Grid.occupiedCells = {};
Grid.occupyingEntities = {};

function GridPosition(x, y) {
    this.x = x;
    this.y = y;
}

function Food() {
}

function SnakeHead() {
}

function SnakeSegment(entity) {
}

class GridSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "GridPosition"]);
        super(signature);
    }

    update() {
        for (var entityId in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[entityId];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var gp = entity.components[GridPosition.prototype.constructor.name];

            var newPos = Grid.getTile(gp.x, gp.y);
            pc.x = newPos.x;
            pc.y = newPos.y;
        }
    }
}

class FoodSystem extends System {

    constructor(food) {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "GridPosition", "Food"]);
        super(signature);
        this.food = food;
        this.rotten = false;
    }

    init() {
        PubSub.subscribe("collision", this.handleCollision.bind(this));
        PubSub.subscribe("rotFood", this.rotTheFood.bind(this));
        PubSub.subscribe("gameOver", this.gameOver.bind(this));
        PubSub.subscribe("foodDataUpdate", this.handleFoodDataUpdate.bind(this));
        //create new food
        this.generateFoodAtRandomPosition();
    }

    update() {
    }

    handleCollision(topic, data) {
        var player = data.entity.name.split('-')[1];
        var entity = data.entityAtNewPos;
        if (this.relevantEntitiesMap[entity.id]) {
            if (!this.rotten) {
                incrementScore(player);
            } else {
                decrementScore(player);
            }
            //create new food
            this.generateFoodAtRandomPosition();
        }
        
    }

    handleFoodDataUpdate(topic, data) {
        //just set x, y of food
        var gp = this.food.components[GridPosition.prototype.constructor.name];
        gp.x = data.gridX;
        gp.y = data.gridY;
        if (!Grid.getAt(data.gridX, data.gridY)) {
            Grid.putAt(data.gridX, data.gridY, this.food);
        };
    }

    generateFoodAtRandomPosition() {
        var rc = this.food.components[RenderComponent.prototype.constructor.name];
        rc.setSrc("/common/images/snake/neon_food.png");
        resetFoodTimeout();
        this.rotten = false;

        if (!isGameValid()) {
            return;
        };

        var gridX, gridY;
        do {
            gridX = getRandomInt(0, Grid.totalColumns);
            gridY = getRandomInt(0, Grid.totalRows);
        } while (Grid.getAt(gridX, gridY));
   
        setFoodPosition(gridX, gridY);
    }

    rotTheFood(topic, data) {
        var rc = this.food.components[RenderComponent.prototype.constructor.name];
        rc.setSrc("/common/images/snake/neon_rotten_food.png");
        this.rotten = true;
    }

    gameOver(topic, data) {
        //create new food
        this.generateFoodAtRandomPosition();
    }
}

class SnakeSegmentSystem extends System {
    constructor(snakeHeads) {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "GridPosition", "SnakeSegment"]);
        super(signature);
        var context = this;
        snakeHeads.forEach(function(snakeHead) {
            context[snakeHead.name] = snakeHead.data;
        });
    }

    init() {
        var context = this;
        snakeHeads.forEach(function(snakeHead) {
            context['segments-'+snakeHead.name] = [];
            context['segments-'+snakeHead.name].push(context[snakeHead.name]);
        });
       
        PubSub.subscribe("collision", this.handleCollision.bind(this));
        PubSub.subscribe("gameOver", this.gameOver.bind(this));
        PubSub.subscribe("snakeMove", this.moveSegments.bind(this));
        PubSub.subscribe("snakeSegmentUpdate", this.snakeSegmentUpdate.bind(this));
    }

    handleCollision(topic, data) {
        var entity = data.entityAtNewPos;
        if (this.relevantEntitiesMap[entity.id]) {
            PubSub.publishSync("gameOver", {entity: data.entity});
        }
    }

    gameOver(topic, data) {
        var context = this;
        snakeHeads.forEach(function(snakeHead) {
            context.removeSegments(context['segments-'+snakeHead.name]);
        });
        var userWithHighestScore;
        for(var player in scores) {
            if (scores.hasOwnProperty(player)) {
                if (!userWithHighestScore) {
                    userWithHighestScore = player;
                } else {
                    if (scores[userWithHighestScore] < scores[player]) {
                        userWithHighestScore = player;
                    }
                }
            }
        }
        playerWon = userWithHighestScore + " Won!!";
        ScreenManager.switchToScreen("gameover");
    }

    removeSegments(segments) {
        for (var i = 1; i < segments.length; i++) {
            var gc = segments[i].components[GridPosition.prototype.constructor.name];
            Grid.removeFrom(gc.x, gc.y, segments[i]);
            EntityManager.removeEntity(segments[i]);
        }
    }

    snakeSegmentUpdate(topic, players) {
        var image = "/common/images/snake/neon_snake_body.png";
        var segments;
        var context = this;
        players.forEach(function(player) {
            segments = context['segments-snakeHead-'+player.name];
        
            for (var i = 0; i < player.data.score; i++) {
                var snakeSegment = EntityManager.createEntity("snakeSegment");
                snakeSegment.addComponent(new PositionComponent(-100, -100));
                snakeSegment.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, image));
                snakeSegment.addComponent(new GridPosition(-1, -1));
                snakeSegment.addComponent(new SnakeSegment());
                segments.push(snakeSegment);
            }
        })
    }

    moveSegments(topic, data) {
        var segments = this['segments-'+data.entity.name];

        var pgc = segments[0].components[GridPosition.prototype.constructor.name];
        var shiftedXY = {x: pgc.x, y: pgc.y};
        for (var i = 1; i < segments.length; i++) {
            var gc = segments[i].components[GridPosition.prototype.constructor.name];
            var tempX = gc.x;
            var tempY = gc.y;
            gc.x = shiftedXY.x;
            gc.y = shiftedXY.y;
            Grid.putAt(gc.x, gc.y, segments[i]);
            shiftedXY.x = tempX;
            shiftedXY.y = tempY;
        }
    }

    update() {
    }
}

class MovementSystem extends System {
    constructor(snakeHeads) {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "GridPosition", "SnakeHead"]);
        super(signature);
        var context = this;
        snakeHeads.forEach(function(snakeHead) {
            context[snakeHead.name] = snakeHead.data;
        });
        this.snakeDirections = {};
    }

    init() {
        var context = this;
        snakeHeads.forEach(function(snakeHead) {
            context.snakeDirections[context[snakeHead.name].name] = context.right;
        });
        PubSub.subscribe("snakeDataUpdate", this.handleKeyUpdate.bind(this));
        PubSub.subscribe("keyDown", this.handleKeyDown.bind(this));
    }

    handleKeyUpdate(topic, data) {
        var context = this;
        snakeHeads.forEach(function(head) {
            //for all other players, update direction if there
            var snakeHead = context[head.name];
            if (head.key === "up" && context.snakeDirections[snakeHead.name] != context.down) {
                context.snakeDirections[snakeHead.name] = context.up;
                context.rotateEntity(270, snakeHead);
            }
            else if (head.key === "down" && context.snakeDirections[snakeHead.name] != context.up) {
                context.snakeDirections[snakeHead.name] = context.down;
                context.rotateEntity(90, snakeHead);
            }
            else if (head.key === "left" && context.snakeDirections[snakeHead.name] != context.right) {
                context.snakeDirections[snakeHead.name] = context.left;
                context.rotateEntity(180, snakeHead);
            }
            else if (head.key === "right" && context.snakeDirections[snakeHead.name] != context.left) {
                context.snakeDirections[snakeHead.name] = context.right;
                context.rotateEntity(0, snakeHead);
            }
        });
    }

    handleKeyDown(topic, data) {
        //send keypress to server
        gameData.user.data.keypress = data.key;
        updateKeypress(gameData.user);
    }

    rotateEntity(rotateAngle, entity) {
        var rc = entity.components[RenderComponent.prototype.constructor.name];
        rc.rotateAngle = rotateAngle;
    }

    up(x, y) {
        return {x: x, y: y - 1};
    }

    down(x, y) {
        return {x: x, y: y + 1};
    }

    left(x, y) {
        return {x: x - 1, y: y};
    }

    right(x, y) {
        return {x: x + 1, y: y};
    }

    update() {
        var context = this;
        snakeHeads.forEach(function(snakeHead) {
            context.moveSnake(context[snakeHead.name]);
        });
    }

    moveSnake(entity) {
        var gp = entity.components[GridPosition.prototype.constructor.name];
        var newPos = this.snakeDirections[entity.name](gp.x, gp.y);
        var entityAtNewPos = Grid.getAt(newPos.x, newPos.y);

        PubSub.publishSync("snakeMove", {entity: entity});
        gp.x = newPos.x;
        gp.y = newPos.y;

        if (entityAtNewPos) {
            PubSub.publishSync("collision", {entityAtNewPos: entityAtNewPos, entity: entity});
        } else if (newPos.x >= Grid.totalColumns || newPos.y >= Grid.totalRows
            || newPos.x < 0 || newPos.y < 0) {
            PubSub.publishSync("gameOver", {entity: entity});
        }
    }
}

class GameStateSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent([]);
        super(signature);
    }

    init() {
        PubSub.subscribe("gameOver", this.resetGameState.bind(this));
    }

    resetGameState(topic, data) {
        
    }

    update() {
    }
}

class RestartSystem extends System {
    constructor(snakeHeads) {
        var signature = BitUtils.getBitEquivalentForComponent([]);
        super(signature);
        var context = this;
        snakeHeads.forEach(function(snakeHead) {
            context[snakeHead.name] = snakeHead.data;
        });
    }

    init() {
        PubSub.subscribe("keyPress", this.handleKeyPress.bind(this));
        PubSub.subscribe("restartGame", this.restartGame.bind(this));
    }

    update() {
    }

    restartGame(topic, data) {
        var context = this;
        snakeHeads.forEach(function(snakeHead) {
            var snakePC = context[snakeHead.name].components[PositionComponent.prototype.constructor.name];
            var snakeRC = context[snakeHead.name].components[RenderComponent.prototype.constructor.name];
            var snakeGP = context[snakeHead.name].components[GridPosition.prototype.constructor.name];

            snakeRC.rotateAngle = 0;

            snakeGP.x = initialPos.x;
            snakeGP.y = initialPos.y;
            snakePC.x = Grid.getTile(initialPos.x, initialPos.y).x;
            snakePC.y = Grid.getTile(initialPos.x, initialPos.y).y;

            Grid.putAt(initialPos.x, initialPos.y, snakeHead);
        });
        ScreenManager.switchToScreen("game");
    }

    handleKeyPress(topic, data) {
        if (data.key == "space") {
            restartGame();
        }
    }
}

/*--------------------------GAME INITIALIZATION AND LOOP------------------------------------------*/
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function createSnakeEntity(name, initialPos) {
    var snakeHead = EntityManager.createEntity("snakeHead-"+name);
    //add snake
    snakeHead.addComponent(new PositionComponent(Grid.getTile(initialPos.x, initialPos.y).x, Grid.getTile(initialPos.x, initialPos.y).y));
    snakeHead.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "/common/images/snake/neon_snake_head.png"));
    snakeHead.addComponent(new GridPosition(initialPos.x, initialPos.y));
    snakeHead.addComponent(new SnakeHead());
    
    return snakeHead;
}

var snakeHeads = [];
var scores = {};

function updatePlayerStates(players) {
    players.forEach(function(player) {
        snakeHeads.forEach(function(snakeHead) {
            if(snakeHead.name === 'snakeHead-'+player.name) {
                snakeHead.key = player.data.keypress
            }
        });
    });
    PubSub.publishSync("snakeDataUpdate", {entity: snakeHeads});
}

function updateFoodStates(food) {
    PubSub.publishSync("foodDataUpdate", food);
}

function updateScores(players) {
    players.forEach(function(player) {
        scores[player.name] = player.data.score;
    });
    //redraw snake length based on score
    PubSub.publishSync("snakeSegmentUpdate", players);
}

function initPlayers(players) {
    players.forEach(function(player) {
        snakeHeads.push({
            name: 'snakeHead-'+player.name,
            data: createSnakeEntity(player.name, player.data.initialPos),
            key: player.data.keypress
        });
        scores[player.name] = player.data.score;
    });
}

function startGame(players) {
    //add food
    var food = EntityManager.createEntity("food");
    food.addComponent(new PositionComponent(0, 0));
    food.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "/common/images/snake/neon_food.png"));
    food.addComponent(new GridPosition(0, 0));
    food.addComponent(new Food());

    //initPlayers
    initPlayers(players);
    var initialPosComp;
    snakeHeads.forEach(function(snakeHead) {
        initialPosComp = snakeHead.data.components[PositionComponent.prototype.constructor.name]
        Grid.putAt(initialPosComp.x, initialPosComp.y, snakeHead);
    });

    //score
    score = 0;

    //add snake systems
    SystemManager.addSystem(new MovementSystem(snakeHeads), "game");
    SystemManager.addSystem(new SnakeSegmentSystem(snakeHeads), "game");

    //add food system
    SystemManager.addSystem(new FoodSystem(food), "game");

    SystemManager.addSystem(new GridSystem(), "game");
    SystemManager.addSystem(new InputSystem(), "game");
    SystemManager.addSystem(new GameStateSystem(), "game");

    /*-----Game state-------*/
    var rs = new RenderSystem();
    rs.addAfterRenderCallback(renderScore);
    SystemManager.addSystem(rs, "game");

    SystemManager.addSystem(new RestartSystem(snakeHeads), "gameover");

    //switch to game screen
    ScreenManager.switchToScreen("game");
}

function init() {
    ComponentManager.initialize(["GridPosition", "Food", "SnakeHead", "SnakeSegment"])

    /*------Game start state---------*/
    var gameStartRender = new RenderSystem();
    gameStartRender.addBeforeRenderCallback(renderGameBeginMessage);
    SystemManager.addSystem(gameStartRender, "gamestart");

    /*-----Game Over state-------*/
    var gameOverRender = new RenderSystem();
    gameOverRender.addAfterRenderCallback(renderGameOverScreen);
    SystemManager.addSystem(gameOverRender, "gameover");

    startGameLoop(100, "gamestart");
}

function renderGameBeginMessage() {
    context.font = "20px Arial";
    context.fillStyle = "white";

    var text = "Waiting for " + getRemainingPlayerCount() + " more player to start the game.";

    context.fillText(text, 0, 15);
}

function renderScore() {
    context.font = "20px Arial";
    context.fillStyle = "white";

    var text = "";

    for (var player in scores) {
        if (scores.hasOwnProperty(player)) {
            text += "Score("+player+"): " + scores[player] + " | "
        }
    }
    context.fillText(text, 0, 15);
}

var playerWon = "";

function renderGameOverScreen() {
    context.font = "40px Arial";
    context.fillStyle = "white";
    context.fillText(playerWon + " Press Space to continue", 100, 300);
}

rottenFoodTimeout = setInterval(makeFoodRotten, 10000);

function makeFoodRotten() {
    PubSub.publishSync("rotFood", {});
}

function resetFoodTimeout() {
    clearInterval(rottenFoodTimeout);
    rottenFoodTimeout = setInterval(makeFoodRotten, 10000);
}