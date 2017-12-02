# Fowl Game Engine

Fowl is a pure Javascript based Game Engine. It follows ECS architectural pattern.
What this means is that Entities do not contain any additional information other than an identifier. The Components hold only data while the logic is written in the Systems.
Attaching and detaching different components will uniquely determine the bitset signature for an entity. It is this bitset signature that very efficiently (because of bitset calculations) identifies the relevant entities to be processed for a system. Each system specifies the components it is interested in. At each game update loop, the engine cycles through these systems and runs their logic against their relevant entities.

## See it in action

[Sample games](https://fowl.herokuapp.com/#gallery)

## Check out the documentation

[Documentation](https://fowl.herokuapp.com/documentation)

## Visit website

[Website](https://fowl.herokuapp.com)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.
```
Fork / clone this repo.
Check Prerequisites section for required softwares to run this project.
npm install
You can start the server using 'node server'
```
You are done. Hit http://localhost:3000/#gallery to start playing games

### Prerequisites

What things you need to install:

```
If you have not installed NodeJS yet, make sure you install it before you could start anything else.
```
* [NodeJS](https://nodejs.org)

### Games

#### Alchemy:

The rules are fire + water = steam, steam + air = cloud, earth + air = dust
Adding new rules is extremely easy: adding to the json var in the CombiningSystem

#### Snake:

Each food adds 3 segments to the snake
Each food rots in 10 seconds after generation(rotten food is shown by concentric squares)
Rotten food shrinks 3 segments and also decreases the score

#### Asteroids:

Arrow keys to move, space to fire
Every 5 asteroid hits takes you to the next level
Large(green) asteroids break into medium ones; medium(purple) asteroids break into smaller ones

#### Multiplayer Snake:

2 snakes: Green and Pink
Control Green by Arrow Keys, Pink by WASD
Both players try to beat the high score, a snake wins if the other snake goes out of bounds or collides with anyone's body

#### Aliens & Astronauts:

Click the mouse to move to any adjacent square
Click yourself to not move
Astronauts die when an alien lands on its square
Aliens win when all astronauts are dead
Astronauts win when the turn becomes 20

## Built With

* Javascript
* [NodeJS](https://nodejs.org) - Server
* [PubSub](https://github.com/mroderick/PubSubJS) - PubSubJS(for Publish/Subscribe)

## Authors

* **Owais Iqbal** - *omiqbal@ncsu.edu* - [GitHub](https://github.com/owaisiqbal91)
* **Kumar Nielarshi** - *knielar@ncsu.edu* - [GitHub](https://github.com/nielarshi)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
