// var p1 = new Peer('a123',{key: '0sx1o0iq3dcayvi'});
var p2 = new Peer('host',{key: '0sx1o0iq3dcayvi'});

// p1.on('open', function(id) {
//    console.log('connected to server');
//     	var c = p1.connect('b123');
//         c.on('open', function(data) {    
//             console.log('connected to peer');
//             c.send('connection working');
//         });    
// });

var c;

p2.on('connection', function(connection) {
	  c = connection;
      connection.on('data', function(data) {
          console.log('Connected with ' + data);
      });
});

window.addEventListener("mousedown", sendSomething);

function sendSomething() {
	c.send("Hi");
}