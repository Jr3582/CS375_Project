class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.bulletGroup = null;
        this.player = null;
        this.otherPlayers = {};
    }

    preload() {
        // Load any assets if needed, e.g., bullet image
       this.load.image('bullet', 'assets/bullet.png');
       this.load.image("background", "assets/background.jpg");
    }

    create() {
        console.log('Creating player');
        this.add.image(400, 300, "background").setDisplaySize(800, 600); 

        // Initialize bullet group
        this.bulletGroup = new BulletGroup(this);

        // Create player
        this.player = this.add.rectangle(400, 300, 50, 50, 0x00ff00);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);

        // Set up cursor keys for movement
        this.cursors = this.input.keyboard.createCursorKeys();

        // Setup WebSocket connection and event listeners
        this.setupWebSocket();
    }

    setupWebSocket() {
        const socket = new WebSocket(`ws://localhost:3000?lobby=${window.lobbyCode}`);

        socket.onmessage = async (event) => {
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
                    if (!this.otherPlayers[data.id]) {
                        const otherPlayer = this.add.rectangle(data.x, data.y, 50, 50, 0xff0000);
                        this.physics.add.existing(otherPlayer);
                        this.otherPlayers[data.id] = otherPlayer;
                    } else {
                        this.otherPlayers[data.id].setPosition(data.x, data.y);
                    }
                }
            }
        };

        socket.onopen = () => {
            console.log(`Connected to WebSocket server in lobby ${window.lobbyCode}`);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.socket = socket;
    }

    update() {
        let moved = false;

        // Handle player movement
        this.player.body.setVelocity(0);
        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-160);
            moved = true;
        } else if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(160);
            moved = true;
        }
        if (this.cursors.up.isDown) {
            this.player.body.setVelocityY(-160);
            moved = true;
        } else if (this.cursors.down.isDown) {
            this.player.body.setVelocityY(160);
            moved = true;
        }

        // Handle shooting on mouse click
        if (this.input.activePointer.isDown) {
            const pointerX = this.input.activePointer.worldX;
            const pointerY = this.input.activePointer.worldY;
            this.bulletGroup.fireBullet(this.player, pointerX, pointerY, 1); // Use bulletState 0 for normal bullets
            console.log("Bullet fired at position: ", pointerX, pointerY);
        }

        if (moved) {
            const data = { id: this.socket.id, x: this.player.x, y: this.player.y };
            this.socket.send(JSON.stringify(data));
        }
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

// Initialize the game
const game = new Phaser.Game(config);
