canvas = document.getElementById("asteroid");
context = canvas.getContext('2d');


function Sky() {

}

class SkySystem extends System {
	constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Sky"]);
        super(signature);
    }

	update() {

	}
}

function Rocket() {
}

class RocketSystem extends System {
	constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Rocket"]);
        super(signature);
    }

    init() {
        PubSub.subscribe("rocketCollided", this.handleRocket.bind(this));
        PubSub.subscribe("stopEntity", this.stopEntity.bind(this));
    }

    stopEntity(topic, data) {
        var entities = Object.values(this.relevantEntitiesMap);
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            var pc = entity.components[PositionComponent.prototype.constructor.name];

            var physics = entity.components[PhysicsComponent.prototype.constructor.name];
            physics.setSpeed(0);
        }
    }

    handleRocket(topic, data) {
        var entities = Object.values(this.relevantEntitiesMap);
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            if (data.id == entity.id) {

                //stop everything
                //PubSub.publishSync("stopEntity", {});


                var rc = entity.components[RenderComponent.prototype.constructor.name];
                //rc.setSrc("images/transparent.png");

                var pc = entity.components[PositionComponent.prototype.constructor.name];

                var physics = entity.components[PhysicsComponent.prototype.constructor.name];
                physics.setSpeed(0);

                var pec = entity.components[ParticleEmitterComponent.prototype.constructor.name];
                pec.configure({
                    totalParticles : 150,
                    emissionRate : 75,
                    position : 'over',
                    positionVariance : { x: 0, y: 0 },
                    gravity : { x : 0, y : 0 },
                    angle : 90,
                    angleVariance : 360,
                    speed : 100,
                    speedVariance : 0,
                    life : 2,
                    lifeVariance : 1,
                    radius : 1,
                    radiusVariance : 1,
                    startColor: [255, 0, 0, 1],
                    startColorVariance: [0, 0, 0, 0.1],
                    endColor: [0, 0, 0, 1],
                    texture: "common/images/particle.png"
                });

                pec.reset();

                setTimeout(function() {
                    //remove the entity
                    PubSub.publishSync("gameOver", {});
                }, 3000);
            };
        
        }
    }


	update() {

	}
}

function Asteroid() {

}

function Missile(initialAngle) {
	this.initialAngle = initialAngle || 0;
}

class MissileSystem extends System {
	constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Missile"]);
        super(signature);
    }

    init() {
    	
    }

    handleCollision() {
    	
    }

    update() {
    	var entities = Object.values(this.relevantEntitiesMap);
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            var m = entity.components[Missile.prototype.constructor.name];
            var pc = entity.components[PositionComponent.prototype.constructor.name];

            if (m && m.initialAngle && pc) {
	            pc.x = pc.x + 5 * Math.cos(m.initialAngle * Math.PI / 180);
	            pc.y = pc.y + 5 * Math.sin(m.initialAngle * Math.PI / 180);
	        }

        }
    }
}

class AsteroidSystem extends System {
	constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "PhysicsComponent", "ParticleEmitterComponent", "Asteroid"]);
        super(signature);
    }

    init() {
    	PubSub.subscribe("collision", this.handleCollision.bind(this));
        PubSub.subscribe("stopEntity", this.stopEntity.bind(this));
    }

    stopEntity(topic, data) {
        var entities = Object.values(this.relevantEntitiesMap);
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            var pc = entity.components[PositionComponent.prototype.constructor.name];

            var physics = entity.components[PhysicsComponent.prototype.constructor.name];
            physics.setSpeed(0);
        }
    }

    handleCollision(topic, data) {
    	
    	//if both are asteroid, deflect

    	//if one is asteroid, other is missile, remove
    	if ((data.entity1.name == 'missile' && data.entity2.name == 'asteroid') ||
    		(data.entity1.name == 'asteroid' && data.entity2.name == 'missile')) {
    		this.handleEntity(data.entity1);
        	this.handleEntity(data.entity2);
    	}

    	// if one is asteroid, other is rocket, die
    	if ((data.entity1.name == 'rocket' && data.entity2.name == 'asteroid') ||
    		(data.entity1.name == 'asteroid' && data.entity2.name == 'rocket')) {
            var id;
            if (data.entity1.name == 'rocket') {
                id = data.entity1.id;
            } else {
                id = data.entity2.id;
            }
            PubSub.publishSync("rocketCollided", { id: id });
    		PubSub.unsubscribe("collision");
    	}
    }

    
    handleEntity(entity) {
    	if (this.relevantEntitiesMap[entity.id]) {
    		// increase score
    		incrementScore();

            var rc = entity.components[RenderComponent.prototype.constructor.name];
            //rc.setSrc("images/transparent.png");

    		var pc = entity.components[PositionComponent.prototype.constructor.name];

    		var physics = entity.components[PhysicsComponent.prototype.constructor.name];
    		physics.setSpeed(0);

    		// change particle system to show some effect

			var pec = entity.components[ParticleEmitterComponent.prototype.constructor.name];
			pec.configure({
				totalParticles : 150,
                emissionRate : 150,
                position : 'over',
                positionVariance : { x: 0, y: 0 },
                gravity : { x : 0, y : 0 },
                angle : 90,
                angleVariance : 360,
                speed : 30,
                speedVariance : 0,
                life : 2,
                lifeVariance : 1,
                radius : 1,
                radiusVariance : 1,
                startColor: [255, 0, 0, 1],
                startColorVariance: [0, 0, 0, 0.1],
                endColor: [0, 0, 0, 1],
                texture: "common/images/particle.png"
			});

			pec.reset();

			setTimeout(function() {
				//remove the entity
    			EntityManager.removeEntity(entity);
			}, 3000);
    		

    		//create new one
        }
    }


	update() {
		for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            if (pc.x < 0) {
            	pc.x = canvas.width;
            }
            if (pc.y < 0) {
            	pc.y = canvas.height;
            }
            if (pc.x > canvas.width) {
            	pc.x = 0;
            }
            if (pc.y > canvas.height) {
            	pc.y = 0;
            }
        }
	}

}

class MovementSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "PhysicsComponent", "Rocket"]);       
        super(signature);
    }

    init() {
        this.rotateEntity(-15);
        PubSub.subscribe("keyDown", this.handleKeyDown.bind(this));
    }

    handleKeyDown(topic, data) {
        if (data.key === "up") {
        	//accelerate forward based on current angle
        	this.accelerateEntity();
        }
        else if (data.key === "down") {
        	this.stopEntity();
        }
        else if (data.key === "left") {
            this.rotateEntity(-15);
        }
        else if (data.key === "right") {
            this.rotateEntity(15);
        }
        else if (data.key === "space") {
        	//release fire
        	console.log("release fire");
        	EntityManager.removeEntity(missile);
        	this.createMissile();
        }
    }

    createMissile() {
    	for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var rc = entity.components[RenderComponent.prototype.constructor.name];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            createMissile(rc.rotateAngle - 90, pc.x, pc.y);
        }
    }

    rotateEntity(rotateAngle) {
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var physics = entity.components[PhysicsComponent.prototype.constructor.name];
            physics.setAngle(physics.angle + rotateAngle);
        }
    }

    accelerateEntity() {
    	for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var physics = entity.components[PhysicsComponent.prototype.constructor.name];
            physics.setSpeed(2);
        }
    }

    stopEntity() {
    	for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var physics = entity.components[PhysicsComponent.prototype.constructor.name];
            physics.setSpeed(0);
        }
    }

    update() {
        
    }
}
var missile;
function createMissile(initialAngle, x, y) {
	missile = EntityManager.createEntity("missile");
	missile.addComponent(new PositionComponent(x, y));
	missile.addComponent(new RenderComponent(30, 30, "common/images/fire.png"));
	missile.addComponent(new Collidable(BOUNDING_BOX.CIRCULAR, {radius: 5}, true));
	missile.addComponent(new Missile((initialAngle % 360)));
}


class GameStateSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent([]);       
        super(signature);
    }

    init() {
        PubSub.subscribe("gameOver", this.resetGameState.bind(this));
    }

    resetGameState(topic, data) {
        score = 0;
        persistentStorage.persist("highScore", highScore);
        ScreenManager.switchToScreen("gameover")
    }

    update() {
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
            ScreenManager.switchToScreen("default");
        }
    }
}


/*--------------------------------GAME INITIALIZATION AND LOOP-----------------------------------*/

var persistentStorage = new PersistentStorage();
var skyParticleEmitterSystem, asteroidEmitterSystem, sky, asteroid, asteroids = [], rocket;

function createAsteroidWithRandomParameters() {
    var config = {
        position : { x : Utils.random(0, 700), y : Utils.random(0, 700) },
        physics : {
            speed : Utils.random(2, 5),
            angle : Utils.random(0, 360)
        }
    };

    var asteroidSystemConfig = {
        totalParticles : 30,
        emissionRate : 10,
        position: 'over',
        positionVariance: { x: 10, y: 10},
        angle : 90,
        angleVariance : 360,
        speed : 1,
        speedVariance : 0,
        life : 1,
        lifeVariance : 1,
        radius : 2,
        radiusVariance : 2,
        startColor: [255, 100, 100, 1],
        startColorVariance: [0, 0, 51, 0.1],
        endColor: [0, 0, 0, 1],
        texture: "common/images/particle.png"
    }

    //create asteroid system
    asteroid = EntityManager.createEntity("asteroid");
    asteroid.addComponent(new PositionComponent(config.position.x, config.position.y));
    asteroid.addComponent(new RenderComponent(35, 35, "common/images/asteroid.png"));
    asteroid.addComponent(new ParticleEmitterComponent(asteroidSystemConfig));
    asteroid.addComponent(new PhysicsComponent(config.physics ? config.physics : {}));
    asteroid.addComponent(new Collidable(BOUNDING_BOX.CIRCULAR, {radius: 15}, true));
    asteroid.addComponent(new Asteroid());

}
function initializeEntities() {

	var skySystemConfig = {
		totalParticles : 150,
		emissionRate : 150 / 2,
		position : 'over',
		positionVariance : { x: 400, y: 300 },
		gravity : { x : 0, y : 0 },
		angle : 90,
		angleVariance : 360,
		speed : 20,
		speedVariance : 1,
		life : 10,
		lifeVariance : 1,
		radius : 1,
		radiusVariance : 1
	};

	sky = EntityManager.createEntity("sky");
    sky.addComponent(new PositionComponent(canvas.width / 2, canvas.height / 2));
    sky.addComponent(new RenderComponent(canvas.width, canvas.height, "common/images/transparent.png"));
    sky.addComponent(new ParticleEmitterComponent(skySystemConfig));
    sky.addComponent(new PhysicsComponent({}));
    sky.addComponent(new Sky());


    createAsteroidWithRandomParameters();
    createAsteroidWithRandomParameters();
    createAsteroidWithRandomParameters();
    createAsteroidWithRandomParameters();
    createAsteroidWithRandomParameters();
    createAsteroidWithRandomParameters();
    createAsteroidWithRandomParameters();

    var rocketFireConfig = {
		totalParticles : 40,
		emissionRate : 20,
		position: 'behind',
		positionVariance: { x: 10, y: 0},
		gravity : { x: 0, y: 40 },
		angle : 270,
		angleVariance : 10,
		speed : 2,
		speedVariance : 1,
		life : 2,
		lifeVariance : 1,
		radius : 2,
		radiusVariance : 1,
		startColor: [51, 102, 178.5, 1],
		startColorVariance: [0, 0, 51, 0.1],
		endColor: [0, 0, 0, 1],
		texture: "common/images/particle.png"
	}


    rocket = EntityManager.createEntity("rocket");
    rocket.addComponent(new PositionComponent(300, 200));
    rocket.addComponent(new RenderComponent(50, 50, "common/images/rocket.png"));
    rocket.addComponent(new ParticleEmitterComponent(rocketFireConfig));
    rocket.addComponent(new PhysicsComponent({}));
    rocket.addComponent(new Collidable(BOUNDING_BOX.CIRCULAR, {radius: 25}, true));
    rocket.addComponent(new Rocket());

	//create missile
	createMissile();

}

function init() {
    //define components
    ComponentManager.initialize(["Rocket", "Asteroid", "Missile"]);
    initializeEntities();

    var rs = new RenderSystem();
    
    SystemManager.addSystem(rs);
    rs.addAfterRenderCallback(renderScore);
    SystemManager.addSystem(new RocketSystem());
    SystemManager.addSystem(new AsteroidSystem());
    SystemManager.addSystem(new MissileSystem());
    SystemManager.addSystem(new ParticleSystem());
    SystemManager.addSystem(new MovementSystem());
    SystemManager.addSystem(new InputSystem());
    SystemManager.addSystem(new CollisionSystem());
    SystemManager.addSystem(new PhysicsSystem());
    SystemManager.addSystem(new GameStateSystem());

    /*-----Game Over state-------*/
    var gameOverRender = new RenderSystem();
    gameOverRender.addAfterRenderCallback(renderGameOverScreen);
    SystemManager.addSystem(gameOverRender, "gameover");
    SystemManager.addSystem(new RestartSystem(rocket), "gameover");

    //initializeHUDVars();
    startGameLoop(30);
}

init();

var score = 0;
highScore = persistentStorage.get("highScore") ? persistentStorage.get("highScore") : 0;

function renderGameOverScreen() {
    context.font = "40px Arial";
    context.fillStyle = "white";
    context.fillText("Game Over! Press Space to continue", 100, 300);
}

function renderScore() {
    context.font = "20px Arial";
    context.fillStyle = "white";
    context.fillText("Score: " + score + " | High Score: " + highScore, 0, 15);
}

function incrementScore() {
    score++;
    if (score > highScore) {
        highScore = score;
    }
}