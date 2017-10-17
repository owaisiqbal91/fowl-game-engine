CanvasManager.initializeCanvas("asteroid", 200);

function Missile() {
}

function Asteroid(type) {
    this.type = type;
}

function Explosion() {
}

class CollisionResolutionSystem extends System {
    constructor(poolSystem) {
        var signature = BitUtils.getBitEquivalentForComponent(["Collidable", "PhysicsComponent", "PositionComponent"]);
        super(signature);
        this.poolSystem = poolSystem;
    }

    init() {
        PubSub.subscribe("collision", this.handleCollision.bind(this));
    }

    handleCollision(topic, data) {

        //asteroid--missile
        if ((data.entity1.name == 'missile' && data.entity2.name == 'asteroid') ||
            (data.entity1.name == 'asteroid' && data.entity2.name == 'missile')) {
            var missile = data.entity1.name == 'missile' ? data.entity1 : data.entity2;
            var asteroid = data.entity1.name == 'asteroid' ? data.entity1 : data.entity2;

            //remove missile
            var missileCollisionComp = missile.components[Collidable.prototype.constructor.name];
            missile.removeComponent(missileCollisionComp);
            var missilePC = missile.components[PositionComponent.prototype.constructor.name];
            missilePC.x = -900;
            missilePC.y = -900;
            var missilePhysics = missile.components[PhysicsComponent.prototype.constructor.name];
            missilePhysics.speed = 0;

            //remove asteroid
            var asteroidCollisionComp = asteroid.components[Collidable.prototype.constructor.name];
            asteroid.removeComponent(asteroidCollisionComp);
            var asteroidPC = asteroid.components[PositionComponent.prototype.constructor.name];
            var asteroidPosition = {x: asteroidPC.x, y: asteroidPC.y};
            asteroidPC.x = -300;
            asteroidPC.y = -300;
            var asteroidPhysics = asteroid.components[PhysicsComponent.prototype.constructor.name];
            asteroidPhysics.speed = 0;

            var asteroidType = asteroid.components[Asteroid.prototype.constructor.name].type;

            //publish collision
            incrementScore();
            PubSub.publish("asteroidDestroyed", {asteroidPosition: asteroidPosition, asteroidType: asteroidType})
        }

        //asteroid--rocket
        else if ((data.entity1.name == 'rocket' && data.entity2.name == 'asteroid') ||
            (data.entity1.name == 'asteroid' && data.entity2.name == 'rocket')) {
            var rocket = data.entity1.name == 'rocket' ? data.entity1 : data.entity2;
            var asteroid = data.entity1.name == 'asteroid' ? data.entity1 : data.entity2;

            //remove asteroid
            var asteroidCollisionComp = asteroid.components[Collidable.prototype.constructor.name];
            asteroid.removeComponent(asteroidCollisionComp);
            var asteroidPC = asteroid.components[PositionComponent.prototype.constructor.name];
            var asteroidPosition = {x: asteroidPC.x, y: asteroidPC.y};
            asteroidPC.x = -300;
            asteroidPC.y = -300;
            var asteroidPhysics = asteroid.components[PhysicsComponent.prototype.constructor.name];
            asteroidPhysics.speed = 0;

            var asteroidType = asteroid.components[Asteroid.prototype.constructor.name].type;

            //publish collision
            PubSub.publish("asteroidDestroyed", {asteroidPosition: asteroidPosition, asteroidType: asteroidType})
            PubSub.publish("rocketDestroyed");
        }
    }

    update() {
    }
}

class RocketSystem extends System {
    constructor(rocket) {
        var signature = BitUtils.getBitEquivalentForComponent([]);
        super(signature);
        this.rocket = rocket;
    }

    init() {
        PubSub.subscribe("rocketDestroyed", this.handleDestruction.bind(this));
        this.vulnerable = true;
        this.rc = this.rocket.components[RenderComponent.prototype.constructor.name];
        this.rc.alpha = 1;
    }

    destroy() {
        this.rc.alpha = 0;
    }

    handleDestruction() {
        if (this.vulnerable) {
            this.vulnerable = false;

            var pc = this.rocket.components[PositionComponent.prototype.constructor.name];

            pc.x = canvas.width / 2;
            pc.y = canvas.clientHeight / 2;

            lives--;

            if (lives > 0) {
                this.cc = this.rocket.components[Collidable.prototype.constructor.name];
                this.cc.activeCheck = false;

                setTimeout(this.makeVulnerable.bind(this), 3000);
                //blinking while invulnerable
                this.blinkingInterval = setInterval(this.toggleVisibility.bind(this), 200);
            } else {//game over
                ScreenManager.switchToScreen("gameover")
            }
        }
    }

    toggleVisibility() {
        if (this.rc.alpha == 1) {
            this.rc.alpha = 0;
        } else {
            this.rc.alpha = 1;
        }
    }

    makeVulnerable() {
        clearInterval(this.blinkingInterval);
        this.cc.activeCheck = true;
        this.rc.alpha = 1;
        this.vulnerable = true;
    }

    update() {
        var pc = this.rocket.components[PositionComponent.prototype.constructor.name];

        var wrapped = CanvasManager.getWrappedAroundValues(pc.x, pc.y);
        pc.x += wrapped.wx;
        pc.y += wrapped.wy;
    }
}

class FiringSystem extends System {
    constructor(rocket, poolSystem) {
        var signature = BitUtils.getBitEquivalentForComponent(["Missile"]);
        super(signature);
        this.poolSystem = poolSystem;
        poolSystem.registerCreateCallback("missile", this.createMissile.bind(this));
        poolSystem.registerEmitCallback("missile", this.emitMissile.bind(this));
        this.rocket = rocket;
    }

    init() {
        console.log("In init of Firing");
        PubSub.subscribe("keyPress", this.handleKeyPress.bind(this));
    }

    handleKeyPress(topic, data) {
        if (data.key === "space") {
            console.log("missile emitted");
            this.poolSystem.emit("missile");
        }
    }

    update() {
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];

            var pc = entity.components[PositionComponent.prototype.constructor.name];

            if (CanvasManager.isOutOfBounds(pc.x, pc.y, 0)) {
                var cc = entity.components[Collidable.prototype.constructor.name];
                entity.removeComponent(cc);
            }
        }
    }

    createMissile() {
        var missile = EntityManager.createEntity("missile");
        missile.addComponent(new PositionComponent());
        missile.addComponent(new RenderComponent(10, 10, "images/fire.png", ORIGIN.CENTER));
        missile.addComponent(new Missile());
        missile.addComponent(new Pooled());
        missile.addComponent(new PhysicsComponent({speed: 20}));
        return missile;
    }

    emitMissile(missile) {
        missile.addComponent(new Collidable(BOUNDING_BOX.CIRCULAR, {radius: 7}, true));

        var rocketPC = this.rocket.components[PositionComponent.prototype.constructor.name];
        var rocketPhysics = this.rocket.components[PhysicsComponent.prototype.constructor.name];

        var missilePC = missile.components[PositionComponent.prototype.constructor.name];
        var missilePhysics = missile.components[PhysicsComponent.prototype.constructor.name];

        missilePC.x = rocketPC.x;
        missilePC.y = rocketPC.y;
        missilePhysics.speed = 20;
        missilePhysics.angle = rocketPhysics.angle % 360;
    }
}

class AsteroidSystem extends System {

    constructor(poolSystem) {
        var signature = BitUtils.getBitEquivalentForComponent(["Asteroid"]);
        super(signature);
        this.poolSystem = poolSystem;
    }

    init() {
        this.poolSystem.registerCreateCallback("asteroid", this.createAsteroid.bind(this));
        this.poolSystem.registerEmitCallback("asteroid", this.emitAsteroid.bind(this));

        this.smallAsteroid = {
            type: "small",
            spriteIndex: 0,
            speed: 5,
            width: 30,
            height: 30,
            radius: 21
        };
        this.mediumAsteroid = {
            type: "medium",
            spriteIndex: 1,
            speed: 4,
            width: 40,
            height: 40,
            radius: 28
        };
        this.bigAsteroid = {
            type: "big",
            spriteIndex: 2,
            speed: 2,
            width: 50,
            height: 50,
            radius: 35
        };

        PubSub.subscribe("asteroidDestroyed", this.spawnSmallerAsteroids.bind(this));
        PubSub.subscribe("levelUp", this.changeSpawns.bind(this));

        var rate = 60;//no of asteroids per minute
        this.spawnIntervals = [];
        this.spawnIntervals.push(setInterval(this.spawn.bind(this), 1000 * 60 / rate, {conf: this.smallAsteroid}));
    }

    changeSpawns(topic, data) {
        for (var i = 0; i < this.spawnIntervals.length; i++) {
            clearInterval(this.spawnIntervals[i]);
        }
        this.spawnIntervals = [];

        var levelNo = data.levelNo;
        var rate = 60 + levelNo * 4;
        this.spawnIntervals.push(setInterval(this.spawn.bind(this), 1000 * 60 / rate, {conf: this.smallAsteroid}));
        if (levelNo >= 2) {
            rate = 30 + levelNo * 3;
            this.spawnIntervals.push(setInterval(this.spawn.bind(this), 1000 * 60 / rate, {conf: this.mediumAsteroid}));
        }
        if (levelNo >= 3) {
            rate = 20 + levelNo * 2;
            this.spawnIntervals.push(setInterval(this.spawn.bind(this), 1000 * 60 / rate, {conf: this.bigAsteroid}));
        }
    }

    destroy() {
        for (var i = 0; i < this.spawnIntervals.length; i++) {
            clearInterval(this.spawnIntervals[i]);
        }
        for (var key in this.relevantEntitiesMap) {
            var asteroid = this.relevantEntitiesMap[key];
            var asteroidPC = asteroid.components[PositionComponent.prototype.constructor.name];
            asteroidPC.x = -300;
            asteroidPC.y = -300;
            this.poolSystem.returnToPool(asteroid);
        }
    }

    spawnSmallerAsteroids(topic, data) {
        if (data.asteroidType == "big") {
            for (var i = 0; i < 2; i++) {
                data.conf = this.mediumAsteroid;
                this.spawn(data);
            }
        } else if (data.asteroidType == "medium") {
            for (var i = 0; i < 3; i++) {
                data.conf = this.smallAsteroid;
                this.spawn(data);
            }
        }
    }

    spawn(options) {
        var options = options || {conf: this.bigAsteroid};
        this.poolSystem.emit("asteroid", options);
    }

    createAsteroid() {
        var asteroid = EntityManager.createEntity("asteroid");
        return asteroid;
    }

    emitAsteroid(asteroid, options) {
        var conf = options.conf;
        var asteroidPosition = options.asteroidPosition;

        asteroid.addComponent(new PositionComponent());
        asteroid.addComponent(new RenderComponent(conf.width, conf.height, "images/asteroidspritesheet.png", ORIGIN.CENTER, {
            name: "asteroids",
            spriteIndex: conf.spriteIndex
        }));
        asteroid.addComponent(new Asteroid(conf.type));
        asteroid.addComponent(new Pooled());
        asteroid.addComponent(new PhysicsComponent({}));
        asteroid.addComponent(new Collidable(BOUNDING_BOX.CIRCULAR, {radius: conf.radius}, true));

        var asteroidPC = asteroid.components[PositionComponent.prototype.constructor.name];
        var asteroidPhysics = asteroid.components[PhysicsComponent.prototype.constructor.name];

        var posX, posY, angle;

        if (!asteroidPosition) {
            posX = Utils.getRandomInt(0, canvas.width);
            posY = Utils.getRandomInt(0, canvas.clientHeight);

            if (Utils.getRandomInt(0, 2) == 0) {
                if (posX < canvas.width / 2) {
                    posX = 0;
                    angle = Utils.getRandomInt(0, 180);
                }
                else {
                    posX = canvas.width;
                    angle = Utils.getRandomInt(180, 360);
                }
            } else {
                if (posY < canvas.clientHeight / 2) {
                    posY = 0;
                    angle = Utils.getRandomInt(90, 270);
                }
                else {
                    posY = canvas.clientHeight;
                    angle = Utils.getRandomInt(270, 450);
                }
            }
        } else {
            posX = asteroidPosition.x;
            posY = asteroidPosition.y;
            angle = Utils.getRandomInt(0, 360);
        }

        asteroidPC.x = posX;
        asteroidPC.y = posY;
        asteroidPhysics.speed = conf.speed;
        asteroidPhysics.angle = angle;
    }

    update() {
    }
}

class MovementSystem extends System {
    constructor(rocket) {
        var signature = BitUtils.getBitEquivalentForComponent([]);
        super(signature);
        this.rocket = rocket;
    }

    init() {
        this.rotateLeft = false;
        this.rotateRight = false;
        this.currentDirection = this.left;
        PubSub.subscribe("keyDown", this.handleKeyDown.bind(this));
        PubSub.subscribe("keyUp", this.handleKeyUp.bind(this));
    }

    handleKeyDown(topic, data) {
        if (data.key === "up") {
            //accelerate forward based on current angle
            this.accelerateEntity();
        }
        else if (data.key === "left") {
            //this.rotateEntity(-10);
            this.rotateLeft = true;
        }
        else if (data.key === "right") {
            //this.rotateEntity(10);
            this.rotateRight = true;
        }
    }

    handleKeyUp(topic, data) {
        if (data.key === "up") {
            //accelerate forward based on current angle
            this.stopAcceleration();
        }
        else if (data.key === "left") {
            //this.rotateEntity(-10);
            this.rotateLeft = false;
        }
        else if (data.key === "right") {
            //this.rotateEntity(10);
            this.rotateRight = false;
        }
    }

    rotateEntity(rotateAngle) {
        var physics = this.rocket.components[PhysicsComponent.prototype.constructor.name];
        physics.setAngle(physics.angle + rotateAngle);
    }

    accelerateEntity() {
        var physics = this.rocket.components[PhysicsComponent.prototype.constructor.name];
        physics.acceleration = 0.2;
    }

    stopAcceleration() {
        var physics = this.rocket.components[PhysicsComponent.prototype.constructor.name];
        physics.acceleration = 0;
    }

    update() {
        if (this.rotateRight) this.rotateEntity(5);
        if (this.rotateLeft) this.rotateEntity(-5);
    }
}

class RestartSystem extends System {
    constructor(rocket) {
        var signature = BitUtils.getBitEquivalentForComponent([]);
        super(signature);
        this.rocket = rocket;
    }

    init() {
        PubSub.subscribe("keyPress", this.handleKeyPress.bind(this));
    }

    update() {
    }

    handleKeyPress(topic, data) {
        if (data.key == "space") {
            var rocketPC = rocket.components[PositionComponent.prototype.constructor.name];

            rocketPC.x = canvas.width / 2;
            rocketPC.y = canvas.height / 2;
            rocket.addComponent(new PhysicsComponent({maxSpeed: 10, friction: 0.99}));

            initializeHUDVars();

            ScreenManager.switchToScreen("default");
        }
    }
}

class ExplosionSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["Explosion"]);
        super(signature);
    }

    init() {
        PubSub.subscribe("asteroidDestroyed", this.createExplosion.bind(this));
        PubSub.subscribe("animationDone", this.removeExplosion.bind(this));
    }

    update() {
    }

    createExplosion(topic, data) {
        var explosion = EntityManager.createEntity("explosion");
        explosion.addComponent(new PositionComponent(data.asteroidPosition.x, data.asteroidPosition.y));
        explosion.addComponent(new RenderComponent(50, 50, "images/explosion.png", ORIGIN.CENTER, {
            name: "explosion",
            spriteIndex: 0,
            animating: true,
            endFrameIndex: 13,
            ticksPerFrame: 2
        }));
    }

    removeExplosion(topic, data) {
        var entity = data.entity;
        EntityManager.removeEntity(entity);
    }
}

/*--------------------------------GAME INITIALIZATION AND LOOP-----------------------------------*/

var rocket;

function initializeEntities() {
    rocket = EntityManager.createEntity("rocket");
    rocket.addComponent(new PositionComponent(canvas.width / 2, canvas.clientHeight / 2));
    rocket.addComponent(new RenderComponent(50, 50, "images/rocket.png", ORIGIN.CENTER));
    rocket.addComponent(new PhysicsComponent({maxSpeed: 10, friction: 0.99}));
    rocket.addComponent(new Collidable(BOUNDING_BOX.CIRCULAR, {radius: 35}, true));
}

function init() {
    //define components
    ComponentManager.initialize(["Rocket", "Missile", "Pooled", "Asteroid"]);
    initializeEntities();
    SpritesheetManager.loadSpritesheet("asteroids", "images/asteroidspritesheet.png", 242, 239);
    SpritesheetManager.loadSpritesheet("explosion", "images/explosion.png", 128, 128);

    SystemManager.addSystem(new MovementSystem(rocket));
    SystemManager.addSystem(new InputSystem());
    SystemManager.addSystem(new PhysicsSystem());
    SystemManager.addSystem(new RocketSystem(rocket));

    var poolSystem = new PoolSystem();
    SystemManager.addSystem(poolSystem);
    SystemManager.addSystem(new FiringSystem(rocket, poolSystem));
    SystemManager.addSystem(new AsteroidSystem(poolSystem));

    SystemManager.addSystem(new CollisionSystem());
    SystemManager.addSystem(new CollisionResolutionSystem());
    SystemManager.addSystem(new ExplosionSystem());

    var rs = new RenderSystem();
    rs.addAfterRenderCallback(renderScore);
    SystemManager.addSystem(rs);

    /*-----Game Over state-------*/
    var gameOverRender = new RenderSystem();
    gameOverRender.addAfterRenderCallback(renderGameOverScreen);
    SystemManager.addSystem(gameOverRender, "gameover");
    SystemManager.addSystem(new RestartSystem(rocket), "gameover");

    initializeHUDVars();
    startGameLoop(30);
}

init();

var score;
var lives;
var currentLevel;

function initializeHUDVars() {
    score = 0;
    lives = 3;
    currentLevel = 1;
}

var persistentStorage = new PersistentStorage();
var highScore = persistentStorage.get("highScoreAsteroids") ? persistentStorage.get("highScoreAsteroids") : 0;

function renderScore() {
    context.font = "20px Arial";
    context.fillStyle = "white";
    context.fillText("Score: " + score + " | High Score: " + highScore, 0, 15);
    context.fillText("Lives: " + lives, 300, 15);
    context.fillText("Level: " + currentLevel, 500, 15);
}

function renderGameOverScreen() {
    context.font = "40px Arial";
    context.fillStyle = "white";
    context.fillText("Game Over! Press Space to continue", 100, 300);
}

function incrementScore() {
    score++;
    if (score % 5 == 0) {
        currentLevel++;
        PubSub.publish("levelUp", {levelNo: currentLevel});
    }
    if (score > highScore) {
        highScore = score;
        persistentStorage.persist("highScoreAsteroids", highScore);
    }
}