const socket = io();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1000; // Ajuster la largeur du canvas
canvas.height = 800; // Ajuster la hauteur du canvas

let player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, color: getRandomColor() };
let players = {};
let food = [];

let playerDirection = { x: 0, y: 0 };

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw food
    food.forEach(f => {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size / 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw players
    for (let id in players) {
        let p = players[id];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x + p.size / 2, p.y + p.size / 2, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    updatePlayerPosition();
    requestAnimationFrame(draw);
}

function updatePlayerPosition() {
    const speed = 5;
    player.x += playerDirection.x * speed;
    player.y += playerDirection.y * speed;

    // Empêcher le personnage de sortir du canvas
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.size) player.x = canvas.width - player.size;
    if (player.y < 0) player.y = 0;
    if (player.y > canvas.height - player.size) player.y = canvas.height - player.size;

    socket.emit('move', player);
}

document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    playerDirection = {
        x: Math.cos(angle),
        y: Math.sin(angle)
    };
});

socket.on('state', (gameState) => {
    players = gameState.players;
    food = gameState.food;

    // Update local player size if it has changed on the server
    if (players[socket.id]) {
        player.size = players[socket.id].size;
        player.color = players[socket.id].color;
    }
});

socket.on('gameOver', (winnerId) => {
    if (winnerId === socket.id) {
        alert('Bravo, partie gagnée !');
    } else {
        alert('Perdu, meilleure chance next time !');
    }
    player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, color: getRandomColor() };
    socket.emit('newPlayer', player);
});

socket.emit('newPlayer', player);
draw();