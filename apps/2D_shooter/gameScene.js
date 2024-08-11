class gameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'gameScene' });

        this.bulletGroup;
    }

    preload() {
        this.load.image("bullet", "assets/bullet.png");
    }

    create() {
        this.bulletGroup = new BulletGroup(this);
        this.addEvents();

        //creating the player
        this.player = this.add.rectangle(400, 300, 50, 50, 0xff0000);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);

        //wall creation
        this.walls = this.physics.add.staticGroup();
        //this.walls.create(positionX, positionY, name)
        this.walls.create(200, 300, 'wall').setOrigin(0.5, 0.5).setDisplaySize(200, 20).refreshBody();
        this.walls.create(300, 400, 'wall').setOrigin(0.5, 0.5).setDisplaySize(20, 200).refreshBody();

        //this part is for the movement (arrow keys)
        this.cursors = this.input.keyboard.createCursorKeys();

        //physics
        this.physics.add.collider(this.player, this.walls);

        //collision between obstacles and bullets
        this.physics.add.collider(this.walls, this.bulletGroup, (object1, object2) => {
            if (object2.state !== 1) {
                object2.setActive(false);
                object2.setVisible(false);
            }
        });

    }
    
    //mouseclick event for shooting
    addEvents() {
        this.input.on('pointerdown', pointer => {
            let bulletState = 3;
            this.shootBullet(pointer, bulletState);
        })
    }
    shootBullet(pointer, bulletState) {
        this.bulletGroup.fireBullet(this.player, pointer.x, pointer.y, bulletState);
    }

    update() {
        //moving the player
        this.player.body.setVelocity(0);

        if(this.cursors.left.isDown) {
            this.player.body.setVelocityX(-160);
        } else if(this.cursors.right.isDown) {
            this.player.body.setVelocityX(160);
        }

        if(this.cursors.up.isDown) {
            this.player.body.setVelocityY(-160);
        } else if(this.cursors.down.isDown) {
            this.player.body.setVelocityY(160);
        }
    }
}