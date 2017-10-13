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
    		PubSub.publishSync("gameOver", {});
    	}
    }

    handleEntity(entity) {
    	if (this.relevantEntitiesMap[entity.id]) {
    		// increase score
    		incrementScore();

    		var pc = entity.components[PositionComponent.prototype.constructor.name];

    		var physics = entity.components[PhysicsComponent.prototype.constructor.name];
    		physics.setSpeed(0);

    		// change particle system to show some effect

			var pec = entity.components[ParticleEmitterComponent.prototype.constructor.name];
			pec.configure({
				totalParticles : 25,
				emissionRate : 25 / 3,
				position : { x: pc.x, y: pc.y },
				positionVariance : { x: 10, y: 10 },
				gravity : { x : 0, y : 0 },
				angle : 90,
				angleVariance : 360,
				speed : 50,
				speedVariance : 1,
				life : 3,
				lifeVariance : 1,
				radius : 10,
				radiusVariance : 10
			});

			pec.reset();

			setTimeout(function() {
				//remove the entity
    			EntityManager.removeEntity(entity);
			}, 1000);
    		

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
        this.currentDirection = this.left;
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
            this.rotateEntity(-10);
        }
        else if (data.key === "right") {
            this.rotateEntity(10);
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
            physics.setSpeed(1);
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
	missile.addComponent(new RenderComponent(30, 30, "images/fire.png"));
	missile.addComponent(new Collidable());
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
    }

    update() {
    }
}


/*--------------------------------GAME INITIALIZATION AND LOOP-----------------------------------*/

var persistentStorage = new PersistentStorage();
var skyParticleEmitterSystem, asteroidEmitterSystem, sky, asteroid, asteroids = [], rocket;

function initializeEntities() {

	var skySystemConfig = {
		totalParticles : 100,
		emissionRate : 150 / 2,
		position : { x : 400, y : 300 },
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
    sky.addComponent(new RenderComponent(canvas.width, canvas.height, "images/transparent.png"));
    sky.addComponent(new ParticleEmitterComponent(skySystemConfig));
    sky.addComponent(new PhysicsComponent({}));
    sky.addComponent(new Sky());


    var asteroidConfigs = [
    	{
    		position : { x : 0, y : 0 },
    		physics : {
    			speed : 2,
    			angle : 315
    		}
    	},
    	{
			position : { x : 600, y : 600 },
			physics : {
    			speed : 1,
    			angle : 50
    		}
    	},
    	{
    		position : { x : 200, y : 0 },
    		physics : {
    			speed : 1.5,
    			angle : 300
    		}
    	},
    	{
    		position : { x : 500, y : 600 },
    		physics : {
    			speed : 1,
    			angle : 70
    		}
    	},
    	{
    		position : { x : 100, y : 500 },
    		physics : {
    			speed : 2,
    			angle : 60
    		}
    	},
    	{
    		position : { x : 600, y : 500 },
    		physics : {
    			speed : 1,
    			angle : 110
    		}
    	},
    	{
    		position : { x : 800, y : 100 },
    		physics : {
    			speed : 1.5,
    			angle : 190
    		}
    	}
    ]

    asteroidConfigs.forEach(function(asteroidConfig) {
		var asteroidSystemConfig = {
			totalParticles : 50,
			emissionRate : 25,
			position: 'over',
			positionVariance: { x: 10, y: 10},
			angle : 90,
			angleVariance : 360,
			speed : 2,
			speedVariance : 0,
			life : 1,
			lifeVariance : 1,
			radius : 50,
			radiusVariance : 2,
			startColor: [255, 100, 100, 1],
			startColorVariance: [0, 0, 51, 0.1],
			endColor: [0, 0, 0, 1],
			texture: "images/particle.png"
		}

		//create asteroid system
		asteroid = EntityManager.createEntity("asteroid");
		asteroid.addComponent(new PositionComponent(asteroidConfig.position.x, asteroidConfig.position.y));
		asteroid.addComponent(new RenderComponent(50, 50, "images/asteroid.png"));
		asteroid.addComponent(new ParticleEmitterComponent(asteroidSystemConfig));
		asteroid.addComponent(new PhysicsComponent(asteroidConfig.physics ? asteroidConfig.physics : {}));
		asteroid.addComponent(new Collidable());
    	asteroid.addComponent(new Asteroid());

	    
    });
    
    var rocketFireConfig = {
		totalParticles : 100,
		emissionRate : 20,
		position: 'behind',
		positionVariance: { x: 10, y: 0},
		gravity : { x: 0, y: 40 },
		angle : 270,
		angleVariance : 10,
		speed : 10,
		speedVariance : 5,
		life : 2,
		lifeVariance : 0,
		radius : 5,
		radiusVariance : 5,
		startColor: [51, 102, 178.5, 1],
		startColorVariance: [0, 0, 51, 0.1],
		endColor: [0, 0, 0, 1],
		texture: "images/particle.png"
	}


    rocket = EntityManager.createEntity("rocket");
    rocket.addComponent(new PositionComponent(300, 200));
    rocket.addComponent(new RenderComponent(50, 50, "images/rocket.png"));
    rocket.addComponent(new ParticleEmitterComponent(rocketFireConfig));
    rocket.addComponent(new PhysicsComponent({}));
    rocket.addComponent(new Collidable());
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
}

init();
function game_loop() {
    for (var i = 0; i < SystemManager.systems.length; i++) {
        SystemManager.systems[i].update();
    }
    EntityManager.sweepRemovalOfComponents();
}

var score = 0;
highScore = persistentStorage.get("highScore") ? persistentStorage.get("highScore") : 0;

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

setInterval(game_loop, 30);