Team:
omiqbal@ncsu.edu
knielar@ncsu.edu


To Run project :


install node

run below commands:

npm install
node server


go to:

localhost:3000/gallery


Multiplayer-snake:
Currently 2 players can over network
1st player to start game will be host and other player user

Alchemy:
The rules are fire + water = steam, steam + air = cloud, earth + air = dust
Adding new rules is extremely easy: adding to the json var in the CombiningSystem

Snake:
Each food adds 3 segments to the snake
Each food rots in 10 seconds after generation(rotten food is shown by concentric squares)
Rotten food shrinks 3 segments and also decreases the score

Asteroids:
Arrow keys to move, space to fire
Every 5 asteroid hits takes you to the next level
Large(green) asteroids break into medium ones; medium(purple) asteroids break into smaller ones

Multiplayer Snake:
2 snakes: Green and Pink
Control Green by Arrow Keys, Pink by WASD
Both players try to beat the high score, a snake wins if the other snake goes out of bounds or collides with anyone's body

Aliens & Astronauts:
Click the mouse to move to any adjacent square
Click yourself to not move
Astronauts die when an alien lands on its square
Aliens win when all astronauts are dead
Astronauts win when the turn becomes 20

External libraries used:
PubSubJS(for Publish/Subscribe): https://github.com/mroderick/PubSubJS

