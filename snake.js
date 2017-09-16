canvas = document.getElementById("snake");
context = canvas.getContext('2d');


class Grid {
    static getTile(x, y) {
        return {x: Grid.tileWidth * x, y: Grid.tileHeight * y};
    }
    static putAt(x, y, entity){
        //remove if already placed
        if(Grid.occupyingEntities[entity.id]){
            delete Grid.occupiedCells[Grid.occupyingEntities[entity.id]];
        }
        Grid.occupiedCells[x+","+y] = entity;
        Grid.occupyingEntities[entity.id] = x+","+y;
    }
    static getAt(x, y){
        return Grid.occupiedCells[x+","+y];
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

function Food() {}
function SnakeHead() {}
function SnakeSegment() {}

class GridSystem extends System {
    constructor(){
        super(0b11001000);
    }
    update() {
        for(var entityId in this.relevantEntitiesMap) {
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
    constructor(){
        super(0b11001100);
    }
    init() {
        PubSub.subscribe("collision", this.handleCollision.bind(this))
        for(var key in this.relevantEntitiesMap){
            var food = this.relevantEntitiesMap[key];
            this.generateFoodAtRandomPosition(food);
            break;
        }
    }
    update() {

    }
    handleCollision(topic, data){
        var entity = data.entity;
        if(this.relevantEntitiesMap[entity.id]){
            this.generateFoodAtRandomPosition(entity);
        }
    }

    generateFoodAtRandomPosition(food){
        do{
            var gridX = getRandomInt(0, Grid.totalColumns);
            var gridY = getRandomInt(0, Grid.totalRows);
        } while(Grid.getAt(gridX, gridY));
        var gp = food.components[GridPosition.prototype.constructor.name];
        gp.x = gridX;
        gp.y = gridY;
        Grid.putAt(gridX, gridY, food);
    }
}

class MovementSystem extends System {
    constructor() {
        super(0b11001010);
    }
    init(){
        this.currentDirection = this.right;
        PubSub.subscribe("keyDown", this.handleKeyDown.bind(this));
    }

    handleKeyDown(topic, data) {
        if(data.key === "up" && this.currentDirection != this.down)
            this.currentDirection = this.up;
        else if(data.key === "down" && this.currentDirection != this.up)
            this.currentDirection = this.down;
        else if(data.key === "left" && this.currentDirection != this.right)
            this.currentDirection = this.left;
        else if(data.key === "right" && this.currentDirection != this.left)
            this.currentDirection = this.right;
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
            if(entityAtNewPos){
                PubSub.publishSync("collision", {entity: entityAtNewPos});
            } else if(newPos.x >= Grid.totalColumns || newPos.y >= Grid.totalRows
            || newPos.x < 0 || newPos.y < 0) {
                PubSub.publishSync("outOfBounds", {});
            }

            gp.x = newPos.x;
            gp.y = newPos.y;
            Grid.putAt(newPos.x, newPos.y, entity);
        }
    }
}

class GameStateSystem extends System {
    constructor() {
        super(0b00000000);
    }
    init(){
        PubSub.subscribe("outOfBounds", this.resetGameState.bind(this));
    }
    resetGameState(topic, data){
        console.log("state reset")
    }
    update() {

    }
}

/*--------------------------GAME INITIALIZATION AND LOOP------------------------------------------*/
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function init() {
    var food = EntityManager.createEntity("food");
    food.addComponent(new PositionComponent(0, 0));
    food.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "images/snake/food.png"));
    food.addComponent(new GridPosition(0, 0));
    food.addComponent(new Food());
    var snakeHead = EntityManager.createEntity("snakeHead");
    var initialPos = {x: 10, y: 10};
    snakeHead.addComponent(new PositionComponent(Grid.getTile(initialPos.x, initialPos.y).x, Grid.getTile(initialPos.x, initialPos.y).y));
    snakeHead.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "images/snake/snake_head.png"));
    snakeHead.addComponent(new GridPosition(initialPos.x, initialPos.y));
    snakeHead.addComponent(new SnakeHead());
    Grid.putAt(initialPos.x, initialPos.y, snakeHead);

    SystemManager.addSystem(new RenderSystem());
    SystemManager.addSystem(new GridSystem());
    SystemManager.addSystem(new MovementSystem());
    SystemManager.addSystem(new InputSystem());
    SystemManager.addSystem(new FoodSystem());
    SystemManager.addSystem(new GameStateSystem());
}

function game_loop() {
    for (var i = 0; i < SystemManager.systems.length; i++) {
        SystemManager.systems[i].update();
    }
    EntityManager.sweepRemovalOfComponents();
}

init();
setInterval(game_loop, 70);