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
            key: 'bullet'
        })
    }

    //gets bullet to fire
    fireBullet(x, y, pointer) {
		const bullet = this.getFirstDead(false);
		if (bullet) {
			bullet.fire(x, y , pointer);
		}
	}
}
class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'bullet');
    }

    fire(x, y, pointer) {
		this.body.reset(x, y);
 
		this.setActive(true);
		this.setVisible(true);

        let velocityX = (pointer.x - x) / Math.sqrt(Math.pow(pointer.x - x, 2) + Math.pow(pointer.y - y, 2));
        let velocityY = (pointer.y - y) / Math.sqrt(Math.pow(pointer.x - x, 2) + Math.pow(pointer.y - y, 2));
        let scale = 500;

        this.setVelocity(velocityX * scale, velocityY * scale);
	}
}