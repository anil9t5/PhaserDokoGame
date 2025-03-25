import "./style.css";
import Phaser from "phaser";

const sizes = { width: 500, height: 500 };

const speedDown = 300;

const gameStartDiv = document.querySelector("#gameStartDiv");
const gameStartBtn = document.querySelector("#gameStartBtn");
const gameEndDiv = document.querySelector("#gameEndDiv");
const gameWinLoseSpan = document.querySelector("#gameWinLoseSpan");
const gameEndScoreSpan = document.querySelector("#gameEndScoreSpan");

class GameScene extends Phaser.Scene {
  constructor() {
    super("scene-game");
    this.player;
    this.cursor;
    this.playerSpeed = speedDown + 50;
    this.target;
    this.points = 0;
    this.textScore;
    this.textTime;
    this.timedEvent;
    this.remainingTime;
    this.coinMusic;
    this.bgMusic;
    this.emitter;
    this.particles;
    this.gameOverMessage;
  }

  //Preload function logic
  preload() {
    this.load.image("bg", "public/assets/bg.png");
    this.load.image("basket", "public/assets/basket.png");
    this.load.image("apple", "public/assets/apple.png");
    this.load.image("money", "public/assets/money.png");
    this.load.audio("coin", "public/assets/coin.mp3");
    this.load.audio("bgMusic", "public/assets/bgMusic.mp3");
  }

  //Create function logic
  create() {
    this.scene.pause("scene-game");
    this.add.image(0, 0, "bg").setOrigin(0, 0);

    this.player = this.physics.add
      .image(0, sizes.height - 100, "basket")
      .setOrigin(0, 0);
    this.player.setImmovable(true);
    this.player.body.allowGravity = false;
    this.player.setCollideWorldBounds(true);
    // this.player.setSize(80, 15).setOffset(10, 70);
    this.player
      .setSize(
        this.player.width - this.player.width / 4,
        this.player.height / 6
      )
      .setOffset(
        this.player.width / 8,
        this.player.height - this.player.height / 8
      );

    this.target = this.physics.add.image(0, 0, "apple").setOrigin(0, 0);
    this.target.setMaxVelocity(0, speedDown);
    this.physics.add.overlap(
      this.target,
      this.player,
      this.targetHit,
      null,
      this //context
    );

    this.cursor = this.input.keyboard.createCursorKeys();

    this.textScore = this.add.text(sizes.width - 120, 10, "Score: 0", {
      font: "25px Arial",
      fill: "#000000",
    });

    this.textTime = this.add.text(10, 10, "Remaining Time: 00", {
      font: "25px Arial",
      fill: "#000000",
    });

    this.timedEvent = this.time.delayedCall(15000, this.gameOver, [], this);

    //Emitter...coin
    this.emitter = this.add.particles(0, 0, "money", {
      speed: 100,
      gravityY: speedDown - 200,
      scale: 0.04,
      duration: 100,
      emitting: false,
    });

    this.emitter.startFollow(
      this.player,
      this.player.width / 2,
      this.player.height / 2,
      true
    );
    //Add Music
    this.coinMusic = this.sound.add("coin");
    this.bgMusic = this.sound.add("bgMusic");
    this.bgMusic.play();
    this.bgMusic.stop();
  }

  //Update function logic
  update() {
    const { left, right } = this.cursor;

    this.targetFallsOffScreen();

    if (left.isDown) {
      this.player.setVelocityX(-this.playerSpeed);
    } else if (right.isDown) {
      this.player.setVelocityX(this.playerSpeed);
    } else {
      this.player.setVelocityX(0);
    }

    this.remainingTime = this.timedEvent.getRemainingSeconds();
    this.textTime.setText(
      `Remaining Time: ${Math.round(this.remainingTime).toString()}`
    );
  }

  getRandomX() {
    return Math.floor(Math.random() * 480);
  }

  targetFallsOffScreen() {
    if (this.target.y >= sizes.height) {
      this.target.setY(0);
      this.target.setX(this.getRandomX());
      this.points = Math.max(0, this.points - 1);
      this.textScore.setText(`Score: ${this.points}`);

      if (this.points === 0) {
        this.gameOver();
      }
    }
  }

  targetHit() {
    this.coinMusic.play();
    this.emitter.start();
    this.target.setY(0);
    this.target.setX(this.getRandomX());
    this.points++;
    this.textScore.setText(`Score: ${this.points}`);
  }

  gameOver() {
    console.log("Calling...");
    this.sys.game.destroy(true);
    if (this.points >= 10) {
      gameEndScoreSpan.textContent = this.points;
      this.remainingTime += 5;
      gameWinLoseSpan.textContent = "Win! ";
    } else {
      gameEndScoreSpan.textContent = this.points;
      gameWinLoseSpan.textContent = "Lose! ";
    }
    gameEndDiv.style.display = "flex";
  }
}

const config = {
  type: Phaser.WEBGL,
  width: sizes.width,
  height: sizes.height,
  canvas: gameCanvas,
  physics: {
    default: "arcade",
    arcade: {
      gravity: {
        y: speedDown,
      },
      debug: true,
    },
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);

gameStartBtn.addEventListener("click", () => {
  gameStartDiv.style.display = "none";
  game.scene.resume("scene-game");
});
