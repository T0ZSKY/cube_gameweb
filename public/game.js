const socket = io();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1000; // Ajuster la largeur du canvas
canvas.height = 800; // Ajuster la hauteur du canvas

let player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, color: getRandomColor() };
let players = {};
let food = [];

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
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size / 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw players
    for (let id in players) {
        let p = players[id];
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    requestAnimationFrame(draw);
}

function updatePlayerPosition(e) {
    const speed = 5;
    if (e.key === 'ArrowUp' && player.y > 0) player.y -= speed; // Empêcher de sortir en haut
    if (e.key === 'ArrowDown' && player.y < canvas.height - player.size) player.y += speed; // Empêcher de sortir en bas
    if (e.key === 'ArrowLeft' && player.x > 0) player.x -= speed; // Empêcher de sortir à gauche
    if (e.key === 'ArrowRight' && player.x < canvas.width - player.size) player.x += speed; // Empêcher de sortir à droite
    socket.emit('move', player);
}

socket.on('state', (gameState) => {
    players = gameState.players;
    food = gameState.food;

    // Update local player size if it has changed on the server
    if (players[socket.id]) {
        player.size = players[socket.id].size;
        player.color = players[socket.id].color;
    }
});

socket.on('gameOver', () => {
    alert('Game Over! You have been eaten.');
    player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, color: getRandomColor() };
    socket.emit('newPlayer', player);
});

window.addEventListener('keydown', updatePlayerPosition);

socket.emit('newPlayer', player);
draw();
