canvas = document.getElementById("alchemy");
context = canvas.getContext('2d');

function PositionComponent(x, y, z = 0) {
    this.x = x;
    this.y = y;
    this.z = 0;
}

function RenderComponent(width, height, src) {
    this.image = new Image();
    this.image.width = width;
    this.image.height = height;
    this.image.src = src;
}

function Draggable() {
}

function Dragged(xOffset, yOffset) {
    this.xOffset = xOffset;
    this.yOffset = yOffset;
}

function Fixed() {
}

function Input() {
}

function Collidable() {
}

class RenderSystem extends System {
    constructor() {
        super(0b1100000);
    }

    update() {
        canvas.width = canvas.width;

        var entitiesSortedByZOrder = Object.values(this.relevantEntitiesMap).sort(this.compareZOrder);
        for (var i = 0; i < entitiesSortedByZOrder.length; i++) {
            var entity = entitiesSortedByZOrder[i];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            context.drawImage(rc.image, pc.x, pc.y, rc.image.width, rc.image.height);
        }
    }

    compareZOrder(a, b) {
        if (a.components[PositionComponent.prototype.constructor.name].z > b.components[PositionComponent.prototype.constructor.name].z)
            return 1;
        else return -1;
    }
}

class InputSystem extends System {
    constructor() {
        super(0b1100010);
    }

    init() {
        canvas.addEventListener("mousedown", this.handleMouseDown.bind(this), false);
        canvas.addEventListener("mouseup", this.handleMouseUp.bind(this), false);
        canvas.addEventListener("mousemove", this.handleMouseMove.bind(this), false);
    }

    update() {
    }

    handleMouseMove(e) {
        var mouseX = this.getMouseX(e);
        var mouseY = this.getMouseY(e);

        PubSub.publish("mouseMove", {"mouseX": mouseX, "mouseY": mouseY});
    }

    handleMouseDown(e) {
        var mouseX = this.getMouseX(e);
        var mouseY = this.getMouseY(e);

        var entity = this.getInputEntity(mouseX, mouseY);
        if (entity) {
            PubSub.publish("mouseDown", {"mouseX": mouseX, "mouseY": mouseY, "entity": entity});
        }
    }

    handleMouseUp(e) {
        var mouseX = this.getMouseX(e);
        var mouseY = this.getMouseY(e);

        var entity = this.getInputEntity(mouseX, mouseY);
        console.log(entity);
        if (entity) {
            PubSub.publish("mouseUp", {"mouseX": mouseX, "mouseY": mouseY, "entity": entity});
        }
    }

    getInputEntity(mouseX, mouseY) {
        var topmostEntity;
        var topmostZ = -1;
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var pc = entity.components[PositionComponent.prototype.constructor.name];

            var rc = entity.components[RenderComponent.prototype.constructor.name];
            if (this.checkEntity(mouseX, mouseY, pc.x, pc.y, rc.image.width, rc.image.height)) {
                if (!topmostEntity || pc.z > topmostZ) {
                    topmostEntity = entity;
                    topmostZ = pc.z;
                }
            }
        }
        return topmostEntity;
    }

    checkEntity(mouseX, mouseY, entityX, entityY, entityWidth, entityHeight) {
        return (mouseX >= entityX && mouseX <= (entityX + entityWidth)
            && mouseY >= entityY && mouseY <= (entityY + entityHeight));
    }

    getMouseX(e) {
        return e.clientX - canvas.getBoundingClientRect().left;
    }

    getMouseY(e) {
        return e.clientY - canvas.getBoundingClientRect().top;
    }
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
            console.log(highestZ);
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
            newDraggableEntity.addComponent(new PositionComponent(pc.x, pc.y, highestZ));
            newDraggableEntity.addComponent(rc);
            newDraggableEntity.addComponent(new Input());
            newDraggableEntity.addComponent(new Draggable());
            newDraggableEntity.addComponent(new Collidable());
            newDraggableEntity.addComponent(new Dragged(data["mouseX"] - pc.x, data["mouseY"] - pc.y));
        }
    }
}

class CollisionSystem extends System {
    constructor() {
        super(0b1100001);
    }

    init() {
        PubSub.subscribe("checkCollision", this.checkCollision.bind(this));
    }

    update() {
    }

    checkCollision(topic, data) {
        var entity = data["entity"];
        if (this.relevantEntitiesMap[entity.id]) {
            //check for out of bounds
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            var p1 = {x: pc.x, y: pc.y};
            var p2 = {x: pc.x + rc.image.width, y: pc.y + rc.image.height};
            for (var entityId in this.relevantEntitiesMap) {
                if (entityId != entity.id) {
                    var otherEntity = this.relevantEntitiesMap[entityId];
                    var otherpc = otherEntity.components[PositionComponent.prototype.constructor.name];
                    var otherrc = otherEntity.components[RenderComponent.prototype.constructor.name];
                    var p3 = {x: otherpc.x, y: otherpc.y};
                    var p4 = {x: otherpc.x + otherrc.image.width, y: otherpc.y + otherrc.image.height};

                    if (this.checkOverlapping(p1, p2, p3, p4)) {
                        PubSub.publishSync("collision", {entity1: entity, entity2: otherEntity});
                        break;
                    }
                }
            }
        }
    }

    checkOverlapping(p1, p2, p3, p4) {
        return !( p2.y < p3.y || p1.y > p4.y || p2.x < p3.x || p1.x > p4.x )
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