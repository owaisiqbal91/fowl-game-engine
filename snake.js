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

    static removeFrom(x, y, entity){
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

function Wall() {
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
        var entity = data.entity;
        if (this.relevantEntitiesMap[entity.id]) {
            if(!this.rotten){
                PubSub.publishSync("foodEaten", {});
                incrementScore();
            } else {
                PubSub.publishSync("rottenFoodEaten", {});
                decrementScore();
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
    constructor(snakeHead) {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "GridPosition", "SnakeSegment"]);
        super(signature);
        this.snakeHead = snakeHead;
    }

    init() {
        this.segments = [];
        this.segments.push(this.snakeHead);

        PubSub.subscribe("collision", this.handleCollision.bind(this));
        PubSub.subscribe("foodEaten", this.foodEaten.bind(this));
        PubSub.subscribe("rottenFoodEaten", this.rottenFoodEaten.bind(this));
        PubSub.subscribe("gameOver", this.gameOver.bind(this));
        PubSub.subscribe("snakeMove", this.moveSegments.bind(this));
    }

    handleCollision(topic, data) {
        var entity = data.entity;
        if (this.relevantEntitiesMap[entity.id]) {
            console.log("hit itself");
            PubSub.publishSync("gameOver", {});
        }
    }

    gameOver() {
        for(var i=1; i<this.segments.length; i++){
            var gc = this.segments[i].components[GridPosition.prototype.constructor.name];
            Grid.removeFrom(gc.x, gc.y, this.segments[i]);
            EntityManager.removeEntity(this.segments[i]);
        }
        this.segments = [];
        this.segments.push(snakeHead);
        var gc = snakeHead.components[GridPosition.prototype.constructor.name];
        gc.x = initialPos.x;
        gc.y = initialPos.y;
    }

    foodEaten() {
        for(var i=0; i<3; i++){
            var snakeSegment = EntityManager.createEntity("snakeSegment");
            snakeSegment.addComponent(new PositionComponent(-100, -100));
            snakeSegment.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "images/snake/neon_snake_body.png"));
            snakeSegment.addComponent(new GridPosition(-1, -1));
            snakeSegment.addComponent(new SnakeSegment());
            this.segments.push(snakeSegment);
        }
    }
    rottenFoodEaten() {
        if(this.segments.length > 3){
            for(var i=this.segments.length-3; i<this.segments.length; i++){
                var gc = this.segments[i].components[GridPosition.prototype.constructor.name];
                Grid.removeFrom(gc.x, gc.y, this.segments[i]);
                EntityManager.removeEntity(this.segments[i]);
            }
            this.segments = this.segments.slice(0, this.segments.length - 3);
        }
    }

    moveSegments() {
        var pgc = this.segments[0].components[GridPosition.prototype.constructor.name];
        var shiftedXY = {x: pgc.x, y: pgc.y};
        for (var i = 1; i < this.segments.length; i++) {
            var gc = this.segments[i].components[GridPosition.prototype.constructor.name];
            var tempX = gc.x;
            var tempY = gc.y;
            gc.x = shiftedXY.x;
            gc.y = shiftedXY.y;
            Grid.putAt(gc.x, gc.y, this.segments[i]);
            shiftedXY.x = tempX;
            shiftedXY.y = tempY;
        }
    }

    update() {
    }
}

class MovementSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "GridPosition", "SnakeHead"]);       
        super(signature);
    }

    init() {
        this.currentDirection = this.right;
        PubSub.subscribe("keyDown", this.handleKeyDown.bind(this));
    }

    handleKeyDown(topic, data) {
        if (data.key === "up" && this.currentDirection != this.down) {
            this.currentDirection = this.up;
            this.rotateEntity(270);
        }
        else if (data.key === "down" && this.currentDirection != this.up) {
            this.currentDirection = this.down;
            this.rotateEntity(90);
        }
        else if (data.key === "left" && this.currentDirection != this.right) {
            this.currentDirection = this.left;
            this.rotateEntity(180);
        }
        else if (data.key === "right" && this.currentDirection != this.left) {
            this.currentDirection = this.right;
            this.rotateEntity(0);
        }
    }

    rotateEntity(rotateAngle) {
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var rc = entity.components[RenderComponent.prototype.constructor.name];
            rc.rotateAngle = rotateAngle;
        }
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
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var gp = entity.components[GridPosition.prototype.constructor.name];
            var newPos = this.currentDirection(gp.x, gp.y);
            var entityAtNewPos = Grid.getAt(newPos.x, newPos.y);

            PubSub.publishSync("snakeMove", {});
            gp.x = newPos.x;
            gp.y = newPos.y;
            //Grid.putAt(gp.x, gp.y, entity);

            if (entityAtNewPos) {
                PubSub.publishSync("collision", {entity: entityAtNewPos});
            } else if (newPos.x >= Grid.totalColumns || newPos.y >= Grid.totalRows
                || newPos.x < 0 || newPos.y < 0) {
                PubSub.publishSync("gameOver", {});
            }
        }
    }
}

class WallSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["Wall"]);       
        super(signature);
    }

    init() {
        PubSub.subscribe("collision", this.handleCollision.bind(this));
    }

    update() {
    }

    handleCollision(topic, data) {
        var entity = data.entity;
        if (this.relevantEntitiesMap[entity.id]) {
            PubSub.publishSync("gameOver", {});
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
        score = 0;
    }

    update() {
    }
}

/*--------------------------GAME INITIALIZATION AND LOOP------------------------------------------*/
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

var persistentStorage = new PersistentStorage();
var snakeHead;

var initialPos = {x: 10, y: 10};
function init() {
    ComponentManager.initialize(["GridPosition", "Food", "SnakeHead", "SnakeSegment", "Wall"])

    //initialize entities
    //generate walls, hardcoding for now
    var wallRenderComponent = new RenderComponent(Grid.tileWidth, Grid.tileHeight, "images/snake/neon_wall.png");
    for (var i = 0; i < Grid.totalColumns; i++) {
        for (var j = 0; j < Grid.totalRows; j++) {
            if ((i >= 5 && i <= 8 && j == 4)
                || (j >= 20 && j <= 40 && i == 20)
                || (i == 30 && j >= 10 && j <= 15)
                || (j == 9 && i >= 25 && i <= 35)) {
                //if(i >= 20){
                var wall = EntityManager.createEntity("wall");
                wall.addComponent(new PositionComponent(Grid.getTile(i, j).x, Grid.getTile(i, j).y));
                wall.addComponent(wallRenderComponent);
                wall.addComponent(new Wall());
                Grid.putAt(i, j, wall);
            }
        }
    }

    //add food and snake head
    var food = EntityManager.createEntity("food");
    food.addComponent(new PositionComponent(0, 0));
    food.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "images/snake/neon_food.png"));
    food.addComponent(new GridPosition(0, 0));
    food.addComponent(new Food());
    snakeHead = EntityManager.createEntity("snakeHead");
    snakeHead.addComponent(new PositionComponent(Grid.getTile(initialPos.x, initialPos.y).x, Grid.getTile(initialPos.x, initialPos.y).y));
    snakeHead.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "images/snake/neon_snake_head.png"));
    snakeHead.addComponent(new GridPosition(initialPos.x, initialPos.y));
    snakeHead.addComponent(new SnakeHead());
    Grid.putAt(initialPos.x, initialPos.y, snakeHead);
    //score
    score = 0;

    //add systems
    SystemManager.addSystem(new GridSystem());
    SystemManager.addSystem(new MovementSystem());
    SystemManager.addSystem(new InputSystem());
    SystemManager.addSystem(new FoodSystem(food));
    SystemManager.addSystem(new SnakeSegmentSystem(snakeHead));
    SystemManager.addSystem(new WallSystem());
    SystemManager.addSystem(new GameStateSystem());
    var rs = new RenderSystem();
    rs.addAfterRenderCallback(renderScore);
    SystemManager.addSystem(rs);

    startGameLoop(100);
}

var score = 0;
var highScore = persistentStorage.get("highScore") ? persistentStorage.get("highScore") : 0;

function renderScore() {
    context.font = "20px Arial";
    context.fillStyle = "white";
    context.fillText("Score: " + score + " | High Score: " + highScore, 0, 15);
}

function incrementScore() {
    score++;
    if (score > highScore) {
        highScore = score;
        persistentStorage.persist("highScore", highScore);
    }
}

function decrementScore() {
    if(score != 0){
        score--;
    }
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