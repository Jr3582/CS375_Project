// creates bullets for game, bullets will be recycled
class Dummy extends Phaser.Physics.Arcade.Sprite {
    public health = 5;
    constructor(scene, x, y) {
        super(scene, x, y, 'wall');
        this.setScale(2);
    }

    public takeDamage(value : Number): void {
        this.health -= value;
        if (this.health < 0);
        this.x = 0;
        this.y = 0;
    }
}