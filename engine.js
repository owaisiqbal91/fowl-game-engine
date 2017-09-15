var components = [
    "PositionComponent",
    "RenderComponent",
    "Draggable",
    "Dragged",
    "Fixed"
];
//calculate signatures for all components
var componentSignatureMap = {};
for (var i = 0; i < components.length; i++) {
    var bitsToShift = components.length - 1 - i;
    componentSignatureMap[components[i]] = 0b1 << bitsToShift;
}

function Entity(id) {
    this.id = id;
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
EntityManager.createEntity = function () {
    EntityManager.currentId += 1;
    var entity = new Entity(EntityManager.currentId)
    EntityManager.entities[EntityManager.currentId] = entity;
    return entity;
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
/*EntityManager.removeComponent = function (entity, component) {
    var componentName = component.constructor.name;
    var componentSignature = componentSignatureMap[componentName];
    delete entity.components[componentName];
    entity.signature = entity.signature ^ componentSignature;

    SystemManager.checkEntityForRemoval(entity);
}*/

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