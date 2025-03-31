import "./style.css";
import Phaser from "phaser";

const sizes = { width: 1200, height: 758 };
const speedDown = 400;
const speedIncreaseRate = 20;
const levelUpInterval = 5;
const goldenOrangeBonus = 3;
const rottenOrangePenalty = -2;
const timeBoost = 3;

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
    this.targetSpeed = speedDown;
    this.points = 0;
    this.textScore;
    this.textTime;
    this.timedEvent;
    this.remainingTime;
    this.coinMusic;
    this.bgMusic;
  }

  preload() {
    this.load.image("bg", "public/assets/PhaseDokeBG-V2.png");
    this.load.image("basket", "public/assets/basket.png");
    this.load.image("apple", "public/assets/orange.png");
    this.load.image("goldenApple", "public/assets/golden_orange.png");
    this.load.image("rottenApple", "public/assets/rotten_orange.png");
    this.load.audio("coin", "public/assets/coin.mp3");
    this.load.audio("bgMusic", "public/assets/bg_music.mp3");
  }

  create() {
    this.scene.pause("scene-game");
    this.add.image(0, 0, "bg").setOrigin(0, 0);

    this.player = this.physics.add
      .image(0, sizes.height - 100, "basket")
      .setOrigin(0, 0);
    this.player.setImmovable(true);
    this.player.body.allowGravity = false;
    this.player.setCollideWorldBounds(true);

    this.spawnTarget();

    this.cursor = this.input.keyboard.createCursorKeys();

    this.textScore = this.add.text(sizes.width - 120, 10, "Score: 0", {
      font: "25px Chewy",
      fill: "#ffffff",
    });
    this.textTime = this.add.text(10, 10, "Remaining Time: 30", {
      font: "25px Chewy",
      fill: "#ffffff",
    });

    this.timedEvent = this.time.delayedCall(30000, this.gameOver, [], this);

    this.coinMusic = this.sound.add("coin");
    this.bgMusic = this.sound.add("bgMusic");
    this.bgMusic.play();
  }

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
    this.textTime.setText(`Remaining Time: ${Math.round(this.remainingTime)}`);
  }

  getRandomX() {
    return Math.floor(Math.random() * sizes.width);
  }

  spawnTarget() {
    const randomType = Math.random();
    let texture = "apple";
    let scoreChange = 1;

    if (randomType < 0.1) {
      texture = "goldenApple";
      scoreChange = goldenOrangeBonus;
    } else if (randomType > 0.9) {
      texture = "rottenApple";
      scoreChange = rottenOrangePenalty;
    }

    this.target = this.physics.add
      .image(this.getRandomX(), 0, texture)
      .setOrigin(0, 0);
    this.target.setMaxVelocity(0, this.targetSpeed);
    this.target.scoreChange = scoreChange;
    this.physics.add.overlap(
      this.target,
      this.player,
      this.targetHit,
      null,
      this
    );
  }

  targetFallsOffScreen() {
    if (this.target.y >= sizes.height) {
      this.points = Math.max(0, this.points - 1);
      this.textScore.setText(`Score: ${this.points}`);
      this.showScorePopup(-1);

      if (this.points === 0) {
        this.gameOver();
      }

      this.target.destroy();
      this.spawnTarget();
    }
  }

  targetHit(target) {
    this.coinMusic.play();

    if (target.texture.key === "goldenApple") {
      this.timedEvent.delay += timeBoost * 1000;
    }

    this.points += target.scoreChange;
    this.points = Math.max(0, this.points);
    this.textScore.setText(`Score: ${this.points}`);
    this.showScorePopup(target.scoreChange);

    if (this.points % levelUpInterval === 0) {
      this.targetSpeed += speedIncreaseRate;
    }

    target.destroy();
    this.spawnTarget();
  }

  showScorePopup(scoreChange) {
    const color = scoreChange > 0 ? "#00ff00" : "#ff0000";
    const text = this.add.text(
      this.player.x + 30,
      this.player.y - 20,
      `${scoreChange > 0 ? "+" : ""}${scoreChange}`,
      {
        font: "25px Chewy",
        fill: color,
      }
    );
    this.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  gameOver() {
    this.sys.game.destroy(true);
    gameEndScoreSpan.textContent = this.points;
    gameWinLoseSpan.textContent = this.points >= 10 ? "Win! " : "Lose! ";
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
      gravity: { y: speedDown },
    },
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);

gameStartBtn.addEventListener("click", () => {
  gameStartDiv.style.display = "none";
  game.scene.resume("scene-game");
});
