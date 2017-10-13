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
function ComponentManager() {}
ComponentManager.initialize = function(gameComponents) {
    ComponentManager.newComponentsLength = gameComponents.length;
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
    this.gravity = options.gravity || { x: 0, y: 0};
    this.speed = options.speed || 0;
    this.angle = options.angle || 0; 

    var angleInRadian = Utils.getAngleInRadian(this.angle);
    this.velocity = {
        x: this.speed * Math.cos(angleInRadian),
        y: -1 * this.speed * Math.sin(angleInRadian)
    };
    
    this.radial = options.radial || { x: 0, y: 0};
    this.tangential = options.tangential || { x: 0, y: 0};
    this.forces = options.forces || { x: 0, y: 0};

 }

 PhysicsComponent.prototype.setAngle = function(angle) {
    this.angle = angle;
    this.setVelocity();
 }

 PhysicsComponent.prototype.setSpeed = function(speed) {
    this.speed = speed;
    this.setVelocity();
 }

 PhysicsComponent.prototype.setVelocity = function() {
    var angleInRadian = Utils.getAngleInRadian(this.angle);
    this.velocity = {
        x: this.speed * Math.cos(angleInRadian),
        y: -1 * this.speed * Math.sin(angleInRadian)
    };
 }


function Input() {
}

function Collidable() {
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

    update() {
        canvas.width = canvas.width;

        if(this.beforeRenderCallback) this.beforeRenderCallback();

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

        if(this.afterRenderCallback) this.afterRenderCallback();
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
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Input"]);
        super(signature);
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
        } else if(e.keyCode == '32'){
            //space
            PubSub.publishSync("keyDown", {key:"space"})
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
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Collidable"]);
        super(signature);
    }

    init() {
        PubSub.subscribe("checkCollision", this.checkCollision.bind(this));
    }

    update() {
        var entities = Object.values(this.relevantEntitiesMap);
        var entity, otherEntity;
        var found = false;
        for (var i = 0; i < entities.length; i++) {
            entity = entities[i];
            for (var j = 0; j < entities.length; j++) {
                otherEntity = entities[j];
                if (i != j) {
                    var pc = entity.components[PositionComponent.prototype.constructor.name];
                    var rc = entity.components[RenderComponent.prototype.constructor.name];

                    var p1 = {x: pc.x, y: pc.y};
                    var p2 = {x: pc.x + rc.image.width, y: pc.y + rc.image.height};
                    
                    var otherpc = otherEntity.components[PositionComponent.prototype.constructor.name];
                    var otherrc = otherEntity.components[RenderComponent.prototype.constructor.name];

                    var p3 = {x: otherpc.x, y: otherpc.y};
                    var p4 = {x: otherpc.x + otherrc.image.width, y: otherpc.y + otherrc.image.height};
                    
                    if(this.checkOverlapping(p1, p2, p3, p4)) {
                        PubSub.publish("collision", {entity1: entity, entity2: otherEntity});
                        found = true;
                        break;
                    };
                } 
            };
            if (found) {
                break;
            };
        };
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
        if (p1.x && p1.y && p2.x && p2.y && p3.x && p3.y && p4.x && p4.y ) {
            return !( p2.y < p3.y || p1.y > p4.y || p2.x < p3.x || p1.x > p4.x )
        };
        return false;
    }
}


class PhysicsSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "PhysicsComponent"]);
        super(signature);
    }

    init() {

    }

    update() {
        var entities = Object.values(this.relevantEntitiesMap);
        var entity;
        for (var i = 0; i < entities.length; i++) {
            entity = entities[i];
            this.applyForces(entity, 0.5);
        }
    }

    applyForces(entity, deltaTime) {
        var pc = entity.components[PositionComponent.prototype.constructor.name];
        var rc = entity.components[RenderComponent.prototype.constructor.name];
        var physics = entity.components[PhysicsComponent.prototype.constructor.name];

        var velocity = physics.velocity;
        var speed = physics.speed;
        var angle = physics.angle;

        //based on physics change position and size
        rc.rotateAngle = angle;

        var forces = { x: 0, y: 0 };

        forces.x = physics.radial.x + physics.tangential.x + physics.gravity.x;
        forces.y = physics.radial.y + physics.tangential.y + physics.gravity.y;

        forces.x *= deltaTime;
        forces.y *= deltaTime;

        velocity.x += forces.x;
        velocity.y += forces.y;

        pc.x += velocity.x * deltaTime;
        pc.y += velocity.y * deltaTime;

        pc.x = pc.x + speed * Math.cos((rc.rotateAngle - 90) * Math.PI / 180);
        pc.y = pc.y + speed * Math.sin((rc.rotateAngle - 90) * Math.PI / 180);

    }
}


/* -------------------------------- ParticleSystem --------------------------------------*/


/* 
 * Particle - are similar to Entity, it's just a syntactic sugar for particle system
 * properties : position (x, y), life, lifeNow, size, sizeNow, color, velocity ( angle, speed ), opacity 
 */
function Particle(id, name) {
    Entity.call(this, id, name);
    this.color = 'blue';
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

            if (pec.config.position == 'behind') {
                pec.config.position = {
                    x: pc.x + rc.image.width / 2,
                    y: pc.y + rc.image.height
                }
            } else {
                pec.config.position = pc;
            }

            pec.configure(pec.config);
            pec.start();

        }
    }

    update() {

        var entities = Object.values(this.relevantEntitiesMap);
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];
            var physics = entity.components[PhysicsComponent.prototype.constructor.name];
            var pec = entity.components[ParticleEmitterComponent.prototype.constructor.name];

            var parent = {
                x : pc.x + rc.image.width / 2,
                y : pc.y + rc.image.height / 2,
                rotateAngle : rc.rotateAngle
            };
            if (physics) {
                parent.physics = physics;
            };
            pec.update(parent);
        }
    }

}

/* Renderer */
function ParticleRenderer() {
    this.bufferCache = {};
    this.getBuffer = function(texture) {
        var size = '' + texture.width + 'x' + texture.height;

        var canvas = this.bufferCache[size];

        if(!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = texture.width;
            canvas.height = texture.height;
            this.bufferCache[size] = canvas;
        }

        return canvas;
    }
    this.renderParticleTexture =  function(context, particle, parent) {
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

    this.render = function(particle, parent) {
        if (particle) {
            if (particle.texture) {
                if (Array.isArray(particle.color)) {
                    context.globalCompositeOperation = 'lighter';
                    this.renderParticleTexture(context, particle, parent);
                }
            } else {
                if (Array.isArray(particle.color)) {
                    context.fillStyle = Utils.colorArrayToString(particle.color);
                } else {
                    context.fillStyle = particle.color;
                }
                context.beginPath();
                context.arc(particle.x, particle.y, particle.radius, 0, Math.PI*2, true);
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
    update : function(parent) {
        
        if (this.emissionRate) {
            var rate = 1.0 / this.emissionRate;
            this.particlesEmitted += 0.02;

            while (!this.hasReachedThreshold() && this.particlesEmitted > rate) {
                this.addParticle();
                this.particlesEmitted -= rate;
            }
        }

        for (var i = 0; i < this.particleCount; ++i) {
            this.updateParticle(this.particlePool[i], 0.02, i, parent);
            this.particleRenderer.render(this.particlePool[i], parent);
        }
    },

    configure : function(config) {
        this.totalParticles = config.totalParticles || 20;
        this.emissionRate = config.emissionRate || 150 / 2;
        this.originalPosition = config.position || { x : 0, y : 0 };
        this.position = config.position || { x : 0, y : 0 };
        this.positionVariance = config.positionVariance || { x: 0, y: 0 };
        this.gravity = config.gravity || { x: 0, y: 0 };
        this.angle = config.angle || 90;
        this.angleVariance = config.angleVariance || 360;
        this.speed = config.speed || 15;
        this.speedVariance = config.speedVariance || 5;
        this.life = config.life || 15;
        this.lifeVariance = config.lifeVariance || 1;
        this.radius = config.radius || 12;
        this.radiusVariance = config.radiusVariance || 2;
        this.image = config.image;
        this.startColor = config.startColor;
        this.startColorVariance = config.startColorVariance;
        this.endColor = config.endColor;
        this.endColorVariance = config.endColorVariance || [0, 0, 0, 0];
        this.texture = config.texture;
        this.particleCount = 0;
    },

    start : function() {
        this.particlePool = [];

        for (var i = 0; i < this.totalParticles; i++) {
            var particle = new Particle("particle" + i, "particle" + i);
            particle = this.initializeParticle(particle);
            this.particlePool.push(particle);
        }

        this.particleCount = 0;
        this.particlesEmitted = 0;  
    },

    reset : function() {
        this.particlePool = [];

        for (var i = 0; i < this.totalParticles; i++) {
            var particle = new Particle("resetparticle" + i, "resetparticle" + i);
            particle = this.initializeParticle(particle);
            this.particlePool.push(particle);
        }

        this.particleCount = 0;
        this.particlesEmitted = 0;  
    },

    hasReachedThreshold : function() {
        return this.particleCount === this.totalParticles;
    },

    initializeParticle : function(particle) {

        //give random initial position
        var positionDelta = {
            x : this.positionVariance.x * Utils.random11(),
            y : this.positionVariance.y * Utils.random11()
        }

        //set particle position relative to parent position
        PositionComponent.call(particle, this.position.x + positionDelta.x, this.position.y + positionDelta.y);

        var angle = this.angle + this.angleVariance * Utils.random11();
        var speed = this.speed + this.speedVariance * Utils.random11();

        PhysicsComponent.call(particle, {
            speed : speed,
            angle : angle,
            gravity : this.gravity
        });

        LifeComponent.call(particle, Math.max(0, this.life));

        particle.radius = Utils.isNumber(this.radius) ? this.radius + (this.radiusVariance || 0) * Utils.random11() : 0;

        if (this.texture) {
            particle.texture = new Image();
            particle.texture.src = this.texture;
        };
        
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

    addParticle : function() {
        // take from the pool if idle
        var particle = this.particlePool[this.particleCount++];

        //initialize particle
        this.initializeParticle(particle);
    }, 

    updateParticle : function(particle, deltaTime, currentIndex, parent) {
        if (particle.lifeNow > 0) {

            if (parent && parent.physics) {
                particle.radial.x += parent.physics.radial.x;
                particle.radial.y += parent.physics.radial.y;
                particle.tangential.x += parent.physics.tangential.x;
                particle.tangential.y += parent.physics.tangential.y;
                particle.velocity.x += parent.physics.velocity.x;
                particle.velocity.y += parent.physics.velocity.y;
            };

            particle.forces.x = particle.radial.x + particle.tangential.x + particle.gravity.x;
            particle.forces.y = particle.radial.y + particle.tangential.y + particle.gravity.y;

            particle.forces.x *= deltaTime;
            particle.forces.y *= deltaTime;

            particle.velocity.x += particle.forces.x;
            particle.velocity.y += particle.forces.y;

            particle.x += particle.velocity.x * deltaTime;
            particle.y += particle.velocity.y * deltaTime;

            if (parent.rotateAngle) {
                var newCoordinatesBasedOnRotation = Utils.getPointBasedOnRotationOfParent(parent.x, parent.y, particle.x, particle.y, parent.rotateAngle + 90);
                particle.x = newCoordinatesBasedOnRotation.x;
                particle.y = newCoordinatesBasedOnRotation.y;

                //find gravity based on angle


            };
            
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



/* -------------------- some util functions ------------------------ */

Utils = {
    getAngleInRadian : function(angle) {
        return angle * Math.PI / 180;
    },

    getRandomInt : function(min, max) {
        return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    },

    colorArrayToString: function(array, overrideAlpha) {
        var r = array[0] | 0;
        var g = array[1] | 0;
        var b = array[2] | 0;
        var a = overrideAlpha || array[3];

        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
    },

    isNumber: function(i) {
            return typeof i === 'number';
        },

    isInteger: function(num) {
        return num === (num | 0);
    },

    random: function(minOrMax, maxOrUndefined, dontFloor) {
        dontFloor = dontFloor || false;
        var min = this.isNumber(maxOrUndefined) ? minOrMax: 0;
        var max = this.isNumber(maxOrUndefined) ? maxOrUndefined: minOrMax;
        var range = max - min;
        var result = Math.random() * range + min;
        if (this.isInteger(min) && this.isInteger(max) && ! dontFloor) {
            return Math.floor(result);
        } else {
            return result;
        }
    },

    random11: function() {
        return this.random(-1, 1, true);
    },

    //mx, my = pivot, cx, cy = point, angle in degrees
    getPointBasedOnRotationOfParent: function(mx, my, cx, cy, angle) {

        var x, y, dist, diffX, diffY;

        // get distance from center to point
        diffX = cx - mx;
        diffY = cy - my;
        dist = Math.sqrt(diffX * diffX + diffY * diffY);

        var angleInRadian = Utils.getAngleInRadian(angle);

        var x = mx + dist * Math.cos(angleInRadian);
        var y = my + dist * Math.sin(angleInRadian);

        return { x: x, y: y };
    }
}

BitUtils = {
    getBitEquivalentForComponent : function(componentNames) {
        var indexes = [];
        components.forEach(function(component, index) {
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