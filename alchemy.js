canvas = document.getElementById("alchemy");
context = canvas.getContext('2d');

function PositionComponent(x, y) {
    this.x = x;
    this.y = y;
}

function RenderComponent(width, height, src) {
    this.image = new Image();
    this.image.width = width;
    this.image.height = height;
    this.image.src = src;
}

function Draggable() {}

function Dragged(xOffset, yOffset) {
    this.xOffset = xOffset;
    this.yOffset = yOffset;
}

function Fixed() {}

function Input() {}

class RenderSystem extends System {
    constructor() {
        super(0b110000);
    }

    update() {
        canvas.width = canvas.width;

        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            context.drawImage(rc.image, pc.x, pc.y, rc.image.width, rc.image.height);
        }
    }
}

class InputSystem extends System {
    constructor() {
        super(0b110001);
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
        if (entity !== undefined) {
            PubSub.publish("mouseDown", {"mouseX": mouseX, "mouseY": mouseY, "entity": entity});
        }
    }

    handleMouseUp(e) {
        var mouseX = this.getMouseX(e);
        var mouseY = this.getMouseY(e);

        var entity = this.getInputEntity(mouseX, mouseY);
        if (entity !== undefined) {
            PubSub.publish("mouseUp", {"mouseX": mouseX, "mouseY": mouseY, "entity": entity});
        }
    }

    getInputEntity(mouseX, mouseY) {
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            if (this.checkEntity(mouseX, mouseY, pc.x, pc.y, rc.image.width, rc.image.height)) {
                return entity;
            }
        }
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
        super(0b111000);
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
            entity.addComponent(new Dragged(data["mouseX"] - pc.x, data["mouseY"] - pc.y));
        }
    }
}

class DraggedSystem extends System {
    constructor() {
        super(0b110100);
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

            if(pc.x < 0 || (pc.x + rc.image.width) > (canvas.getBoundingClientRect().right - 100)
                || pc.y < 0 || (pc.y + rc.image.height) > canvas.getBoundingClientRect().bottom){
                EntityManager.removeEntity(entity);
            }
        }
    }
}

class FixedSystem extends System {
    constructor() {
        super(0b110010);
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
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            var newDraggableEntity = EntityManager.createEntity();
            newDraggableEntity.addComponent(new PositionComponent(pc.x, pc.y));
            newDraggableEntity.addComponent(rc);
            newDraggableEntity.addComponent(new Input());
            newDraggableEntity.addComponent(new Draggable());
            newDraggableEntity.addComponent(new Dragged(data["mouseX"] - pc.x, data["mouseY"] - pc.y));
        }
    }
}

function init() {
    var fireEntity = EntityManager.createEntity();
    fireEntity.addComponent(new PositionComponent(700, 100));
    fireEntity.addComponent(new RenderComponent(74, 74, "images/fire.png"));
    fireEntity.addComponent(new Input());
    fireEntity.addComponent(new Fixed());
    SystemManager.addSystem(new RenderSystem());
    SystemManager.addSystem(new InputSystem());
    SystemManager.addSystem(new FixedSystem());
    SystemManager.addSystem(new DraggableSystem());
    SystemManager.addSystem(new DraggedSystem());
}

init();

function game_loop() {
    for (var i = 0; i < SystemManager.systems.length; i++) {
        SystemManager.systems[i].update();
    }
    EntityManager.sweepRemovalOfComponents();
}

setInterval(game_loop, 30);