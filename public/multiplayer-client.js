class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.bulletGroup = null;
        this.player = null;
        this.otherPlayers = {};
        this.ammoTypeText = null;
        this.ammoCountText = null;
        this.healthText = null;
        this.wallsLayer = null;
        this.groundLayer = null;
        this.tileset = null;
        this.alive = true; 
        this.timerText = null;
        this.gameOverText = null;
        this.playerStatuses = {};

        this.map = null;

        this.vision = null;
        this.rt = null;
    }

    preload() {
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image('mask', 'assets/mask.png');
        this.load.image('player', 'assets/Player.png');
        this.load.image('enemy', 'assets/Enemy.png');

        // Tile map setup
        this.load.spritesheet('tiles', 'assets/tileSet.png', { frameWidth: 32, frameHeight: 32 });
        this.load.tilemapTiledJSON('map', 'assets/tilemap.json');
    }

    create() {
        // Create player
        this.player = this.add.sprite(400, 300, 'player');
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.setData('ammo', 25);
        this.player.setData('maxAmmo', 50);
        this.player.setData('bulletState', 0);
        this.player.setData('lastFireTime', 0);
        this.player.setData('fireRate', 250);
        this.player.setData('health', 3);
        this.player.setData('points', 0);

        this.alive = true;  

        // Tile map setup
        this.map = this.make.tilemap({ key: 'map' });
        this.tileset = this.map.addTilesetImage('tileset', 'tiles');

        this.groundLayer = this.map.createLayer('Floor Layer', this.tileset, 0, 0);
        this.groundLayer.setDepth(0);

        var rtLayer = this.groundLayer;
        console.log(rtLayer);

        this.wallsLayer = this.map.createLayer('Object Layer', this.tileset, 0, 0);
        this.wallsLayer.setDepth(2);

        this.player.setDepth(1);

        const width = this.scale.width * 2;
        const height = this.scale.height * 2;

        this.rt = this.make.renderTexture({
            width,
            height
        }, true);

        this.rt.fill(0x000000, 1);
        this.rt.draw(rtLayer, width/2, height/2);
        
        this.rt.setTint(0x223e5a);

        this.vision = this.make.image({
            x: this.player.x,
            y: this.player.y,
            key: 'mask',
            add: false
        });
        this.vision.scale = 1;

        this.rt.mask = new Phaser.Display.Masks.BitmapMask(this, this.vision);
        this.rt.mask.invertAlpha = true;
        this.rt.setDepth(3)


        // Set collision for the walls layer
        this.wallsLayer.setCollisionByExclusion([-1]);

        // Initialize bullet group
        this.bulletGroup = new BulletGroup(this);
        this.bulletGroup.children.iterate((bullet) => {
            bullet.setBodySize(bullet.width * 0.2, bullet.height * 0.2, true); 
        });
        this.addEvents();

        // Setup UI elements
        this.healthText = this.add.text(1025, 550, 'Health:' + this.player.getData('health'), { color: 'white', fontSize: '30px '});
        this.ammoTypeText = this.add.text(1025, 580, 'Ammo Type:' + (this.player.getData('bulletState') + 1).toString(), { color: 'white', fontSize: '30px ', fontWeight: 'bold'});
        this.ammoCountText = this.add.text(1025, 610, 'Ammo Count:' + Math.trunc(this.player.getData('ammo')), { color: 'white', fontSize: '30px ', fontWeight: 'bold'});
        this.ammoTypeText.setDepth(4);
        this.ammoCountText.setDepth(4);
        this.healthText.setDepth(4);

        // Wall creation
        this.walls = this.physics.add.staticGroup();

        // Set up WASD keys for movement
        this.cursors = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };


        // Set up physics
        this.physics.add.collider(this.player, this.wallsLayer);  
        this.physics.add.collider(this.bulletGroup, this.wallsLayer, (bullet, wall) => {
            if (bullet.state !== 1) {
                bullet.setActive(false);
                bullet.setVisible(false);
            }
        });

        // Add collision detection between players and bullets
        this.physics.add.overlap(this.player, this.bulletGroup, this.playerHit, null, this);

        // Setup WebSocket connection and event listeners
        this.setupWebSocket();
    }
    
    endGame() {
        // Find the player with the most points
        let winner = null;
        let maxPoints = -1;
        Object.keys(players).forEach(playerId => {
            if (players[playerId].points > maxPoints) {
                maxPoints = players[playerId].points;
                winner = playerId;
            }
        });
        
        // Broadcast the game-over message and the winner
        broadcast({
            type: 'game_over',
            winner: winner,
            points: maxPoints
        });

        // Reset the lobby or allow a replay
        lobbies[lobby].playerStatuses = {};
    }

    respawnPlayer() {
        if (this.player) {
            this.player.destroy();
        }
    
        // Recreate the player
        this.player = this.add.sprite(400, 300, 'player')
        this.physics.add.existing(this.player);
    
        // Reinitialize the player's physics body properties
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setImmovable(false); 
        this.player.body.setVelocity(0, 0); 
        this.player.body.setBounce(0); 
    
        // Reset player data
        this.player.setData('ammo', 25);
        this.player.setData('maxAmmo', 50);
        this.player.setData('bulletState', 0);
        this.player.setData('lastFireTime', 0);
        this.player.setData('fireRate', 250);
        this.player.setData('health', 3);
        this.player.setData('points', 0);
        this.alive = true;
    
        // Reapply collision with wallsLayer
        this.physics.add.collider(this.player, this.wallsLayer);
    
        // Force physics update to ensure collision is recognized
        this.physics.world.collide(this.player, this.wallsLayer);

        // Update UI
        this.healthText.setText('Health:' + this.player.getData('health'));
        this.ammoCountText.setText('Ammo Count:' + Math.trunc(this.player.getData('ammo')));
        this.ammoTypeText.setText('Ammo Type:' + (this.player.getData('bulletState') + 1).toString());

        const respawnData = {
            type: 'respawn',
            id: this.socket.id, // player's ID
            x: this.player.x,    // new position
            y: this.player.y
        };
        this.socket.send(JSON.stringify(respawnData));
        this.physics.add.overlap(this.player, this.bulletGroup, this.playerHit, null, this);
    }

    

    playerHit(player, bullet) {
        if (bullet.active && bullet.visible && this.alive && bullet.getData('player') !== this.socket.id) {
            const killerId = bullet.getData('player');  // The ID of the player who shot the bullet
            const otherPlayer = this.otherPlayers[killerId];

            if (otherPlayer) {
                player.setData('health', player.getData('health') - 1);
                bullet.setActive(false);
                bullet.setVisible(false);

                if (player.getData('health') < 1) {
                    this.otherPlayers[bullet.getData('player')].setData('points', this.player.getData('points')+3);
                    console.log('Player hit by bullet!');
                    player.setData('points', player.getData('points')-1);
                    player.destroy();
                    this.alive = false;

                    const deathData = {
                        type: 'death',
                        id: this.socket.id,
                        killerId: killerId
                    };
                    this.socket.send(JSON.stringify(deathData));

                    setTimeout(() => {
                        this.respawnPlayer();
                    }, 5000);
                }
            } else {
                console.log('Attempted to interact with an undefined player.');
            }
        }
    }

    setupWebSocket() {
        //Uncomment the below line when you push the changes, comment it out when you are testing locally
        // const socket = new WebSocket(`wss://${window.location.host.replace("https://", "")}?lobby=${window.lobbyCode}`);

        //Uncomment the below line when you are testing locally, comment it out when you push the changes
        const socket = new WebSocket(`ws://localhost:3000?lobby=${window.lobbyCode}`);

        socket.onmessage = async (event) => {
            let message;
            if (typeof event.data === 'string') {
                message = event.data;
            } else {
                message = await event.data.text();
            }
            const data = JSON.parse(message);

            if (data.type === 'game_over') {
                console.log('Received game over data:', data.playerKillCounts);
                localStorage.setItem('playerKillCounts', JSON.stringify(data.playerKillCounts)); 
                
            } else if (data.type === 'navigate') {
                window.location.href = data.url;

            } else if (data.type === 'init') {
                socket.id = data.id;
                console.log(`Assigned ID: ${socket.id}`);

                // Update the player ID on the gameboard
                document.getElementById('playerId').innerText = `Player ID: ${socket.id}`;

                // Send the initial position to the server
                const initData = {
                    type: 'position',
                    id: socket.id,
                    x: this.player.x,
                    y: this.player.y
                };
                socket.send(JSON.stringify(initData));

                // Request positions of all other players
                const requestData = {
                    type: 'request_positions'
                };
                socket.send(JSON.stringify(requestData));

            } else if (data.type === 'position') {

                // Handle position data for new or existing players
                if (data.id !== socket.id) {   
                    if (!this.otherPlayers[data.id]) {
                        // Create new player at the specified position
                        const otherPlayer = this.add.sprite(400, 300, 'enemy');
                        this.physics.add.existing(otherPlayer);
                        this.otherPlayers[data.id] = otherPlayer;
                    } else {
                        // Update existing player position
                        this.otherPlayers[data.id].setPosition(data.x, data.y);
                    }
                }
            } else if (data.type === 'bullet' && data.id !== socket.id) {
                const bullet = this.bulletGroup.getFirstDead(false);
                if (bullet) {
                    bullet.fire(this.otherPlayers[data.id] || { x: data.startX, y: data.startY }, data.targetX, data.targetY, data.state, data.id);
                } else {
                    console.error('No available bullet to fire');
                }
            } else if (data.type === 'death') {
                if (this.otherPlayers[data.id]) {
                    this.otherPlayers[data.id].destroy();
                    delete this.otherPlayers[data.id];
                }
            } else {
                if (data.id !== socket.id) {
                    if (!this.otherPlayers[data.id]) {
                        const otherPlayer = this.add.sprite(400, 300, 'enemy');
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
        if (this.player && this.alive) { 
            if ((game.getTime() - this.player.getData('lastFireTime') < this.player.getData('fireRate')) || this.player.getData('ammo') < 1 || (this.player.getData('ammo') < 4 && bulletState === 2) || 
            (this.player.getData('ammo') < 3 && bulletState === 3)) { 
                return; 
            }
            this.player.setData('id', this.socket.id); 
            const bullet = this.bulletGroup.fireBullet(this.player, pointer.x, pointer.y, bulletState, this.socket.id);

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
    }

    addEvents() {
        window.addEventListener("keydown", (e) => {
            if (!this.alive) return;  

            switch (e.key) {
                case "1":
                    this.player.setData('bulletState', 0);
                    break;                
                case "2":
                    this.player.setData('bulletState', 1);
                    break;
                case "3":
                    this.player.setData('bulletState', 2);
                    break;                
                case "4":
                    this.player.setData('bulletState', 3);
                    break;
                case "5":
                    this.player.setData('bulletState', 4);
                    break;
            }
        });

        this.input.on('pointerdown', pointer => {
            this.shootBullet(pointer, this.player.getData('bulletState'));
        });
    }

    update() {
        let moved = false;
    
        if (this.player && this.player.body && this.alive) {
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
            const pointer = this.input.activePointer;
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
            this.player.setRotation(angle + Phaser.Math.DegToRad(90));
    
        if (moved) {
            const data = { id: this.socket.id, x: this.player.x, y: this.player.y };
            this.socket.send(JSON.stringify(data));
        }

        if (this.player && this.alive && this.player.getData('ammo') < this.player.getData('maxAmmo')) {
            this.player.setData('ammo', this.player.getData('ammo') + 0.005);
        }

        if (this.ammoTypeText && this.ammoCountText && this.healthText) {
            this.ammoTypeText.setText('Ammo Type:' + (this.player.getData('bulletState') + 1).toString());
            this.ammoCountText.setText('Ammo Count:' + Math.trunc(this.player.getData('ammo')));
            this.healthText.setText('Health:' + this.player.getData('health'));
        }

        if (this.vision)
        {
            this.vision.x = this.player.x
            this.vision.y = this.player.y
        }
    }
}
}
    

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 640,
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
