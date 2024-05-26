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

function generateFood() {
    for (let i = 0; i < 50; i++) {
        food.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            size: 10
        });
    }
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function generateNewFood() {
    food.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        size: 10
    });
}

generateFood();

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    socket.on('newPlayer', (playerData) => {
        playerData.color = getRandomColor();
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
            food = food.filter(f => {
                if (
                    playerData.x < f.x + f.size &&
                    playerData.x + playerData.size > f.x &&
                    playerData.y < f.y + f.size &&
                    playerData.y + playerData.size > f.y
                ) {
                    players[socket.id].size += sizeIncrease;
                    generateNewFood(); // Generate new food when eaten
                    return false;
                }
                return true;
            });

            // Prevent players from going out of bounds
            if (players[socket.id].x < 0) players[socket.id].x = 0;
            if (players[socket.id].x > canvasWidth - playerData.size) players[socket.id].x = canvasWidth - playerData.size;
            if (players[socket.id].y < 0) players[socket.id].y = 0;
            if (players[socket.id].y > canvasHeight - playerData.size) players[socket.id].y = canvasHeight - playerData.size;

            // Check for collisions with other players
            for (let id in players) {
                if (id !== socket.id) {
                    let p = players[id];
                    if (
                        playerData.x < p.x + p.size &&
                        playerData.x + playerData.size > p.x &&
                        playerData.y < p.y + p.size &&
                        playerData.y + playerData.size > p.y
                    ) {
                        if (players[socket.id].size > p.size) {
                            players[socket.id].size += p.size; // Optional: can change how size increases after eating another player
                            delete players[id];
                            io.to(id).emit('gameOver');
                        } else {
                            delete players[socket.id];
                            socket.emit('gameOver');
                        }
                    }
                }
            }

            io.emit('state', { players, food });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
        delete players[socket.id];
        io.emit('state', { players, food });
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
