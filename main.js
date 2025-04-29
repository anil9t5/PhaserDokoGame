import "./style.css";
import Phaser from "phaser";

// Game Constants - now using viewport-based sizing
const baseWidth = window.innerWidth;
const baseHeight = window.innerHeight;
const speedDown = 400;
const speedIncreaseRate = 20;
const levelUpInterval = 5;
const goldenOrangeBonus = 2;
const rottenOrangePenalty = -2;
const timeBoost = 3;
const rottenOrangeChance = 0.3;
const followUpDelay = 300;

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.scaleFactor = Math.min(window.innerWidth / 1200, window.innerHeight / 758);
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
    // Hide start screen
    document.getElementById("gameStartDiv").style.display = "none";
    
    // Background
    this.bg = this.add.image(0, 0, "bg").setOrigin(0, 0);
    this.bg.setDisplaySize(this.scale.width, this.scale.height);

    // Player
    this.player = this.physics.add.image(
      this.scale.width / 2,
      this.scale.height - 100 * this.scaleFactor,
      "basket"
    ).setOrigin(0.5, 0);
    this.player.setImmovable(true);
    this.player.body.allowGravity = false;
    this.player.setCollideWorldBounds(true);
    this.player.setScale(this.scaleFactor);

    // Controls - both touch and keyboard
    this.cursor = this.input.keyboard.createCursorKeys();
    this.setupTouchControls();

    // UI Elements with responsive sizing
    this.textScore = this.add.text(
      this.scale.width - 120 * this.scaleFactor,
      10 * this.scaleFactor,
      "Score: 0",
      { font: `${25 * this.scaleFactor}px Chewy`, fill: "#ffffff" }
    );
    
    this.textTime = this.add.text(
      10 * this.scaleFactor,
      10 * this.scaleFactor,
      "Remaining Time: 30",
      { font: `${25 * this.scaleFactor}px Chewy`, fill: "#ffffff" }
    );

    // Game timer (30 seconds)
    this.timedEvent = this.time.delayedCall(30000, this.gameOver, [], this);

    // Audio
    this.coinMusic = this.sound.add("coin");
    this.bgMusic = this.sound.add("bgMusic", { loop: true });
    this.bgMusic.play();

    // Game state
    this.points = 0;
    this.targetSpeed = speedDown * this.scaleFactor;
    this.playerSpeed = (speedDown + 50) * this.scaleFactor;
    this.targets = [];
    
    // Start spawning targets
    this.spawnTarget();
  }

  setupTouchControls() {
    // Left side of screen moves left, right side moves right
    this.input.on('pointerdown', (pointer) => {
      if (pointer.x < this.scale.width / 2) {
        this.player.setVelocityX(-this.playerSpeed);
      } else {
        this.player.setVelocityX(this.playerSpeed);
      }
    });
    
    // Stop when touch ends
    this.input.on('pointerup', () => {
      this.player.setVelocityX(0);
    });
  }

  update(time, delta) {
    // Keyboard controls (still works alongside touch)
    const { left, right } = this.cursor;
    if (left.isDown) {
      this.player.setVelocityX(-this.playerSpeed);
    } else if (right.isDown) {
      this.player.setVelocityX(this.playerSpeed);
    }

    // Move targets
    this.targets.forEach(target => {
      target.y += (this.targetSpeed * delta) / 1000;
    });

    this.targetFallsOffScreen();
    this.remainingTime = this.timedEvent.getRemainingSeconds();
    this.textTime.setText(`Remaining Time: ${Math.round(this.remainingTime)}`);
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

    const spawnX = xPos !== null ? xPos : Phaser.Math.Between(50, this.scale.width - 50);
    const target = this.physics.add.image(spawnX, 0, texture)
      .setOrigin(0, 0)
      .setScale(this.scaleFactor);
    
    target.setMaxVelocity(0, this.targetSpeed);
    target.scoreChange = scoreChange;
    target.textureKey = texture;
    target.isFollowUp = isFollowUp;

    this.physics.add.overlap(target, this.player, this.targetHit, null, this);
    this.targets.push(target);

    if (!isFollowUp && texture === "orange" && Math.random() < rottenOrangeChance) {
      this.time.delayedCall(followUpDelay, () => {
        this.spawnTarget(true, spawnX);
      });
    }
  }

  targetFallsOffScreen() {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i];
      if (target.y >= this.scale.height) {
        if (target.textureKey === "orange") {
          this.updateScore(-1);
        }
        target.destroy();
        this.targets.splice(i, 1);
        if (!target.isFollowUp) this.spawnTarget();
      }
    }
  }

  targetHit(target) {
    this.coinMusic.play();

    if (target.textureKey === "goldenOrange") {
      this.timedEvent.delay += timeBoost * 1000;
    }

    this.updateScore(target.scoreChange);

    if (this.points % levelUpInterval === 0) {
      this.targetSpeed += speedIncreaseRate * this.scaleFactor;
    }

    const index = this.targets.indexOf(target);
    if (index !== -1) this.targets.splice(index, 1);
    target.destroy();

    if (!target.isFollowUp) this.spawnTarget();
  }

  updateScore(change) {
    this.points = Math.max(0, this.points + change);
    this.textScore.setText(`Score: ${this.points}`);
  }

  showScorePopup(scoreChange) {
    const text = this.add.text(
      this.player.x + 30 * this.scaleFactor,
      this.player.y - 20 * this.scaleFactor,
      `${scoreChange > 0 ? "+" : ""}${scoreChange}`,
      {
        font: `${25 * this.scaleFactor}px Chewy`,
        fill: scoreChange > 0 ? "#00ff00" : "#ff0000"
      }
    );
    this.tweens.add({
      targets: text,
      y: text.y - 50 * this.scaleFactor,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    });
  }

  gameOver() {
    this.scene.pause();
    document.getElementById("gameEndScoreSpan").textContent = this.points;
    document.getElementById("gameWinLoseSpan").textContent = this.points >= 20 ? "Win!" : "Lose!";
    document.getElementById("gameEndDiv").style.display = "flex";
    this.bgMusic.stop();
  }
}

// Game configuration for mobile
const config = {
  type: Phaser.AUTO,
  parent: "gameCanvas",
  width: baseWidth,
  height: baseHeight,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: speedDown },
      debug: false
    }
  },
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  dom: {
    createContainer: true
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true
  }
};

// Create game instance
const game = new Phaser.Game(config);

// Start button handler
document.getElementById("gameStartBtn").addEventListener("click", () => {
  document.getElementById("gameStartDiv").style.display = "none";
  game.scene.start("GameScene");
});

// Handle orientation changes
window.addEventListener("orientationchange", () => {
  const warning = document.getElementById("orientationWarning");
  if (window.innerHeight > window.innerWidth) {
    warning.style.display = "flex";
  } else {
    warning.style.display = "none";
  }
});