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
        this.generateFoodAtRandomPosition(this.food);
    }

    update() {
    }

    handleCollision(topic, data) {
        var entity = data.entityAtNewPos;
        if (this.relevantEntitiesMap[entity.id]) {
            if (!this.rotten) {
                PubSub.publishSync("foodEaten", {entity: data.entity});
                incrementScore(data.entity);
            } else {
                PubSub.publishSync("rottenFoodEaten", {entity: data.entity});
                decrementScore(data.entity);
            }
            this.generateFoodAtRandomPosition(entity);
        }
    }

    generateFoodAtRandomPosition(food) {
        do {
            var gridX = getRandomInt(0, Grid.totalColumns);
            var gridY = getRandomInt(0, Grid.totalRows);
        } while (Grid.getAt(gridX, gridY));
        var gp = food.components[GridPosition.prototype.constructor.name];
        gp.x = gridX;
        gp.y = gridY;
        Grid.putAt(gridX, gridY, food);
        var rc = food.components[RenderComponent.prototype.constructor.name];
        rc.setSrc("images/snake/neon_food.png");
        resetFoodTimeout();
        this.rotten = false;
    }

    rotTheFood(topic, data) {
        var rc = this.food.components[RenderComponent.prototype.constructor.name];
        rc.setSrc("images/snake/neon_rotten_food.png");
        this.rotten = true;
    }

    gameOver(topic, data) {
        this.generateFoodAtRandomPosition(this.food);
    }
}

class SnakeSegmentSystem extends System {
    constructor(snakeHead1, snakeHead2) {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "GridPosition", "SnakeSegment"]);
        super(signature);
        this.snakeHead1 = snakeHead1;
        this.snakeHead2 = snakeHead2;
    }

    init() {
        this.segments1 = [];
        this.segments1.push(this.snakeHead1);

        this.segments2 = [];
        this.segments2.push(this.snakeHead2);

        PubSub.subscribe("collision", this.handleCollision.bind(this));
        PubSub.subscribe("foodEaten", this.foodEaten.bind(this));
        PubSub.subscribe("rottenFoodEaten", this.rottenFoodEaten.bind(this));
        PubSub.subscribe("gameOver", this.gameOver.bind(this));
        PubSub.subscribe("snakeMove", this.moveSegments.bind(this));
    }

    handleCollision(topic, data) {
        var entity = data.entityAtNewPos;
        if (this.relevantEntitiesMap[entity.id]) {
            PubSub.publishSync("gameOver", {entity: data.entity});
        }
    }

    gameOver(topic, data) {
        this.removeSegments(this.segments1);
        this.removeSegments(this.segments2);
        playerWon = data.entity == this.snakeHead1 ? "Pink Won!!" : "Green Won!!";
        ScreenManager.switchToScreen("gameover");
        /*this.segments = [];
        this.segments.push(snakeHead);
        var gc = snakeHead.components[GridPosition.prototype.constructor.name];
        gc.x = initialPos.x;
        gc.y = initialPos.y;*/
    }

    removeSegments(segments) {
        for (var i = 1; i < segments.length; i++) {
            var gc = segments[i].components[GridPosition.prototype.constructor.name];
            Grid.removeFrom(gc.x, gc.y, segments[i]);
            EntityManager.removeEntity(segments[i]);
        }
    }

    foodEaten(topic, data) {

        var image = data.entity == this.snakeHead1 ? "images/snake/neon_snake_body.png" : "images/snake/neon_snake_body2.png";
        var segments = data.entity == this.snakeHead1 ? this.segments1 : this.segments2;

        for (var i = 0; i < 3; i++) {
            var snakeSegment = EntityManager.createEntity("snakeSegment");
            snakeSegment.addComponent(new PositionComponent(-100, -100));
            snakeSegment.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, image));
            snakeSegment.addComponent(new GridPosition(-1, -1));
            snakeSegment.addComponent(new SnakeSegment());
            segments.push(snakeSegment);
        }
    }

    rottenFoodEaten(topic, data) {

        var segments = data.entity == this.snakeHead1 ? this.segments1 : this.segments2;

        if (segments.length > 3) {
            for (var i = segments.length - 3; i < segments.length; i++) {
                var gc = segments[i].components[GridPosition.prototype.constructor.name];
                Grid.removeFrom(gc.x, gc.y, segments[i]);
                EntityManager.removeEntity(segments[i]);
            }
            segments = segments.slice(0, segments.length - 3);

            if (data.entity == this.snakeHead1)
                this.segments1 = segments;
            else
                this.segments2 = segments;
        }
    }

    moveSegments(topic, data) {
        var segments = data.entity == this.snakeHead1 ? this.segments1 : this.segments2;

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
    constructor(snakeHead1, snakeHead2) {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "GridPosition", "SnakeHead"]);
        super(signature);
        this.snakeHead1 = snakeHead1;
        this.snakeHead2 = snakeHead2;
        this.snakeDirections = {};
    }

    init() {
        this.snakeDirections[this.snakeHead1.name] = this.right;
        this.snakeDirections[this.snakeHead2.name] = this.right;
        PubSub.subscribe("keyDown", this.handleKeyDown.bind(this));
    }

    handleKeyDown(topic, data) {
        if (data.key === "up" && this.snakeDirections[this.snakeHead1.name] != this.down) {
            this.snakeDirections[this.snakeHead1.name] = this.up;
            this.rotateEntity(270, this.snakeHead1);
        }
        else if (data.key === "down" && this.snakeDirections[this.snakeHead1.name] != this.up) {
            this.snakeDirections[this.snakeHead1.name] = this.down;
            this.rotateEntity(90, this.snakeHead1);
        }
        else if (data.key === "left" && this.snakeDirections[this.snakeHead1.name] != this.right) {
            this.snakeDirections[this.snakeHead1.name] = this.left;
            this.rotateEntity(180, this.snakeHead1);
        }
        else if (data.key === "right" && this.snakeDirections[this.snakeHead1.name] != this.left) {
            this.snakeDirections[this.snakeHead1.name] = this.right;
            this.rotateEntity(0, this.snakeHead1);
        }

        if (data.key === "w" && this.snakeDirections[this.snakeHead2.name] != this.down) {
            this.snakeDirections[this.snakeHead2.name] = this.up;
            this.rotateEntity(270, this.snakeHead2);
        }
        else if (data.key === "s" && this.snakeDirections[this.snakeHead2.name] != this.up) {
            this.snakeDirections[this.snakeHead2.name] = this.down;
            this.rotateEntity(90, this.snakeHead2);
        }
        else if (data.key === "a" && this.snakeDirections[this.snakeHead2.name] != this.right) {
            this.snakeDirections[this.snakeHead2.name] = this.left;
            this.rotateEntity(180, this.snakeHead2);
        }
        else if (data.key === "d" && this.snakeDirections[this.snakeHead2.name] != this.left) {
            this.snakeDirections[this.snakeHead2.name] = this.right;
            this.rotateEntity(0, this.snakeHead2);
        }
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
        this.moveSnake(this.snakeHead1);
        this.moveSnake(this.snakeHead2);
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
        scores["snakeHead"] = 0;
        scores["snakeHead2"] = 0;
    }

    update() {
    }
}

class RestartSystem extends System {
    constructor(snakeHead1, snakeHead2) {
        var signature = BitUtils.getBitEquivalentForComponent([]);
        super(signature);
        this.snakeHead1 = snakeHead1;
        this.snakeHead2 = snakeHead2;
    }

    init() {
        PubSub.subscribe("keyPress", this.handleKeyPress.bind(this));
    }

    update() {
    }

    handleKeyPress(topic, data) {
        if (data.key == "space") {

            var snake1PC = this.snakeHead1.components[PositionComponent.prototype.constructor.name];
            var snake1RC = this.snakeHead1.components[RenderComponent.prototype.constructor.name];
            var snake1GP = this.snakeHead1.components[GridPosition.prototype.constructor.name];
            var snake2PC = this.snakeHead2.components[PositionComponent.prototype.constructor.name];
            var snake2RC = this.snakeHead2.components[RenderComponent.prototype.constructor.name];
            var snake2GP = this.snakeHead2.components[GridPosition.prototype.constructor.name];

            snake1RC.rotateAngle = 0;
            snake2RC.rotateAngle = 0;

            snake1GP.x = initialPos.x;
            snake1GP.y = initialPos.y;
            snake2GP.x = initialPos2.x;
            snake2GP.y = initialPos2.y;
            snake1PC.x = Grid.getTile(initialPos.x, initialPos.y).x;
            snake1PC.y = Grid.getTile(initialPos.x, initialPos.y).y;
            snake2PC.x = Grid.getTile(initialPos2.x, initialPos.y).x;
            snake2PC.y = Grid.getTile(initialPos2.x, initialPos.y).y;

            Grid.putAt(initialPos.x, initialPos.y, this.snakeHead1);
            Grid.putAt(initialPos2.x, initialPos2.y, this.snakeHead2);

            ScreenManager.switchToScreen("default");
        }
    }
}

/*--------------------------GAME INITIALIZATION AND LOOP------------------------------------------*/
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

var persistentStorage = new PersistentStorage();
var snakeHead = EntityManager.createEntity("snakeHead");
var snakeHead2 = EntityManager.createEntity("snakeHead2");

var initialPos = {x: 10, y: 10};
var initialPos2 = {x: 10, y: 20};

function init() {
    ComponentManager.initialize(["GridPosition", "Food", "SnakeHead", "SnakeSegment"])

    //add food
    var food = EntityManager.createEntity("food");
    food.addComponent(new PositionComponent(0, 0));
    food.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "images/snake/neon_food.png"));
    food.addComponent(new GridPosition(0, 0));
    food.addComponent(new Food());

    //add snake 1
    snakeHead.addComponent(new PositionComponent(Grid.getTile(initialPos.x, initialPos.y).x, Grid.getTile(initialPos.x, initialPos.y).y));
    snakeHead.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "images/snake/neon_snake_head.png"));
    snakeHead.addComponent(new GridPosition(initialPos.x, initialPos.y));
    snakeHead.addComponent(new SnakeHead());
    Grid.putAt(initialPos.x, initialPos.y, snakeHead);

    //add snake 2
    snakeHead2.addComponent(new PositionComponent(Grid.getTile(initialPos2.x, initialPos2.y).x, Grid.getTile(initialPos2.x, initialPos2.y).y));
    snakeHead2.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "images/snake/neon_snake_head2.png"));
    snakeHead2.addComponent(new GridPosition(initialPos2.x, initialPos2.y));
    snakeHead2.addComponent(new SnakeHead());
    Grid.putAt(initialPos2.x, initialPos2.y, snakeHead2);

    //score
    score = 0;

    //add systems
    SystemManager.addSystem(new GridSystem());
    SystemManager.addSystem(new MovementSystem(snakeHead, snakeHead2));
    SystemManager.addSystem(new InputSystem());
    SystemManager.addSystem(new FoodSystem(food));
    SystemManager.addSystem(new SnakeSegmentSystem(snakeHead, snakeHead2));
    SystemManager.addSystem(new GameStateSystem());
    var rs = new RenderSystem();
    rs.addAfterRenderCallback(renderScore);
    SystemManager.addSystem(rs);

    /*-----Game Over state-------*/
    var gameOverRender = new RenderSystem();
    gameOverRender.addAfterRenderCallback(renderGameOverScreen);
    SystemManager.addSystem(gameOverRender, "gameover");
    SystemManager.addSystem(new RestartSystem(snakeHead, snakeHead2), "gameover");

    startGameLoop(100);
}

var scores = {};
scores["snakeHead"] = 0;
scores["snakeHead2"] = 0;
var highScore = persistentStorage.get("highScore") ? persistentStorage.get("highScore") : 0;

function renderScore() {
    context.font = "20px Arial";
    context.fillStyle = "white";
    context.fillText("Score(Green): " + scores["snakeHead"] + " | Score(Pink): " + scores["snakeHead2"] +
        " | High Score: " + highScore, 0, 15
    )
    ;
}

function incrementScore(entity) {
    scores[entity.name] = scores[entity.name]+1;
    if (scores[entity.name] > highScore) {
        highScore = scores[entity.name];
        persistentStorage.persist("highScore", highScore);
    }
}

function decrementScore(entity) {
    if (scores[entity.name] != 0) {
        scores[entity.name] = scores[entity.name] - 1;
    }
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

init();