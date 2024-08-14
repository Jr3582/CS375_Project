// creates bullets for game, bullets will be recycled
class BulletGroup extends Phaser.Physics.Arcade.Group {
    constructor(scene) {
        super(scene.physics.world, scene);
        this.createMultiple({
            classType: Bullet
        })
        this.createMultiple({
            classType: Bullet,
            frameQuantity: 1000,
            active: false,
            visible: false,
            state: 0,
            key: 'bullet'
        })
    }

    //gets bullet to fire
    fireBullet(player, pointerX, pointerY, bulletState) {
		const bullet = this.getFirstDead(false);
		if (bullet) {
			bullet.fire(player, pointerX, pointerY, bulletState);
		}
	}
}
class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'bullet');
        this.setScale(0.1);
    }

    fire(player, pointerX, pointerY, bulletState) {
        let x = player.x;
        let y = player.y;
		this.body.reset(x, y);
 
        this.setState(bulletState);
		this.setActive(true);
		this.setVisible(true);

        let velocityX = (pointerX - x) / Math.sqrt(Math.pow(pointerX - x, 2) + Math.pow(pointerY - y, 2));
        let velocityY = (pointerY - y) / Math.sqrt(Math.pow(pointerX - x, 2) + Math.pow(pointerY - y, 2));
        let scale = 500;

        // bulletState: 0 = normal, 1 = bounce, 2 = 4d fire, 3 = spread fire
        if (this.state === 1) {
            this.setBounce(true);
        } else if (this.state === 2) {
            this.scene.bulletGroup.fireBullet(player, pointerX, pointerY, 21);
        }  else if (this.state === 3) {
            this.scene.bulletGroup.fireBullet(player, pointerX, pointerY, 31);
        }  else if (this.state === 21) {
            this.scene.bulletGroup.fireBullet(player, pointerX, pointerY, 22);
            let tempVelocity = velocityX
            velocityX = velocityY;
            velocityY = -tempVelocity;
        } else if (this.state === 22) {
            this.scene.bulletGroup.fireBullet(player, pointerX, pointerY, 23);
            let tempVelocity = velocityX
            velocityX = -velocityY;
            velocityY = tempVelocity;
        } else if (this.state === 23) {
            scale = -500;
        } else if ( this.state === 31) {
            this.scene.bulletGroup.fireBullet(player, pointerX, pointerY, 32);
            let bulletRotAngle = Math.PI/6;
            let bulletVX = (Math.cos(bulletRotAngle) * (pointerX - x)) - (Math.sin(bulletRotAngle) * (pointerY-y)) ;
            let bulletVY = (Math.sin(bulletRotAngle) * (pointerX - x)) + (Math.cos(bulletRotAngle) * (pointerY-y)) ;
            velocityX = bulletVX/ Math.sqrt(Math.pow(bulletVX, 2) + Math.pow(bulletVY, 2));
            velocityY = bulletVY/ Math.sqrt(Math.pow(bulletVX, 2) + Math.pow(bulletVY, 2));
        } else if ( this.state === 32) {
            let bulletRotAngle = -Math.PI/6;
            let bulletVX = (Math.cos(bulletRotAngle) * (pointerX - x)) - (Math.sin(bulletRotAngle) * (pointerY-y)) ;
            let bulletVY = (Math.sin(bulletRotAngle) * (pointerX - x)) + (Math.cos(bulletRotAngle) * (pointerY-y)) ;
            velocityX = bulletVX/ Math.sqrt(Math.pow(bulletVX, 2) + Math.pow(bulletVY, 2));
            velocityY = bulletVY/ Math.sqrt(Math.pow(bulletVX, 2) + Math.pow(bulletVY, 2));
        }
        
        console.log(velocityX, velocityY);
        this.setVelocity(velocityX * scale, velocityY * scale);
	}    
}