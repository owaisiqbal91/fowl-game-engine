// create a function to subscribe to topics
var mySubscriber = function( data ){
    console.log( data );
};

var token = PubSub.subscribe( 'MY TOPIC', mySubscriber );

PubSub.publish( 'MY TOPIC', {"a" : 1} );