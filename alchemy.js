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

class RenderSystem extends System {
    constructor() {
        super(0b11000);
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

//make below class into more generic later
class InputSystem extends System {
    constructor() {
        super(0b11100);
    }
    init() {
        canvas.addEventListener("mousedown", this.handleMouseDown.bind(this), false);
    }
    update() {}
    handleMouseDown(e) {
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            var mouseX = getMouseX(e);
            var mouseY = getMouseY(e);
            if(this.checkEntity(mouseX, mouseY, pc.x, pc.y, rc.image.width, rc.image.height)){
                entity.addComponent(new Dragged(mouseX - pc.x, mouseY - pc.y));
            }
        }
    }
    checkEntity(mouseX, mouseY, entityX, entityY, entityWidth, entityHeight) {
        return (mouseX >= entityX && mouseX <= (entityX + entityWidth)
        && mouseY >= entityY && mouseY <= (entityY + entityHeight));
    }
}

class DragSystem extends System {
    constructor(){
        super(0b10110);
    }
    init() {
        canvas.addEventListener("mousemove", this.mouseMove.bind(this), false);
        canvas.addEventListener("mouseup", this.mouseUp.bind(this), false);
    }
    update() {}
    mouseMove(e) {
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var dragged = entity.components[Dragged.prototype.constructor.name];

            var mouseX = getMouseX(e);
            var mouseY = getMouseY(e);
            pc.x = mouseX - dragged.xOffset;
            pc.y = mouseY - dragged.yOffset;
        }
    }
    mouseUp(e) {
        for(var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var dragged = entity.components[Dragged.prototype.constructor.name];
            entity.removeComponent(dragged);
        }
    }
}

function getMouseX(e) {
    return e.clientX - canvas.getBoundingClientRect().left;
}
function getMouseY(e) {
    return e.clientY - canvas.getBoundingClientRect().top;
}

function init() {
    var fireEntity = EntityManager.createEntity();
    fireEntity.addComponent(new PositionComponent(100, 100));
    fireEntity.addComponent(new RenderComponent(74, 74, "images/fire.png"));
    fireEntity.addComponent(new Draggable());
    SystemManager.addSystem(new RenderSystem());
    SystemManager.addSystem(new InputSystem());
    SystemManager.addSystem(new DragSystem());
}

init();

function game_loop() {
    for (var i = 0; i < SystemManager.systems.length; i++) {
        SystemManager.systems[i].update();
    }
    EntityManager.sweepRemovalOfComponents();
}

setInterval(game_loop, 30);