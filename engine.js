var components = [
    "PositionComponent",
    "RenderComponent",
    "Input",
    "Collidable",
    /*"Draggable",
    "Dragged",
    "Fixed"*/
    "GridPosition",
    "Food",
    "SnakeHead",
    "SnakeSegment",
    "Wall"
];
//calculate signatures for all components
var componentSignatureMap = {};
for (var i = 0; i < components.length; i++) {
    var bitsToShift = components.length - 1 - i;
    componentSignatureMap[components[i]] = 0b1 << bitsToShift;
}

function Entity(id, name) {
    this.id = id;
    this.name = name;
    this.signature = 0b0;
    this.components = {};

    this.addComponent = addComponent;
    this.removeComponent = removeComponent;
}
function addComponent(c) {
    EntityManager.addComponent(this, c);
}
function removeComponent(c) {
    EntityManager.markToRemoveComponentFromEntity(this, c);
}

function EntityManager() {
}
EntityManager.currentId = -1;
EntityManager.entities = {};
EntityManager.createEntity = function (name) {
    EntityManager.currentId += 1;
    var entity = new Entity(EntityManager.currentId, name);
    EntityManager.entities[EntityManager.currentId] = entity;
    SystemManager.checkEntityForAddition(entity);
    return entity;
}
EntityManager.removeEntity = function (entity) {
    delete EntityManager.entities[entity.id];
    entity.components = [];
    entity.signature = 0b0;
    delete markedForRemoval[entity.id];
    SystemManager.checkEntityForRemoval(entity);
}
EntityManager.addComponent = function (entity, component) {
    var componentName = component.constructor.name;
    var componentSignature = componentSignatureMap[componentName];
    entity.components[componentName] = component;
    entity.signature = entity.signature | componentSignature;

    SystemManager.checkEntityForAddition(entity);
}
var markedForRemoval = {};
EntityManager.markToRemoveComponentFromEntity = function(entity, component) {
    if(!markedForRemoval[entity.id])
        markedForRemoval[entity.id] = [];
    markedForRemoval[entity.id].push(component);
}
EntityManager.sweepRemovalOfComponents = function() {
    for(var entityId in markedForRemoval){
        var entity = EntityManager.entities[entityId];
        var components = markedForRemoval[entityId];
        var componentsRemovedSignature = 0b0;
        for(var i=0; i<components.length; i++){
            var componentName = components[i].constructor.name;
            delete entity.components[componentName];
            var componentSignature = componentSignatureMap[componentName];
            componentsRemovedSignature = componentsRemovedSignature | componentSignature;
        }
        entity.signature = entity.signature ^ componentSignature;

        SystemManager.checkEntityForRemoval(entity);
    }
    markedForRemoval = {};
}

function System(signature){
    this.relevantEntitiesMap = {};
    this.signature = signature;
}
function SystemManager() {}
SystemManager.systems = [];
SystemManager.addSystem = function(system) {
    SystemManager.systems.push(system);
    for(key in EntityManager.entities) {
        var entity = EntityManager.entities[key];
        SystemManager.checkAndAddEntityForSystem(entity, system);
    }
    if(system.init)
        system.init();
}
SystemManager.checkEntityForAddition = function (entity) {
    for(var i =0; i<SystemManager.systems.length; i++){
        //if system does not have the entity
        if(SystemManager.systems[i].relevantEntitiesMap[entity.id] === undefined){
            SystemManager.checkAndAddEntityForSystem(entity, SystemManager.systems[i]);
        }
    }
}
SystemManager.checkAndAddEntityForSystem = function (entity, system) {
    if(checkSignatures(entity.signature, system.signature)){
        system.relevantEntitiesMap[entity.id] = entity;
    }
}
SystemManager.checkEntityForRemoval = function (entity) {
    for(var i =0; i<SystemManager.systems.length; i++){
        //if system has entity
        if(SystemManager.systems[i].relevantEntitiesMap[entity.id] !== undefined){
            SystemManager.checkAndRemoveEntityForSystem(entity, SystemManager.systems[i]);
        }
    }
}
SystemManager.checkAndRemoveEntityForSystem = function (entity, system) {
    if(!checkSignatures(entity.signature, system.signature)){
        delete system.relevantEntitiesMap[entity.id];
    }
}

function checkSignatures(s1, s2) {
    return (s1 & s2) === s2;
}



/*----------------------------IN-BUILT COMPONENTS AND SYSTEMS----------------------------------------*/
function PositionComponent(x, y, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
}

function RenderComponent(width, height, src) {
    this.image = new Image();
    this.image.width = width;
    this.image.height = height;
    this.image.src = src;
    this.rotateAngle = 0;
}

function Input() {
}

function Collidable() {
}

class RenderSystem extends System {
    constructor() {
        super(0b110000000);
    }

    update() {
        canvas.width = canvas.width;

        var entitiesSortedByZOrder = Object.values(this.relevantEntitiesMap).sort(this.compareZOrder);
        for (var i = 0; i < entitiesSortedByZOrder.length; i++) {
            var entity = entitiesSortedByZOrder[i];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            if(rc.rotateAngle == 0){
                context.drawImage(rc.image, pc.x, pc.y, rc.image.width, rc.image.height);
            } else {
                drawRotatedImage(rc.image, pc.x, pc.y, rc.rotateAngle, rc.image.width, rc.image.height);
            }
        }
    }

    compareZOrder(a, b) {
        if (a.components[PositionComponent.prototype.constructor.name].z > b.components[PositionComponent.prototype.constructor.name].z)
            return 1;
        else return -1;
    }
}

var TO_RADIANS = Math.PI/180;
function drawRotatedImage(image, x, y, angle, width, height) {
    context.save();
    context.translate(x+(width/2), y+(height/2));
    context.rotate(angle * TO_RADIANS);
    context.drawImage(image, -(width/2), -(height/2), width, height);
    context.restore();
}

class InputSystem extends System {
    constructor() {
        super(0b111000000);
    }

    init() {
        canvas.addEventListener("mousedown", this.handleMouseDown.bind(this), false);
        canvas.addEventListener("mouseup", this.handleMouseUp.bind(this), false);
        canvas.addEventListener("mousemove", this.handleMouseMove.bind(this), false);
        canvas.addEventListener("keydown", this.handleKeyPress.bind(this), false);
    }

    update() {
    }

    handleKeyPress(e) {
        if(e.keyCode == '38'){
            //up
            PubSub.publishSync("keyDown", {key:"up"})
        } else if(e.keyCode == '40'){
            //down
            PubSub.publishSync("keyDown", {key:"down"})
        } else if(e.keyCode == '37'){
            //left
            PubSub.publishSync("keyDown", {key:"left"})
        } else if(e.keyCode == '39'){
            //right
            PubSub.publishSync("keyDown", {key:"right"})
        }
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

class CollisionSystem extends System {
    constructor() {
        super(0b110100000);
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
                        PubSub.publish("collision", {entity1: entity, entity2: otherEntity});
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