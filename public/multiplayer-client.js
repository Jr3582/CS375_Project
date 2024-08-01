function preload() {}

function create() {
    console.log('Creating player');
    // Creating a square as the player for now
    player = this.add.graphics();
    player.fillStyle(0x00ff00, 1.0); // Green color for own player
    player.fillRect(0, 0, 50, 50);
    player.setPosition(400, 300);

    cursors = this.input.keyboard.createCursorKeys();

    socket.onmessage = async(event) => {
        let message;
        if (typeof event.data === 'string') {
            message = event.data;
        } else {
            message = await event.data.text();
        }
        const data = JSON.parse(message);

        if (data.type === 'init') {
            socket.id = data.id;
            console.log(`Assigned ID: ${socket.id}`);
        } else {
            if (data.id !== socket.id) {
                if (!otherPlayers[data.id]) {
                    const otherPlayer = this.add.graphics();
                    otherPlayer.fillStyle(0xff0000, 1.0); // Red color for other players
                    otherPlayer.fillRect(0, 0, 50, 50);
                    otherPlayer.setPosition(data.x, data.y);
                    otherPlayers[data.id] = otherPlayer;
                } else {
                    otherPlayers[data.id].setPosition(data.x, data.y);
                }
            }
        }
    };

    console.log('Player created:', player);
}

function update() {
    let moved = false;
    if (cursors.left.isDown && player.x > 0) {
        player.x -= 3;
        moved = true;
    } else if (cursors.right.isDown && this.game.config.width > player.x + 50) {
        player.x += 3;
        moved = true;
    }
    if (cursors.up.isDown && player.y > 0) {
        player.y -= 3;
        moved = true;
    } else if (cursors.down.isDown && this.game.config.height > player.y + 50) {
        player.y += 3;
        moved = true;
    }

    if (moved) {
        const data = { id: socket.id, x: player.x, y: player.y };
        socket.send(JSON.stringify(data));
    }
}

const config = window.gameConfig;

if (config.type === "Phaser.AUTO") {
    config.type = Phaser.AUTO;
}

config.scene.preload = preload;
config.scene.create = create;
config.scene.update = update;

const game = new Phaser.Game(config);

let cursors;
let player;
let otherPlayers = {};

const socket = new WebSocket('ws://localhost:3000');

socket.onopen = () => {
    console.log('Connected to WebSocket server');
};
socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};