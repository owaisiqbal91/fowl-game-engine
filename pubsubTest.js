// create a function to subscribe to topics
/*var mySubscriber = function (msg, data1, data2) {
    console.log(data1);
    console.log(data2);
};

var token = PubSub.subscribe('MY TOPIC', mySubscriber);*/



class Something {

    constructor() {
        this.entities = {1: "1", 2: "2"};
        PubSub.subscribe("MY TOPIC", this.update.bind(this))
    }

    update(msg, data) {
        console.log(this.entities);
    }
}

var s = new Something();
PubSub.publish('MY TOPIC', 1);