import "./style.css";
import Phaser from "phaser";

const sizes = { width: 1200, height: 758 };
const speedDown = 400;
const speedIncreaseRate = 20;
const levelUpInterval = 5;
const goldenOrangeBonus = 2;
const rottenOrangePenalty = -2;
const timeBoost = 3;
const rottenOrangeChance = 0.3; // 30% chance to spawn after regular orange
const followUpDelay = 300; // ms delay between regular and rotten orange

const gameStartDiv = document.querySelector("#gameStartDiv");
const gameStartBtn = document.querySelector("#gameStartBtn");
const gameEndDiv = document.querySelector("#gameEndDiv");
const gameWinLoseSpan = document.querySelector("#gameWinLoseSpan");
const gameEndScoreSpan = document.querySelector("#gameEndScoreSpan");
const gameCanvas = document.querySelector("#gameCanvas");

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
    this.targets = [];
  }

  preload() {
    this.load.image("bg", "assets/PhaseDokeBG-V2.png");
    this.load.image("basket", "assets/basket.png");
    this.load.image("orange", "assets/orange.png");
    this.load.image("goldenOrange", "assets/golden_orange.png");
    this.load.image("rottenOrange", "assets/rotten_orange.png");
    this.load.audio("coin", "assets/coin.mp3");
    this.load.audio("bgMusic", "assets/bg_music.mp3");
  }

  create() {
    this.scene.pause("scene-game");
    this.add.image(0, 0, "bg").setOrigin(0, 0);

    this.player = this.physics.add
      .image(sizes.width / 2, sizes.height - 100, "basket")
      .setOrigin(0.5, 0);
    this.player.setImmovable(true);
    this.player.body.allowGravity = false;
    this.player.setCollideWorldBounds(true);

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

    this.spawnTarget();
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

  spawnTarget(isFollowUp = false, xPos = null) {
    const randomType = Math.random();
    let texture = "orange";
    let scoreChange = 1;

    if (isFollowUp) {
      texture = "rottenOrange";
      scoreChange = rottenOrangePenalty;
    } else if (randomType < 0.1) {
      texture = "goldenOrange";
      scoreChange = goldenOrangeBonus;
    }

    const spawnX = xPos !== null ? xPos : this.getRandomX();
    const target = this.physics.add
      .image(spawnX, 0, texture)
      .setOrigin(0, 0);
    
    target.setMaxVelocity(0, this.targetSpeed);
    target.scoreChange = scoreChange;
    target.textureKey = texture;
    target.isFollowUp = isFollowUp;

    this.physics.add.overlap(target, this.player, this.targetHit, null, this);
    this.targets.push(target);

    // If this is a regular orange, chance to spawn rotten orange right after
    if (!isFollowUp && texture === "orange" && Math.random() < rottenOrangeChance) {
      this.time.delayedCall(followUpDelay, () => {
        this.spawnTarget(true, spawnX);
      });
    }
  }

  targetFallsOffScreen() {
    this.targets.forEach((target, index) => {
      if (target.y >= sizes.height) {
        // Only decrease score for regular oranges that fall off screen
        if (target.textureKey === "orange") {
          this.points = Math.max(0, this.points - 1);
          this.textScore.setText(`Score: ${this.points}`);
          this.showScorePopup(-1);

          if (this.points === 0) {
            this.gameOver();
          }
        }

        target.destroy();
        this.targets.splice(index, 1);
        
        // Only spawn new target if this wasn't a follow-up rotten orange
        if (!target.isFollowUp) {
          this.spawnTarget();
        }
      }
    });
  }

  targetHit(target) {
    this.coinMusic.play();

    if (target.textureKey === "goldenOrange") {
      this.timedEvent.delay += timeBoost * 1000;
    }

    this.points += target.scoreChange;
    this.points = Math.max(0, this.points);
    this.textScore.setText(`Score: ${this.points}`);
    this.showScorePopup(target.scoreChange);

    if (this.points % levelUpInterval === 0) {
      this.targetSpeed += speedIncreaseRate;
    }

    const index = this.targets.indexOf(target);
    if (index !== -1) this.targets.splice(index, 1);
    target.destroy();

    // Only spawn new target if this wasn't a follow-up rotten orange
    if (!target.isFollowUp) {
      this.spawnTarget();
    }
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
    this.scene.pause();
    gameEndScoreSpan.textContent = this.points;
    gameWinLoseSpan.textContent = this.points >= 20 ? "Win!" : "Lose!";
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