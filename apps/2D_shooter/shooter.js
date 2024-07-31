//canvas size & declaring scenes;
var config = {
    width: 800,
    height: 600,
    backgroundColor: 0x808080,
    scene: [gameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0},
            debug: false
        }
    }
}

window.onload = function() {
    var game = new Phaser.Game(config);
}