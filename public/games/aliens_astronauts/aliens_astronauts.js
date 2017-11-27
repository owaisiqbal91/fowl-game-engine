CanvasManager.initializeCanvas("aliens_astronauts");

class Grid {
    static getTile(x, y) {
        return {x: Grid.tileWidth * x, y: Grid.tileHeight * y};
    }

    static getNeighboringTiles(x, y) {
        var neighbors = [];

        if (x > 0)
            neighbors.push({x: x - 1, y: y});
        if (x < Grid.totalColumns - 1)
            neighbors.push({x: x + 1, y: y});
        if (y > 0)
            neighbors.push({x: x, y: y - 1});
        if (y < Grid.totalRows - 1)
            neighbors.push({x: x, y: y + 1});

        return neighbors;
    }

    static putAt(x, y, entity) {
        //remove if already placed
        if (Grid.occupyingEntities[entity.id]) {
            delete Grid.occupiedCells[Grid.occupyingEntities[entity.id]];
        }
        Grid.occupiedCells[x + "," + y] = entity;
        Grid.occupyingEntities[entity.id] = x + "," + y;
    }

    static removeFrom(entity) {
        if (Grid.occupyingEntities[entity.id]) {
            delete Grid.occupiedCells[Grid.occupyingEntities[entity.id]];
        }
        delete Grid.occupyingEntities[entity.id];
    }

    static getAt(x, y) {
        return Grid.occupiedCells[x + "," + y];
    }

    static getOccupyingEntityTile(entity) {
        return Grid.occupyingEntities[entity.id];
    }

    static getTileCoords(x, y) {
        return {x: parseInt(x / Grid.tileWidth), y: parseInt(y / Grid.tileHeight)};
    }
}

Grid.tileWidth = 100;
Grid.tileHeight = 100;
Grid.totalColumns = canvas.width / Grid.tileWidth;
Grid.totalRows = canvas.clientHeight / Grid.tileHeight;
Grid.occupiedCells = {};
Grid.occupyingEntities = {};

function GridPosition(x, y) {
    this.x = x;
    this.y = y;
}

function Alien() {
}

function Astronaut() {
}

function Wall() {
}

function PlayerControlled() {
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

        for (var i = 0; i < Grid.totalColumns; i++) {
            var position = Grid.getTile(i, 0);

            context.beginPath();
            context.moveTo(position.x, 0);
            context.lineTo(position.x, canvas.height);
            context.stroke();
        }
        for (var j = 0; j < Grid.totalRows; j++) {
            var position = Grid.getTile(0, j);

            context.beginPath();
            context.moveTo(0, position.y);
            context.lineTo(canvas.width, position.y);
            context.stroke();
        }
    }
}

class MovementSystem extends System {
    constructor(aliens, astronauts, highlightedSquareRC) {
        var signature = BitUtils.getBitEquivalentForComponent(["GridPosition", "PlayerControlled"]);
        super(signature);
        this.aliens = aliens;
        this.astronauts = astronauts;
        this.highlightedSquareRC = highlightedSquareRC;

        this.highlights = [];
        for (var i = 0; i < 4; i++) {
            var highlight = EntityManager.createEntity("highlight");
            highlight.addComponent(new PositionComponent(0, 0));
            var gp = new GridPosition(0, 0);
            highlight.addComponent(gp);

            this.highlights.push(highlight);
        }
    }

    init() {
        PubSub.subscribe("click", this.handleMouseClick.bind(this));
    }

    handleMouseClick(topic, data) {

        var clickedTile = Grid.getTileCoords(data["mouseX"], data["mouseY"]);

        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var entityPos = Grid.getOccupyingEntityTile(entity).split(",");

            var neighbors = Grid.getNeighboringTiles(parseInt(entityPos[0]), parseInt(entityPos[1]));
            //taking current tile into consideration as well
            neighbors.push({x: entityPos[0], y: entityPos[1]});
            for (var n = 0; n < neighbors.length; n++) {
                var entityAtPos = Grid.getAt(neighbors[n].x, neighbors[n].y);
                if (clickedTile.x == neighbors[n].x && clickedTile.y == neighbors[n].y && (entityAtPos == undefined || entityAtPos.name != "wall")) {
                    turn = turn  + 1;
                    if(turn == 20){
                        PubSub.publish("gameover", {state: playerType == "alien" ? "loss" : "win"});
                    }

                    var alienGPs = [];

                    for (var i = 0; i < this.aliens.length; i++) {
                        var alienGP = this.aliens[i].components[GridPosition.prototype.constructor.name];
                        alienGPs.push({x: alienGP.x, y: alienGP.y});
                    }

                    //player movement
                    var entityGP = entity.components[GridPosition.prototype.constructor.name];
                    if (playerType == "alien") {
                        var astronautEaten = Grid.getAt(neighbors[n].x, neighbors[n].y);
                        if (astronautEaten != undefined && astronautEaten.name == "astronaut") {
                            var eatenRC = astronautEaten.components[RenderComponent.prototype.constructor.name];
                            astronautEaten.removeComponent(eatenRC);
                            var eatenIndex = 0;
                            for (var r = 0; r < this.astronauts.length; r++) {
                                if (this.astronauts[r].id == astronautEaten.id) {
                                    eatenIndex = r;
                                    break;
                                }
                            }
                            this.astronauts.splice(r, 1);
                            if (this.astronauts.length == 0) {
                                PubSub.publish("gameover", {state: "win"});
                            }
                        }
                    }
                    entityGP.x = neighbors[n].x;
                    entityGP.y = neighbors[n].y;
                    Grid.removeFrom(entity);
                    Grid.putAt(entityGP.x, entityGP.y, entity);

                    //astronauts movement
                    for (var i = 0; i < this.astronauts.length; i++) {
                        var astronautGP = this.astronauts[i].components[GridPosition.prototype.constructor.name];
                        var playerControlled = this.astronauts[i].components[PlayerControlled.prototype.constructor.name];

                        if (playerControlled == undefined) {
                            var astronautNextNode = Pathfinding.findNextNodeAwayFromTargets({
                                x: astronautGP.x,
                                y: astronautGP.y
                            }, alienGPs);
                            if (astronautNextNode != undefined) {
                                astronautGP.x = astronautNextNode.x;
                                astronautGP.y = astronautNextNode.y;
                                Grid.removeFrom(this.astronauts[i]);
                                Grid.putAt(astronautGP.x, astronautGP.y, this.astronauts[i]);
                            }
                        }
                    }

                    //aliens movement
                    var excluded = [];
                    for (var i = 0; i < this.aliens.length; i++) {
                        var alienGP = this.aliens[i].components[GridPosition.prototype.constructor.name];
                        var playerControlled = this.aliens[i].components[PlayerControlled.prototype.constructor.name];
                        if (playerControlled == undefined) {
                            var alienNextNodeNearestToAstronaut;
                            for (var j = 0; j < this.astronauts.length; j++) {
                                var astronautGP = this.astronauts[j].components[GridPosition.prototype.constructor.name];

                                var alienNextNode = Pathfinding.findNextNode({x: alienGP.x, y: alienGP.y}, {
                                    x: astronautGP.x,
                                    y: astronautGP.y
                                }, excluded);
                                if (alienNextNodeNearestToAstronaut == undefined || alienNextNode.cost < alienNextNodeNearestToAstronaut.cost) {
                                    alienNextNodeNearestToAstronaut = alienNextNode;
                                }
                            }

                            var astronautEaten = Grid.getAt(alienNextNode.x, alienNextNode.y);
                            if (astronautEaten != undefined && astronautEaten.name == "astronaut") {
                                var playerControlled = this.aliens[i].components[PlayerControlled.prototype.constructor.name];
                                if (playerControlled != undefined) {
                                    PubSub.publish("gameover", {state: playerType == "alien" ? "win" : "loss"});
                                } else {
                                    var eatenRC = astronautEaten.components[RenderComponent.prototype.constructor.name];
                                    astronautEaten.removeComponent(eatenRC);
                                    var eatenIndex = 0;
                                    for (var r = 0; r < this.astronauts.length; r++) {
                                        if (this.astronauts[r].id == astronautEaten.id) {
                                            eatenIndex = r;
                                            break;
                                        }
                                    }
                                    this.astronauts.splice(r, 1);
                                    if (this.astronauts.length == 0) {
                                        PubSub.publish("gameover", {state: playerType == "alien" ? "win" : "loss"});
                                    }
                                }
                            }

                            alienGP.x = alienNextNode.x;
                            alienGP.y = alienNextNode.y;
                            Grid.removeFrom(this.aliens[i]);
                            Grid.putAt(alienGP.x, alienGP.y, this.aliens[i]);
                            excluded.concat(alienNextNodeNearestToAstronaut.path);
                        }
                    }
                }
            }
        }
    }

    update() {

        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var entityPos = Grid.getOccupyingEntityTile(entity).split(",");

            var neighbors = Grid.getNeighboringTiles(parseInt(entityPos[0]), parseInt(entityPos[1]));
            for (var i = 0; i < neighbors.length; i++) {
                if (Grid.getAt(neighbors[i].x, neighbors[i].y) == undefined) {
                    this.highlights[i].addComponent(this.highlightedSquareRC);
                    var gp = this.highlights[i].components[GridPosition.prototype.constructor.name];
                    gp.x = neighbors[i].x;
                    gp.y = neighbors[i].y;
                } else {
                    this.highlights[i].removeComponent(this.highlightedSquareRC);
                }
            }
        }
    }
}

class GameStateSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent([]);
        super(signature);
    }

    init() {
        PubSub.subscribe("gameover", this.resetGameState.bind(this));
    }

    resetGameState(topic, data) {
        endText = data.state == "win" ? "You won!" : "You lost!";
        ScreenManager.switchToScreen("gameover");
    }

    update() {
    }
}

class RestartSystem extends System {
    constructor(astronaut1, astronaut2, alien1, alien2, aliens, astronauts) {
        var signature = BitUtils.getBitEquivalentForComponent([]);
        super(signature);
        this.astronaut1 = astronaut1;
        this.astronaut2 = astronaut2;
        this.alien1 = alien1;
        this.alien2 = alien2;
        this.aliens = aliens;
        this.astronauts = astronauts;

        this.astronaut1RC = this.astronaut1.components[RenderComponent.prototype.constructor.name];
        this.astronaut2RC = this.astronaut2.components[RenderComponent.prototype.constructor.name];
        this.playerControlled = new PlayerControlled();
    }

    init() {
        PubSub.subscribe("keyPress", this.handleKeyPress.bind(this));
    }

    update() {
    }

    handleKeyPress(topic, data) {
        if (data.key == "1" || data.key == "2") {

            if(data.key == "1"){
                playerType = "astronaut";
                this.alien1.removeComponent(this.playerControlled);
                this.astronaut1.addComponent(this.playerControlled);
            } else {
                playerType = "alien";
                this.astronaut1.removeComponent(this.playerControlled);
                this.alien1.addComponent(this.playerControlled);
            }
            turn = 1;

            var astronaut1GP = this.astronaut1.components[GridPosition.prototype.constructor.name];
            var astronaut2GP = this.astronaut2.components[GridPosition.prototype.constructor.name];
            var alien1GP = this.alien1.components[GridPosition.prototype.constructor.name];
            var alien2GP = this.alien2.components[GridPosition.prototype.constructor.name];

            alien1GP.x = 4;
            alien1GP.y = 1;
            alien2GP.x = 4;
            alien2GP.y = 7;
            astronaut1GP.x = 1;
            astronaut1GP.y = 1;
            astronaut2GP.x = 7;
            astronaut2GP.y = 1;

            Grid.removeFrom(this.astronaut1);
            Grid.removeFrom(this.astronaut2);
            Grid.removeFrom(this.alien1);
            Grid.removeFrom(this.alien2);
            Grid.putAt(4, 1, this.alien1);
            Grid.putAt(4, 7, this.alien2);
            Grid.putAt(1, 1, this.astronaut1);
            Grid.putAt(7, 1, this.astronaut2);

            this.aliens.splice(0, this.aliens.length);
            this.astronauts.splice(0, this.astronauts.length);
            this.aliens.push(this.alien1);
            this.aliens.push(this.alien2);
            this.astronauts.push(this.astronaut1);
            this.astronauts.push(this.astronaut2);

            this.astronaut1.addComponent(this.astronaut1RC);
            this.astronaut2.addComponent(this.astronaut2RC);
            ScreenManager.switchToScreen("default");
        }
    }
}

class Pathfinding {

    static findNextNode(start, destination, excludeNodes) {
        var openList = [];
        openList.push({x: start.x, y: start.y, fcost: 0, gcost: 0, hcost: 0, closed: false})

        var currentNode;
        while (openList.length != 0) {
            Pathfinding.sort(openList);
            currentNode = openList[0];
            openList.splice(0, 1);
            currentNode.closed = true;
            if (currentNode.x == destination.x && currentNode.y == destination.y) {
                break;
            }

            var neighbors = Grid.getNeighboringTiles(currentNode.x, currentNode.y);
            for (var i = 0; i < neighbors.length; i++) {
                var neighbor = neighbors[i];
                var neighborNode = Pathfinding.getNode(neighbor.x, neighbor.y, openList);
                var entityAtPos = Grid.getAt(neighbor.x, neighbor.y);
                if ((entityAtPos == undefined || entityAtPos.name != "wall") && Pathfinding.notInExcluded(neighbor, excludeNodes)) {
                    if (neighborNode == undefined) {
                        var hcost = Pathfinding.getHCost(neighbor.x, neighbor.y, destination);
                        neighborNode = {
                            x: neighbor.x,
                            y: neighbor.y,
                            gcost: currentNode.gcost + 1,
                            hcost: hcost,
                            fcost: currentNode.gcost + 1 + hcost,
                            closed: false
                        };
                        neighborNode.parent = currentNode;

                        openList.push(neighborNode);
                    }
                    else {
                        if (!neighborNode.closed) {
                            if (currentNode.gcost + 1 < neighborNode.gcost) {
                                neighborNode.fcost -= neighborNode.gcost;
                                neighborNode.gcost = currentNode.gcost + 1;
                                neighborNode.fcost += neighborNode.gcost;
                                neighborNode.parent = currentNode;
                            }
                        }
                    }
                }
            }
        }

        var totalGCost = currentNode.gcost;
        var path = [];
        while (currentNode.parent != undefined && (currentNode.parent.x != start.x || currentNode.parent.y != start.y)) {
            path.push(currentNode);
            currentNode = currentNode.parent;
        }

        return {x: currentNode.x, y: currentNode.y, cost: totalGCost, path: path};
    }

    static findNextNodeAwayFromTargets(start, destinations) {
        var neighbors = Grid.getNeighboringTiles(start.x, start.y);
        var maxNode;
        var max = -1;
        //consider current node as well
        neighbors.push(start);

        for (var i = 0; i < neighbors.length; i++) {
            var neighbor = neighbors[i];
            var entityAtPos = Grid.getAt(neighbor.x, neighbor.y);
            if (entityAtPos == undefined) {
                var hcost = 0;
                for (var j = 0; j < destinations.length; j++) {
                    hcost += Pathfinding.getHCost(neighbor.x, neighbor.y, destinations[j]);
                }
                if (hcost > max) {
                    max = hcost;
                    maxNode = neighbor;
                }
            }
        }

        return maxNode;
    }

    static getHCost(x, y, destination) {
        return Math.abs(x - destination.x) + Math.abs(y - destination.y);
    }

    static getNode(x, y, arr) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].x == x && arr[i].y == y)
                return arr[i];
        }
        return undefined;
    }

    static sort(arr) {
        arr.sort(function (a, b) {
            if (a.fcost < b.fcost)
                return -1;
            else
                return 1;
        });
    }

    static notInExcluded(node, excluded) {
        if (excluded) {
            for (var i = 0; i < excluded.length; i++) {
                if (node.x == excluded[i].x && node.y == excluded.y)
                    return false;
            }
        }
        return true;
    }
}

/*--------------------------GAME INITIALIZATION AND LOOP------------------------------------------*/

var playerType = "astronaut";
var turn = 1;
function init() {
    ComponentManager.initialize(["GridPosition", "Wall", "PlayerControlled"]);

    //generate walls, hardcoding for now
    var wallRenderComponent = new RenderComponent(Grid.tileWidth, Grid.tileHeight, "/common/images/snake/neon_wall.png");

    var gridTiles = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 0, 0, 1, 0, 0, 1, 0],
        [0, 1, 1, 0, 1, 0, 1, 1, 0],
        [0, 0, 1, 0, 1, 0, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 0, 0, 1, 0, 0, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    for (var i = 0; i < gridTiles.length; i++) {
        for (var j = 0; j < gridTiles[i].length; j++) {
            if (gridTiles[j][i] == 0) {
                var wall = EntityManager.createEntity("wall");
                wall.addComponent(new PositionComponent(Grid.getTile(i, j).x, Grid.getTile(i, j).y));
                wall.addComponent(wallRenderComponent);
                wall.addComponent(new Wall());
                Grid.putAt(i, j, wall);
            }
        }
    }

    //initialize entities
    var alien = EntityManager.createEntity("alien");
    alien.addComponent(new PositionComponent(0, 0));
    alien.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "/common/images/aliens_astronauts/alien.png"));
    alien.addComponent(new GridPosition(4, 1));
    alien.addComponent(new Alien());
    Grid.putAt(4, 1, alien);
    var alien2 = EntityManager.createEntity("alien");
    alien2.addComponent(new PositionComponent(0, 0));
    alien2.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "/common/images/aliens_astronauts/alien.png"));
    alien2.addComponent(new GridPosition(4, 7));
    alien2.addComponent(new Alien());
    Grid.putAt(4, 7, alien2);

    var astronaut = EntityManager.createEntity("astronaut");
    astronaut.addComponent(new PositionComponent(0, 0));
    astronaut.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "/common/images/aliens_astronauts/astronaut.jpg"));
    astronaut.addComponent(new GridPosition(1, 1));
    astronaut.addComponent(new Astronaut());
    Grid.putAt(1, 1, astronaut);
    var astronaut2 = EntityManager.createEntity("astronaut");
    astronaut2.addComponent(new PositionComponent(0, 0));
    astronaut2.addComponent(new RenderComponent(Grid.tileWidth, Grid.tileHeight, "/common/images/aliens_astronauts/astronaut.jpg"));
    astronaut2.addComponent(new GridPosition(7, 1));
    astronaut2.addComponent(new Astronaut());
    Grid.putAt(7, 1, astronaut2);

    var highlightedSquareRC = new RenderComponent(Grid.tileWidth, Grid.tileHeight, "/common/images/aliens_astronauts/highlight.png");

    //add systems
    var aliens = [alien, alien2];
    var astronauts = [astronaut, astronaut2];
    SystemManager.addSystem(new InputSystem());
    var rs = new RenderSystem();
    rs.addAfterRenderCallback(renderTurnNo);
    SystemManager.addSystem(rs);
    SystemManager.addSystem(new GridSystem());
    SystemManager.addSystem(new MovementSystem(aliens, astronauts, highlightedSquareRC));
    SystemManager.addSystem(new GameStateSystem());

    /*-----Game Over state-------*/
    var gameOverRender = new RenderSystem();
    gameOverRender.addAfterRenderCallback(renderGameOverScreen);
    SystemManager.addSystem(gameOverRender, "gameover");
    SystemManager.addSystem(new RestartSystem(astronaut, astronaut2, alien, alien2, aliens, astronauts), "gameover");

    startGameLoop(30);
    ScreenManager.switchToScreen("gameover");
}

var endText = "";

function renderTurnNo() {
    context.font = "30px Arial";
    context.fillStyle = "black";
    context.fillText("Turn: " + turn , 0, 30);
}

function renderGameOverScreen() {
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = "40px Arial";
    context.fillStyle = "black";
    context.fillText(endText, 0, 300);
    context.fillText("Press 1 to be an astronaut, press 2 to be an alien", 0, 400);
}

init();
