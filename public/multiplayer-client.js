class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.bulletGroup = null;
        this.player = null;
        this.otherPlayers = {};
    }

    preload() {
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image("background", "assets/background.jpg");
        this.load.image("wall", "assets/wall.png");
    }

    create() {
        this.add.image(400, 300, "background").setDisplaySize(800, 600); 

        // Initialize bullet group
        this.bulletGroup = new BulletGroup(this);
        this.addEvents();

        // Create player
        this.player = this.add.rectangle(400, 300, 50, 50, 0x00ff00);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);

        // Wall creation
        this.walls = this.physics.add.staticGroup();
        this.walls.create(200, 300, 'wall').setOrigin(0.5, 0.5).setDisplaySize(200, 20).refreshBody();
        this.walls.create(300, 400, 'wall').setOrigin(0.5, 0.5).setDisplaySize(20, 200).refreshBody();

        // Set up cursor keys for movement
        this.cursors = this.input.keyboard.createCursorKeys();

        // Set up physics
        this.physics.add.collider(this.player, this.walls);

        // Collision between obstacles and bullets
        this.physics.add.collider(this.walls, this.bulletGroup, (object1, object2) => {
            if (object2.state !== 1) {
                object2.setActive(false);
                object2.setVisible(false);
            }
        });

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
            } else if (data.type === 'bullet' && data.id !== socket.id) {
                const bullet = this.bulletGroup.getFirstDead(false);
                if (bullet) {
                    bullet.fire({ x: data.startX, y: data.startY }, data.targetX, data.targetY, data.state);
                } else {
                    console.error('No available bullet to fire');
                }
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

    shootBullet(pointer, bulletState) {
        const bullet = this.bulletGroup.fireBullet(this.player, pointer.x, pointer.y, bulletState);
    
        const bulletData = {
            type: 'bullet',
            id: this.socket.id,
            startX: this.player.x,
            startY: this.player.y,
            targetX: pointer.x,
            targetY: pointer.y,
            state: bulletState
        };
        this.socket.send(JSON.stringify(bulletData));
    }
        
    // Mouse click event for shooting
    addEvents() {
        this.input.on('pointerdown', pointer => {
            let bulletState = 3;
            this.shootBullet(pointer, bulletState);
        });
    }

    update() {
        let moved = false;

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
