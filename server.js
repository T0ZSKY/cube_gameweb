const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

let players = {};
let food = [];

const canvasWidth = 1000; // Ajuster la largeur du canvas
const canvasHeight = 800; // Ajuster la hauteur du canvas

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function generateFood(initial = false) {
    const foodItem = {
        x: Math.random() * (canvasWidth - 10),
        y: Math.random() * (canvasHeight - 10),
        size: 10,
        color: `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`
    };
    food.push(foodItem);
    if (!initial) {
        console.log('New food generated at:', foodItem);
    }
}

// Generate initial food
for (let i = 0; i < 50; i++) {
    generateFood(true);
}

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    socket.on('newPlayer', () => {
        const playerData = {
            id: socket.id,
            x: Math.random() * (canvasWidth - 20),
            y: Math.random() * (canvasHeight - 20),
            size: 10,
            color: getRandomColor()
        };
        players[socket.id] = playerData;
        io.emit('state', { players, food });
    });

    socket.on('move', (playerData) => {
        if (players[socket.id]) {
            players[socket.id].x = playerData.x;
            players[socket.id].y = playerData.y;
            players[socket.id].size = playerData.size;
            players[socket.id].color = playerData.color;

            // Check for collisions with food
            const sizeIncrease = 2; // Fixed size increase for each food
            const foodCollisions = food.filter(f => {
                if (
                    playerData.x <f.x + f.size &&
                    playerData.x + playerData.size > f.x &&
                    playerData.y < f.y + f.size &&
                    playerData.y + playerData.size > f.y
                ) {
                    players[socket.id].size += sizeIncrease;
                    generateFood(); // Generate new food when eaten
                    return true;
                }
                return false;
            });

            // Remove collided food
            food = food.filter(f => !foodCollisions.includes(f));

            // Prevent players from going out of bounds
            if (players[socket.id].x < 0) players[socket.id].x = 0;
            if (players[socket.id].x > canvasWidth - playerData.size) players[socket.id].x = canvasWidth - playerData.size;
            if (players[socket.id].y < 0) players[socket.id].y = 0;
            if (players[socket.id].y > canvasHeight - playerData.size) players[socket.id].y = canvasHeight - playerData.size;

            // Check for collisions with other players
            for (let id in players) {
                if (id !== socket.id) {
                    let p= players[id];
                    if (
                        playerData.x < p.x + p.size &&
                        playerData.x + playerData.size > p.x &&
                        playerData.y < p.y + p.size &&
                        playerData.y + playerData.size > p.y
                    ) {
                        if (playerData.size > p.size) {
                            // Eat the other player if it's smaller
                            players[socket.id].size += sizeIncrease;
                            players[id].size = Math.max(p.size - sizeIncrease, 0); // Prevent negative sizes
                            generateFood(); // Generate new food when eaten
                        } else {
                            // Lose size if not bigger
                            players[socket.id].size = Math.max(playerData.size - sizeIncrease, 0); // Prevent negative sizes
                        }
                    }
                }
            }

            // Vérifier si un joueur a gagné
            if (checkWinCondition(players)) {
                const winnerId = Object.keys(players).find((id) => players[id].size === canvasWidth * canvasHeight);
                io.emit('gameOver', winnerId);
            }

            io.emit('state', { players, food });
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('state', { players, food });
        console.log('Client disconnected', socket.id);
    });
});

function checkWinCondition(players) {
  for (let id in players) {
    if (players[id].size >= canvasWidth * canvasHeight) {
      return true;
    }
  }
  return false;
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});