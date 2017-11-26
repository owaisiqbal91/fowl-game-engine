var canvas;
var context;

function CanvasManager() {
}

CanvasManager.initializeCanvas = function (elementId, outOfBoundsBuffer) {
    canvas = document.getElementById(elementId);
    context = canvas.getContext('2d');
    CanvasManager.outOfBoundsBuffer = outOfBoundsBuffer || 0;
}
CanvasManager.getWidth = function () {
    return canvas.width;
}
CanvasManager.getHeight = function () {
    return canvas.clientHeight;
}
CanvasManager.isOutOfBounds = function (x, y, outOfBounds) {
    var buffer = outOfBounds || CanvasManager.outOfBoundsBuffer;
    if (x < (canvas.getBoundingClientRect().left - buffer) || x > (canvas.getBoundingClientRect().right + buffer)) {
        return true;
    }
    if (y < (canvas.getBoundingClientRect().top - buffer) || y > (canvas.getBoundingClientRect().bottom + buffer)) {
        return true;
    }
    return false;
}
CanvasManager.getWrappedAroundValues = function (x, y) {
    var wx = 0, wy = 0;
    if (x < canvas.getBoundingClientRect().left)
        wx = canvas.width;
    else if (x > canvas.getBoundingClientRect().right)
        wx = -canvas.width;
    if (y < canvas.getBoundingClientRect().top)
        wy = canvas.clientHeight;
    else if (y > canvas.getBoundingClientRect().bottom)
        wy = -canvas.clientHeight;

    return {wx: wx, wy: wy}
}

var components = [
    "PositionComponent",
    "RenderComponent",
    "Input",
    "Collidable",
    "PhysicsComponent",
    "LifeComponent",
    "ParticleEmitterComponent"
];
//calculate signatures for all components
var componentSignatureMap = {};

function ComponentManager() {
}

ComponentManager.initialize = function (gameComponents) {
    components = components.concat(gameComponents);
    for (var i = 0; i < components.length; i++) {
        var bitsToShift = components.length - 1 - i;
        componentSignatureMap[components[i]] = 0b1 << bitsToShift;
    }
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
EntityManager.markToRemoveComponentFromEntity = function (entity, component) {
    if (!markedForRemoval[entity.id])
        markedForRemoval[entity.id] = [];
    if(component){
        markedForRemoval[entity.id].push(component);
    }
}
EntityManager.sweepRemovalOfComponents = function () {
    for (var entityId in markedForRemoval) {
        var entity = EntityManager.entities[entityId];
        var components = markedForRemoval[entityId];
        var componentsRemovedSignature = 0b0;
        for (var i = 0; i < components.length; i++) {
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

function System(signature) {
    this.relevantEntitiesMap = {};
    this.signature = signature;
}

function SystemManager() {
}

SystemManager.systems = [];
SystemManager.addSystem = function (system, screen) {
    SystemManager.systems.push(system);
    for (var key in EntityManager.entities) {
        var entity = EntityManager.entities[key];
        SystemManager.checkAndAddEntityForSystem(entity, system);
    }
    /*if (system.init)
        system.init();*/

    var screen = screen || "default";
    ScreenManager.addSystemToScreen(system, screen)
}
SystemManager.checkEntityForAddition = function (entity) {
    for (var i = 0; i < SystemManager.systems.length; i++) {
        //if system does not have the entity
        if (SystemManager.systems[i].relevantEntitiesMap[entity.id] === undefined) {
            SystemManager.checkAndAddEntityForSystem(entity, SystemManager.systems[i]);
        }
    }
}
SystemManager.checkAndAddEntityForSystem = function (entity, system) {
    if (checkSignatures(entity.signature, system.signature)) {
        system.relevantEntitiesMap[entity.id] = entity;
    }
}
SystemManager.checkEntityForRemoval = function (entity) {
    for (var i = 0; i < SystemManager.systems.length; i++) {
        //if system has entity
        if (SystemManager.systems[i].relevantEntitiesMap[entity.id] !== undefined) {
            SystemManager.checkAndRemoveEntityForSystem(entity, SystemManager.systems[i]);
        }
    }
}
SystemManager.checkAndRemoveEntityForSystem = function (entity, system) {
    if (!checkSignatures(entity.signature, system.signature)) {
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

var ORIGIN = {TOP_LEFT: 1, CENTER: 2};
var atlas = {};
function RenderComponent(width, height, src, origin, spriteOptions) {
    if(!atlas[src]){
        var image = new Image();
        image.src = src;
        atlas[src] = image;
    }
    this.src = src;
    this.width = width;
    this.height = height;
    this.alpha = 1;

    this.rotateAngle = 0;
    this.originPoint = origin || ORIGIN.TOP_LEFT;
    this.spriteOptions = spriteOptions;
}
RenderComponent.prototype.setSrc = function(src){
    if(!atlas[src]){
        var image = new Image();
        image.src = src;
        atlas[src] = image;
    }
    this.src = src;
}

function Pooled() {
    this.isPooled = false;
}

class PoolSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["Pooled", "PositionComponent", "PhysicsComponent"]);
        super(signature);
        this.pool = {};
        this.createCallbacks = {};
        this.emitCallbacks = {};
    }

    update() {
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var pc = entity.components[PositionComponent.prototype.constructor.name];

            if (CanvasManager.isOutOfBounds(pc.x, pc.y)) {
                this.returnToPool(entity);
            }
        }
    }

    registerCreateCallback(entityName, createCallback) {
        if (!this.pool[entityName])
            this.pool[entityName] = [];
        this.createCallbacks[entityName] = createCallback;
    }

    registerEmitCallback(entityName, emitCallback) {
        this.emitCallbacks[entityName] = emitCallback;
    }

    emit(entityName, options) {
        var entity = this.get(entityName);
        this.emitCallbacks[entityName](entity, options);
    }

    get(entityName) {
        if (this.pool[entityName].length == 0) {
            var entity = this.createCallbacks[entityName]();
            return entity;
        }
        else {
            var topEntity = this.pool[entityName][0];
            //remove top entity
            this.pool[entityName] = this.pool[entityName].slice(1, this.pool[entityName].length);
            var pooled = topEntity.components[Pooled.prototype.constructor.name];
            pooled.isPooled = false;
            return topEntity;
        }
    }

    returnToPool(entity) {
        var pooled = entity.components[Pooled.prototype.constructor.name];
        if (!pooled.isPooled) {
            this.pool[entity.name].push(entity);
            pooled.isPooled = true;
        }
    }
}

/*
 * Life component
 * parameters : life
 */

function LifeComponent(life) {
    this.life = this.lifeNow = life;
}

/*
 * Physics Component
 */
function PhysicsComponent(options) {
    this.gravity = options.gravity || {x: 0, y: 0};
    this.speed = options.speed || 0;
    this.angle = options.angle || 0;

    var angleInRadian = Utils.getAngleInRadian(this.angle);
    this.velocity = {
        x: this.speed * Math.cos(angleInRadian),
        y: -1 * this.speed * Math.sin(angleInRadian)
    };

    this.radial = options.radial || {x: 0, y: 0};
    this.tangential = options.tangential || {x: 0, y: 0};
    this.forces = options.forces || {x: 0, y: 0};

    this.velocityX = 0;
    this.velocityY = 0;

    this.maxSpeed = options.maxSpeed || 1000;

    this.acceleration = 0;
    this.friction = options.friction || 1;
}

PhysicsComponent.prototype.setAngle = function (angle) {
    this.angle = angle;
    this.setVelocity();
}

PhysicsComponent.prototype.setSpeed = function (speed) {
    this.speed = speed;
    this.setVelocity();
}

PhysicsComponent.prototype.setVelocity = function () {
    var angleInRadian = Utils.getAngleInRadian(this.angle);
    this.velocity = {
        x: this.speed * Math.cos(angleInRadian),
        y: -1 * this.speed * Math.sin(angleInRadian)
    };
}


function Input() {
}

var BOUNDING_BOX = {RECTANGULAR: 1, CIRCULAR: 2}
function Collidable(boundingBoxType, boundingBoxParams, activeCheck) {
    this.boundingBoxType = boundingBoxType || BOUNDING_BOX.RECTANGULAR;
    this.boundingBoxParams = boundingBoxParams;
    this.activeCheck = activeCheck || true;
}

class RenderSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent"]);
        super(signature);
    }

    addBeforeRenderCallback(callback) {
        this.beforeRenderCallback = callback;
    }

    addAfterRenderCallback(callback) {
        this.afterRenderCallback = callback;
    }

    destroy(){
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    update() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (this.beforeRenderCallback) this.beforeRenderCallback();

        var entitiesSortedByZOrder = Object.values(this.relevantEntitiesMap).sort(this.compareZOrder);
        for (var i = 0; i < entitiesSortedByZOrder.length; i++) {
            var entity = entitiesSortedByZOrder[i];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            var x = pc.x;
            var y = pc.y;
            if(rc.originPoint == ORIGIN.CENTER){
                x = pc.x - rc.width/2;
                y = pc.y - rc.height/2;
            }

            var subpart = undefined;
            if(rc.spriteOptions){
                var spritesheet = spritesheets[rc.spriteOptions.name];
                if(rc.spriteOptions.animating){
                    var endFrameIndex = rc.spriteOptions.endFrameIndex;
                    var ticksPerFrame = rc.spriteOptions.ticksPerFrame;

                    if(!rc.spriteOptions.tickCount){
                        rc.spriteOptions.tickCount = 0;
                    }
                    rc.spriteOptions.tickCount++;
                    var index = Math.floor(rc.spriteOptions.tickCount / ticksPerFrame);
                    if(index > endFrameIndex ){
                        rc.alpha = 0;
                        PubSub.publish("animationDone", {entity: entity})
                    } else{
                        subpart = spritesheet[index];
                    }
                } else{
                    subpart = spritesheet[rc.spriteOptions.spriteIndex];
                }
            }

            if (rc.rotateAngle == 0) {
                drawImage(atlas[rc.src], x, y, rc.width, rc.height, subpart, rc.alpha);
            } else {
                drawRotatedImage(atlas[rc.src], x, y, rc.rotateAngle, rc.width, rc.height, subpart, rc.alpha);
            }
        }

        if (this.afterRenderCallback) this.afterRenderCallback();
    }

    compareZOrder(a, b) {
        if (a.components[PositionComponent.prototype.constructor.name].z > b.components[PositionComponent.prototype.constructor.name].z)
            return 1;
        else return -1;
    }
}

function drawRotatedImage(image, x, y, angle, width, height, subpart, alpha) {
    context.save();
    context.translate(x + (width / 2), y + (height / 2));
    context.rotate(Utils.getAngleInRadian(angle));
    drawImage(image, -(width / 2), -(height / 2), width, height, subpart, alpha);
    context.restore();
}


function drawImage(image, dx, dy, dw, dh, subpart, alpha){
    context.globalAlpha = alpha;
    if(!subpart){
        context.drawImage(image, dx, dy, dw, dh);
    } else {
        context.drawImage(image, subpart.sx, subpart.sy, subpart.sw, subpart.sh, dx, dy, dw, dh);
    }
    context.globalAlpha = 1;
}

class InputSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Input"]);
        super(signature);
        canvas.addEventListener("mousedown", this.handleMouseDown.bind(this), false);
        canvas.addEventListener("mouseup", this.handleMouseUp.bind(this), false);
        canvas.addEventListener("mousemove", this.handleMouseMove.bind(this), false);
        canvas.addEventListener("keydown", this.handleKeyDown.bind(this), false);
        canvas.addEventListener("keyup", this.handleKeyUp.bind(this), false);
        canvas.addEventListener("keypress", this.handleKeyPress.bind(this), false);
    }

    init() {
        this.keyCodeMappings = {
            '38': "up",
            '40': "down",
            '37': "left",
            '39': "right",
            '32': "space",
            '87': "w",
            '65':"a",
            '83':"s",
            '68':"d"
        }
    }

    update() {
    }

    handleKeyDown(e) {
        if (this.getKey(e.keyCode)) {
            PubSub.publish("keyDown", {key: this.getKey(e.keyCode)})
        }
    }

    handleKeyUp(e) {
        if (this.getKey(e.keyCode)) {
            PubSub.publish("keyUp", {key: this.getKey(e.keyCode)})
        }
    }

    handleKeyPress(e) {

        if (this.getKey(e.keyCode)) {
            PubSub.publish("keyPress", {key: this.getKey(e.keyCode)})
        }
    }

    getKey(keyCode) {
        return this.keyCodeMappings[keyCode];
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
            if (this.checkEntity(mouseX, mouseY, pc.x, pc.y, rc.width, rc.height)) {
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
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Collidable"]);
        super(signature);
    }

    init() {
        PubSub.subscribe("checkCollision", this.checkCollision.bind(this));
    }

    update() {
        var entities = Object.values(this.relevantEntitiesMap);
        var entity, otherEntity;

        for (var i = 0; i < entities.length - 1; i++) {
            entity = entities[i];
            var cc = entity.components[Collidable.prototype.constructor.name];
            if(cc.activeCheck){
                for (var j = i+1; j < entities.length; j++) {
                    otherEntity = entities[j];
                    var othercc = otherEntity.components[Collidable.prototype.constructor.name];
                    if(cc.activeCheck && othercc.activeCheck){
                        var pc = entity.components[PositionComponent.prototype.constructor.name];

                        var p1 = {x: pc.x, y: pc.y};
                        var radius1 = cc.boundingBoxParams.radius;

                        var otherpc = otherEntity.components[PositionComponent.prototype.constructor.name];

                        var p2 = {x: otherpc.x, y: otherpc.y};
                        var radius2 = othercc.boundingBoxParams.radius;

                        if (this.checkCirclesOverlapping(p1, p2, radius1, radius2)) {
                            PubSub.publishSync("collision", {entity1: entity, entity2: otherEntity});
                        }
                    }
                }
            }
        }
    }

    checkCirclesOverlapping(p1, p2, radius1, radius2){
        var xDiff = p2.x - p1.x;
        var yDiff = p2.y - p1.y;

        var distance = Math.sqrt(xDiff*xDiff + yDiff*yDiff);

        return distance < radius1 + radius2;
    }

    checkCollision(topic, data) {
        var entity = data["entity"];
        if (this.relevantEntitiesMap[entity.id]) {
            //check for out of bounds
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            var p1 = {x: pc.x, y: pc.y};
            var p2 = {x: pc.x + rc.width, y: pc.y + rc.height};
            for (var entityId in this.relevantEntitiesMap) {
                if (entityId != entity.id) {
                    var otherEntity = this.relevantEntitiesMap[entityId];
                    var otherpc = otherEntity.components[PositionComponent.prototype.constructor.name];
                    var otherrc = otherEntity.components[RenderComponent.prototype.constructor.name];
                    var p3 = {x: otherpc.x, y: otherpc.y};
                    var p4 = {x: otherpc.x + otherrc.width, y: otherpc.y + otherrc.height};

                    if (this.checkRectangleOverlapping(p1, p2, p3, p4)) {
                        PubSub.publish("collision", {entity1: entity, entity2: otherEntity});
                        break;
                    }
                }
            }
        }
    }

    checkRectangleOverlapping(p1, p2, p3, p4) {
        return !( p2.y < p3.y || p1.y > p4.y || p2.x < p3.x || p1.x > p4.x )
    }
}


class PhysicsSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "PhysicsComponent"]);
        super(signature);
    }

    update() {
        var entities = Object.values(this.relevantEntitiesMap);
        for (var i = 0; i < entities.length; i++) {
            this.applyForces(entities[i]);
        }
    }

    applyForces(entity) {
        var pc = entity.components[PositionComponent.prototype.constructor.name];
        var rc = entity.components[RenderComponent.prototype.constructor.name];
        var physics = entity.components[PhysicsComponent.prototype.constructor.name];

        var angle = physics.angle;
        rc.rotateAngle = angle % 360;
        var dirVectX = Math.sin(Utils.getAngleInRadian(angle));
        var dirVectY = -Math.cos(Utils.getAngleInRadian(angle));

        physics.speed += physics.acceleration;
        physics.speed *= physics.friction;
        if (physics.speed > physics.maxSpeed) physics.speed = physics.maxSpeed;

        physics.velocityX = physics.speed * dirVectX;
        physics.velocityY = physics.speed * dirVectY;

        pc.x += physics.velocityX;
        pc.y += physics.velocityY;
    }
}


/* -------------------------------- ParticleSystem --------------------------------------*/


/* 
 * Particle - are similar to Entity, it's just a syntactic sugar for particle system
 * properties : position (x, y), life, lifeNow, size, sizeNow, color, velocity ( angle, speed ), opacity 
 */
function Particle(id, name) {
    Entity.call(this, id, name);
    this.deltaColor = 0;
}

//particle extends entity
Particle.prototype = Object.create(Entity.prototype);
Particle.prototype.constructor = Particle;

function ParticleRenderComponent(options) {
    RenderComponent.call(this, options.width, options.height, options.texture);
}

//ParticleRenderComponent extends RenderComponent
ParticleRenderComponent.prototype = Object.create(RenderComponent.prototype);
ParticleRenderComponent.prototype.constructor = ParticleRenderComponent;

class ParticleSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "PhysicsComponent", "ParticleEmitterComponent"]);
        super(signature);
    }

    init() {
        // initialize Particle system based on entity's position
        var entities = Object.values(this.relevantEntitiesMap);
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            var rc = entity.components[RenderComponent.prototype.constructor.name];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var pec = entity.components[ParticleEmitterComponent.prototype.constructor.name];

            pec.setOriginalPosition(pec.config.position);
            pec.config.position = this.getRelativePosition(pec.config.position, pc, rc);

            pec.configure(pec.config);

            pec.start();

        }
    }

    getRelativePosition(position, pc, rc) {
        var positionToReturn, pivot;

        pivot = {
            x : pc.x,// - rc.width / 2,
            y : pc.y// - rc.height / 2
        }

        if (position == 'behind') {
            positionToReturn = {
                x: pc.x + rc.width / 2,
                y: pc.y
            }
        } else if (position == 'over') {
            positionToReturn = {
                x : pc.x + rc.width / 2,
                y : pc.y + rc.height / 2
            };
        } else {
            positionToReturn = {
                x : pc.x,
                y : pc.y
            }
        }

        if (rc.rotateAngle) {
            var newCoordinatesBasedOnRotation = Utils.getPointBasedOnRotationOfParent(pivot.x, pivot.y, positionToReturn.x, positionToReturn.y, rc.rotateAngle + 90);
            positionToReturn.x = newCoordinatesBasedOnRotation.x;
            positionToReturn.y = newCoordinatesBasedOnRotation.y;
        };

        return positionToReturn;
    }

    update() {

        var entities = Object.values(this.relevantEntitiesMap);
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];
            var physics = entity.components[PhysicsComponent.prototype.constructor.name];
            var pec = entity.components[ParticleEmitterComponent.prototype.constructor.name];

            pec.updatePosition(this.getRelativePosition(pec.originalPosition, pc, rc));
            pec.update();
        }
    }

}

/* Renderer */
function ParticleRenderer() {
    this.bufferCache = {};
    this.getBuffer = function (texture) {
        var size = '' + texture.width + 'x' + texture.height;

        var canvasParticle = this.bufferCache[size];

        if (!canvasParticle) {
            canvasParticle = document.createElement('canvas');
            canvasParticle.width = texture.width;
            canvasParticle.height = texture.height;
            this.bufferCache[size] = canvasParticle;
        }

        return canvasParticle;
    }
    this.renderParticleTexture = function (context, particle) {
        particle.buffer = particle.buffer || this.getBuffer(particle.texture);
        var bufferContext = particle.buffer.getContext('2d');
        var w = (particle.texture.width * 1) || 0;
        var h = (particle.texture.height * 1) || 0;
        var x = particle.x - w / 2;
        var y = particle.y - h / 2;

        bufferContext.clearRect(0, 0, particle.buffer.width, particle.buffer.height);
        bufferContext.globalAlpha = particle.color[3];
        bufferContext.drawImage(particle.texture, 0, 0);

        bufferContext.globalCompositeOperation = "source-atop";
        bufferContext.fillStyle = Utils.colorArrayToString(particle.color, 1);
        bufferContext.fillRect(0, 0, particle.buffer.width, particle.buffer.height);

        bufferContext.globalCompositeOperation = "source-over";
        bufferContext.globalAlpha = 0.8;
        context.drawImage(particle.buffer, 0, 0, particle.buffer.width, particle.buffer.height, x, y, w, h);
    }

    this.render = function (particle) {
        if (particle) {
            if (particle.texture) {
                if (Array.isArray(particle.color)) {
                    context.globalCompositeOperation = 'lighter';
                    this.renderParticleTexture(context, particle);
                }
            } else {
                if (Array.isArray(particle.color)) {
                    context.fillStyle = Utils.colorArrayToString(particle.color);
                } else {
                    context.fillStyle = particle.color;
                }
                context.beginPath();
                context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2, true);
                context.closePath();
                context.fill();
            }
        }
    }
}


/* Emitter */
function ParticleEmitterComponent(config) {
    this.config = config;
    this.particleRenderer = new ParticleRenderer();
}

ParticleEmitterComponent.prototype = {
    update: function () {

        if (this.emissionRate) {
            var rate = 1.0 / this.emissionRate;
            this.particlesEmitted += 0.02;

            while (!this.hasReachedThreshold() && this.particlesEmitted > rate) {
                this.addParticle();
                this.particlesEmitted -= rate;
            }
        }

        for (var i = 0; i < this.particleCount; ++i) {
            this.updateParticle(this.particlePool[i], 0.02, i);
            this.particleRenderer.render(this.particlePool[i]);
        }
    },

    updatePosition : function(newPos) {
        this.position = newPos;
    },

    setOriginalPosition: function(position) {
        this.originalPosition = position;
    },

    configure: function (config) {
        this.totalParticles = config.totalParticles || 20;
        this.emissionRate = config.emissionRate || 150 / 2;
        this.position = config.position || {x: 0, y: 0};
        this.positionVariance = config.positionVariance || {x: 0, y: 0};
        this.gravity = config.gravity || {x: 0, y: 0};
        this.angle = config.angle || 90;
        this.angleVariance = config.angleVariance || 360;
        this.speed = config.speed || 15;
        this.speedVariance = config.speedVariance || 5;
        this.life = config.life || 15;
        this.lifeVariance = config.lifeVariance || 1;
        this.radius = config.radius || 12;
        this.radiusVariance = config.radiusVariance || 2;
        this.image = config.image;
        this.color = config.color || 'blue';
        this.startColor = config.startColor;
        this.startColorVariance = config.startColorVariance;
        this.endColor = config.endColor;
        this.endColorVariance = config.endColorVariance || [0, 0, 0, 0];
        this.texture = config.texture;
        this.particleCount = 0;
    },

    start: function () {
        this.particlePool = [];

        for (var i = 0; i < this.totalParticles; i++) {
            var particle = new Particle("particle" + i, "particle" + i);
            particle = this.initializeParticle(particle);
            this.particlePool.push(particle);
        }

        this.particleCount = 0;
        this.particlesEmitted = 0;
    },

    reset: function () {
        this.particlePool = [];

        for (var i = 0; i < this.totalParticles; i++) {
            var particle = new Particle("resetparticle" + i, "resetparticle" + i);
            particle = this.initializeParticle(particle);
            this.particlePool.push(particle);
        }

        this.particleCount = 0;
        this.particlesEmitted = 0;
    },

    hasReachedThreshold: function () {
        return this.particleCount === this.totalParticles;
    },

    initializeParticle: function (particle) {

        //give random initial position
        var positionDelta = {
            x: this.positionVariance.x * Utils.random11(),
            y: this.positionVariance.y * Utils.random11()
        }

        //set particle position relative to parent position
        PositionComponent.call(particle, this.position.x + positionDelta.x, this.position.y + positionDelta.y);

        var angle = this.angle + this.angleVariance * Utils.random11();
        var speed = this.speed + this.speedVariance * Utils.random11();

        PhysicsComponent.call(particle, {
            speed: speed,
            angle: angle,
            gravity: this.gravity
        });

        LifeComponent.call(particle, Math.max(0, this.life));

        particle.radius = Utils.isNumber(this.radius) ? this.radius + (this.radiusVariance || 0) * Utils.random11() : 0;

        if (this.texture) {
            particle.texture = new Image();
            particle.texture.src = this.texture;
        }
        ;

        particle.color = this.color;

        if (this.startColor) {
            var startColor = [
                this.startColor[0] + this.startColorVariance[0] * Utils.random11(), this.startColor[1] + this.startColorVariance[1] * Utils.random11(), this.startColor[2] + this.startColorVariance[2] * Utils.random11(), this.startColor[3] + this.startColorVariance[3] * Utils.random11()];

            // if there is no endColor, then the particle will end up staying at startColor the whole time
            var endColor = startColor;
            if (this.endColor) {
                endColor = [
                    this.endColor[0] + this.endColorVariance[0] * Utils.random11(), this.endColor[1] + this.endColorVariance[1] * Utils.random11(), this.endColor[2] + this.endColorVariance[2] * Utils.random11(), this.endColor[3] + this.endColorVariance[3] * Utils.random11()];
            }

            particle.color = startColor;
            particle.deltaColor = [(endColor[0] - startColor[0]) / particle.lifeNow, (endColor[1] - startColor[1]) / particle.lifeNow, (endColor[2] - startColor[2]) / particle.lifeNow, (endColor[3] - startColor[3]) / particle.lifeNow];
        }

        return particle;
    },

    addParticle: function () {
        // take from the pool if idle
        var particle = this.particlePool[this.particleCount++];

        //initialize particle
        this.initializeParticle(particle);
    },

    updateParticle: function (particle, deltaTime, currentIndex) {
        if (particle.lifeNow > 0) {

            particle.forces.x = particle.radial.x + particle.tangential.x + particle.gravity.x;
            particle.forces.y = particle.radial.y + particle.tangential.y + particle.gravity.y;

            particle.forces.x *= deltaTime;
            particle.forces.y *= deltaTime;

            particle.velocity.x += particle.forces.x;
            particle.velocity.y += particle.forces.y;

            particle.x += particle.velocity.x * deltaTime;
            particle.y += particle.velocity.y * deltaTime;

            var positionDelta = {
                x: this.positionVariance.x * Utils.random11(),
                y: this.positionVariance.y * Utils.random11()
            }

            particle.lifeNow -= deltaTime;

            if (particle.color) {
                particle.color[0] += particle.deltaColor[0] * deltaTime;
                particle.color[1] += particle.deltaColor[1] * deltaTime;
                particle.color[2] += particle.deltaColor[2] * deltaTime;
                particle.color[3] += particle.deltaColor[3] * deltaTime;
            }
        } else {
            // put into pool for reuse
            var particleInContext = this.particlePool[currentIndex];

            //swap with particleCount 'th' element
            this.particlePool[currentIndex] = this.particlePool[this.particleCount - 1];
            this.particlePool[this.particleCount - 1] = particleInContext;

            //decrease count
            this.particleCount--;
        }

    }
}

ParticleEmitterComponent.prototype.constructor = ParticleEmitterComponent;

/* --------------------- Spritesheet ---------------------------------*/
function SpritesheetManager() {}

var spritesheets = {}
SpritesheetManager.loadSpritesheet = function(spritesheetName, spritesheetFilename, spriteWidth, spriteHeight){
    var image = new Image();
    image.src = spritesheetFilename;
    spritesheets[spritesheetName] = [];
    atlas[spritesheetFilename] = image;
    image.onload = function() {
        var columns = Math.floor(image.width / spriteWidth);
        var rows = Math.floor(image.height / spriteHeight);

        for(var r=0; r<rows; r++){
            for(var c=0; c<columns; c++){
                spritesheets[spritesheetName].push({
                    sx: c*spriteWidth,
                    sy: r*spriteHeight,
                    sw: spriteWidth,
                    sh: spriteHeight
                });
            }
        }
    };
}

/* --------------------- Screens -------------------------------------*/
var screensSystemsMapping = {};
var currentScreen;

function ScreenManager(){}

ScreenManager.addSystemToScreen = function(system, screen){
    if(!screensSystemsMapping[screen])
        screensSystemsMapping[screen] = [];

    screensSystemsMapping[screen].push(system);
}

ScreenManager.switchToScreen = function(screen) {
    if(currentScreen){
        //destroy systems
        var currentScreenSystems = screensSystemsMapping[currentScreen];
        for (var i = 0; i < currentScreenSystems.length; i++) {
            if(currentScreenSystems[i].destroy)
                currentScreenSystems[i].destroy();
        }
        PubSub.clearAllSubscriptions();
    } //initialize systems
    currentScreen = screen;
    var currentScreenSystems = screensSystemsMapping[currentScreen];
    for (var i = 0; i < currentScreenSystems.length; i++) {
        if(currentScreenSystems[i].init)
            currentScreenSystems[i].init();
    }
}

/* --------------------- Game loop -----------------------------------*/
function startGameLoop(interval, screen="default"){
    ScreenManager.switchToScreen(screen);
    setInterval(game_loop, interval);
}

function game_loop() {
    var currentScreenSystems = screensSystemsMapping[currentScreen];
    for (var i = 0; i < currentScreenSystems.length; i++) {
        currentScreenSystems[i].update();
    }
    EntityManager.sweepRemovalOfComponents();
}

/* -------------------- some util functions ------------------------ */

Utils = {
    getAngleInRadian: function (angle) {
        return angle * Math.PI / 180;
    },

    getRandomInt: function (min, max) {
        return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    },

    colorArrayToString: function (array, overrideAlpha) {
        var r = array[0] | 0;
        var g = array[1] | 0;
        var b = array[2] | 0;
        var a = overrideAlpha || array[3];

        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
    },

    isNumber: function (i) {
        return typeof i === 'number';
    },

    isInteger: function (num) {
        return num === (num | 0);
    },

    random: function (minOrMax, maxOrUndefined, dontFloor) {
        dontFloor = dontFloor || false;
        var min = this.isNumber(maxOrUndefined) ? minOrMax : 0;
        var max = this.isNumber(maxOrUndefined) ? maxOrUndefined : minOrMax;
        var range = max - min;
        var result = Math.random() * range + min;
        if (this.isInteger(min) && this.isInteger(max) && !dontFloor) {
            return Math.floor(result);
        } else {
            return result;
        }
    },

    random11: function () {
        return this.random(-1, 1, true);
    },

    //mx, my = pivot, cx, cy = point, angle in degrees
    getPointBasedOnRotationOfParent: function (mx, my, cx, cy, angle) {

        var x, y, dist, diffX, diffY;

        // get distance from center to point
        diffX = cx - mx;
        diffY = cy - my;
        dist = Math.sqrt(diffX * diffX + diffY * diffY);

        var angleInRadian = Utils.getAngleInRadian(angle);

        var x = mx + dist * Math.cos(angleInRadian);
        var y = my + dist * Math.sin(angleInRadian);

        return {x: x, y: y};
    }
}

BitUtils = {
    getBitEquivalentForComponent: function (componentNames) {

        var indexes = [];
        components.forEach(function (component, index) {
            if (componentNames.includes(component)) {
                indexes.push(1);
                var componentNameIndex = componentNames.indexOf(component);
                componentNames.splice(componentNameIndex, 1);
            } else {
                indexes.push(0);
            }
        });
        return parseInt(indexes.join(''), 2);
    }
}