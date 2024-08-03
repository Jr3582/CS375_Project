class Bullet extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        let x = scene.player.x;
        let y = scene.player.y;
        super(scene, x, y, "bullet");
        scene.sys.updateList.add(this);
        scene.sys.displayList.add(this);
        scene.physics.world.enableBody(this);
        this.body.setVelocityX(-50);
    }
}