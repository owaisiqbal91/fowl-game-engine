canvas = document.getElementById("alchemy");
context = canvas.getContext('2d');

function Draggable() {
}

function Dragged(xOffset, yOffset) {
    this.xOffset = xOffset;
    this.yOffset = yOffset;
}

function Fixed() {
}

class DraggableSystem extends System {
    constructor() {
        super(0b1110000);
    }

    init() {
        PubSub.subscribe("mouseDown", this.mouseDown.bind(this));
    }

    update() {
    }

    mouseDown(topic, data) {
        var entity = data["entity"];
        if (this.relevantEntitiesMap[entity.id]) {
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            highestZ += 1;
            pc.z = highestZ;
            entity.addComponent(new Dragged(data["mouseX"] - pc.x, data["mouseY"] - pc.y));
        }
    }
}

class DraggedSystem extends System {
    constructor() {
        super(0b1101000);
    }

    init() {
        PubSub.subscribe("mouseMove", this.mouseMove.bind(this));
        PubSub.subscribe("mouseUp", this.mouseUp.bind(this));
    }

    update() {
    }

    mouseMove(topic, data) {
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var dragged = entity.components[Dragged.prototype.constructor.name];

            pc.x = data["mouseX"] - dragged.xOffset;
            pc.y = data["mouseY"] - dragged.yOffset;
        }
    }

    mouseUp(topic, data) {
        var entity = data["entity"];
        if (this.relevantEntitiesMap[entity.id]) {
            var dragged = entity.components[Dragged.prototype.constructor.name];
            entity.removeComponent(dragged);

            //check for out of bounds
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            if (pc.x < 0 || (pc.x + rc.image.width) > (canvas.getBoundingClientRect().right - 100)
                || pc.y < 0 || (pc.y + rc.image.height) > canvas.getBoundingClientRect().bottom) {
                EntityManager.removeEntity(entity);
            }
            else {
                PubSub.publish("checkCollision", {entity: entity});
            }
        }
    }
}

class FixedSystem extends System {
    constructor() {
        super(0b1100100);
    }

    init() {
        PubSub.subscribe("mouseDown", this.mouseDown.bind(this));
    }

    update() {
    }

    mouseDown(topic, data) {
        var entity = data.entity;
        if (this.relevantEntitiesMap[entity.id]) {
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            var newDraggableEntity = EntityManager.createEntity(entity.name);
            highestZ += 1;
            console.log(highestZ);
            newDraggableEntity.addComponent(new PositionComponent(pc.x, pc.y, highestZ));
            newDraggableEntity.addComponent(rc);
            newDraggableEntity.addComponent(new Input());
            newDraggableEntity.addComponent(new Draggable());
            newDraggableEntity.addComponent(new Collidable());
            newDraggableEntity.addComponent(new Dragged(data["mouseX"] - pc.x, data["mouseY"] - pc.y));
        }
    }
}

class CombiningSystem extends System {
    constructor() {
        super(0b1100001);
        this.rules = {
            "fire + water": "steam",
            "water + fire": "steam"
        }
        this.elementsFound = {};
    }

    init() {
        PubSub.subscribe("collision", this.combineElements.bind(this));
    }

    update() {
    }

    combineElements(topic, data) {
        var combined = this.rules[data.entity1.name + " + " + data.entity2.name];
        if (combined) {
            EntityManager.removeEntity(data.entity1);
            EntityManager.removeEntity(data.entity2);

            if(!this.elementsFound[combined]){
                this.elementsFound[combined] = true;
                createFixedEntity(combined);
            }
        }
    }
}

function init() {
    createFixedEntity("fire");
    createFixedEntity("water");
    SystemManager.addSystem(new RenderSystem());
    SystemManager.addSystem(new InputSystem());
    SystemManager.addSystem(new FixedSystem());
    SystemManager.addSystem(new DraggableSystem());
    SystemManager.addSystem(new DraggedSystem());
    SystemManager.addSystem(new CollisionSystem());
    SystemManager.addSystem(new CombiningSystem());
}

var currentOffset = 0;
function createFixedEntity(name) {
    var entity = EntityManager.createEntity(name);
    entity.addComponent(new PositionComponent(700, 50 + currentOffset * 100));
    entity.addComponent(new RenderComponent(74, 74, "images/" + name + ".png"));
    entity.addComponent(new Input());
    entity.addComponent(new Fixed());
    currentOffset += 1;
}

init();
var highestZ = 0;

function game_loop() {
    for (var i = 0; i < SystemManager.systems.length; i++) {
        SystemManager.systems[i].update();
    }
    EntityManager.sweepRemovalOfComponents();
}

setInterval(game_loop, 30);