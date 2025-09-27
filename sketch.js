// Game states
let gameState = 'menu'; // 'menu', 'playing', 'gameOver'

// Game objects
let player;
let enemies = [];
let echoBarriers = [];
let particles = [];

// Game variables
let gameStartTime = 0;
let survivalTime = 0;
let highScore = 0;
let spawnTimer = 0;
let spawnRate = 120; // frames between spawns
let enemySpeed = 1;
let gameOverTime = 0;

// Visual effects
let screenShake = 0;

// Shield cooldown system
let shieldCooldown = 0;
let maxShieldCooldown = 180; // 3 seconds at 60fps

// Game boundaries
let boundary = 50; // Pixels from edge
let enemySpawnBoundary = 0; // Exactly at the edge where enemies spawn
let boundaryColor = [100, 255, 218, 150]; // Player boundary (bright)
let spawnBoundaryColor = [255, 100, 100, 120]; // Enemy spawn boundary (brighter red)

// Difficulty system
let currentDifficulty = 'medium'; // 'easy', 'medium', 'hard'
let difficultySettings = {
  easy: {
    spawnRate: 150,
    enemySpeed: 0.8,
    maxEnemies: 15,
    shieldCooldown: 120,
    name: "Easy"
  },
  medium: {
    spawnRate: 120,
    enemySpeed: 1.0,
    maxEnemies: 25,
    shieldCooldown: 180,
    name: "Medium"
  },
  hard: {
    spawnRate: 80,
    enemySpeed: 1.3,
    maxEnemies: 40,
    shieldCooldown: 240,
    name: "Hard"
  }
};

// Sound variables
let soundEnabled = true;
let oscillator;
let envelope;
let noise;

// Background music variables
let musicOsc1, musicOsc2, musicOsc3;
let musicEnv;
let musicNotes = [220, 246.94, 277.18, 329.63, 369.99, 415.30]; // A3, B3, C#4, E4, F#4, G#4 (minor pentatonic)
let currentNote = 0;
let musicTimer = 0;
let musicPlaying = false;

// Colors
const COLORS = {
  background: [0, 0, 0], // Pure black
  player: [100, 255, 218], // cyan
  trail: [100, 255, 218, 80], // semi-transparent cyan
  barrier: [200, 255, 240], // bright cyan-white
  enemy: [255, 50, 120], // magenta/crimson
  ui: [255, 255, 255]
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Load high score from localStorage
  if (localStorage.getItem('echoOrbHighScore')) {
    highScore = parseInt(localStorage.getItem('echoOrbHighScore'));
  }
  
  // Initialize player
  player = new Player(width/2, height/2);
  
  // Initialize HTML UI
  initializeHTMLUI();
  
  // Show menu screen initially
  showScreen('menu-screen');
  
  // Initialize sound components
  try {
    oscillator = new p5.Oscillator();
    envelope = new p5.Envelope();
    noise = new p5.Noise();
    
    // Set up envelope for crisp sound effects
    envelope.setADSR(0.01, 0.1, 0.3, 0.2);
    envelope.setRange(0.8, 0);
    
    // Initialize background music
    musicOsc1 = new p5.Oscillator('triangle');
    musicOsc2 = new p5.Oscillator('sine');
    musicOsc3 = new p5.Oscillator('sawtooth');
    musicEnv = new p5.Envelope();
    
    musicEnv.setADSR(0.1, 0.3, 0.7, 0.8);
    musicEnv.setRange(0.1, 0);
    
    // Connect to master output but keep quiet initially
    musicOsc1.amp(0);
    musicOsc2.amp(0);
    musicOsc3.amp(0);
    
    noise.disconnect();
  } catch(e) {
    soundEnabled = false;
    console.log("Sound initialization failed, continuing without audio");
  }
}

function draw() {
  // Apply screen shake
  if (screenShake > 0) {
    translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
    screenShake *= 0.9;
    if (screenShake < 0.1) screenShake = 0;
  }
  
  // Clean dark background with subtle pattern
  background(COLORS.background);
  
  // Add very subtle hexagonal pattern
  drawSubtlePattern();
  
  switch(gameState) {
    case 'menu':
      // Just show background and pattern - HTML UI handles menu
      break;
    case 'playing':
      updateGame();
      drawGame();
      break;
    case 'gameOver':
      // Just show background - HTML UI handles game over
      break;
  }
}

function drawMenu() {
  // Slow, subtle background orbs
  for (let i = 0; i < 5; i++) {
    let x = width * 0.2 + (i * width * 0.15) + sin(millis() * 0.0008 + i) * 20;
    let y = height * 0.3 + sin(millis() * 0.0012 + i * 2) * 30;
    let size = 20 + sin(millis() * 0.001 + i) * 3;
    
    push();
    fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 20);
    noStroke();
    circle(x, y, size * 2);
    fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 50);
    circle(x, y, size);
    pop();
  }
  
  push();
  fill(COLORS.ui);
  textAlign(CENTER, CENTER);
  
  // Static title with subtle shadow
  textSize(64);
  fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 100);
  text("Echo Orb", width/2 + 2, height/2 - 160); // Shadow
  fill(COLORS.ui);
  text("Echo Orb", width/2, height/2 - 162);
  
  // Tagline
  textSize(18);
  fill(COLORS.ui);
  text("Sacrifice your past to survive the present", width/2, height/2 - 110);
  
  // Instructions
  textSize(14);
  fill(180, 180, 180);
  text("Move Mouse - Control the Orb", width/2, height/2 - 80);
  text("Right-Click - Solidify your trail into a barrier", width/2, height/2 - 60);
  
  // Difficulty Selection
  textSize(18);
  fill(COLORS.ui);
  text("Select Difficulty:", width/2, height/2 - 20);
  
  // Difficulty Buttons
  drawDifficultyButton('easy', width/2 - 120, height/2 + 20);
  drawDifficultyButton('medium', width/2, height/2 + 20);  
  drawDifficultyButton('hard', width/2 + 120, height/2 + 20);
  
  // Start Button
  drawStartButton(width/2, height/2 + 100);
  
  // High score
  if (highScore > 0) {
    textSize(14);
    fill(COLORS.player[0], COLORS.player[1], COLORS.player[2]);
    text("Best Time (" + difficultySettings[currentDifficulty].name + "): " + formatTime(highScore), width/2, height/2 + 160);
  }
  
  // Sound toggle hint
  textSize(12);
  fill(150, 150, 150);
  text("Press 'M' to toggle sound", width/2, height - 30);
  
  pop();
}

function updateGame() {
  // Update survival time
  survivalTime = millis() - gameStartTime;
  
  // Update shield cooldown
  if (shieldCooldown > 0) {
    shieldCooldown--;
  }
  
  // Update player
  player.update();
  
  // Spawn enemies (respecting difficulty limits)
  spawnTimer++;
  let currentSettings = difficultySettings[currentDifficulty];
  
  if (spawnTimer >= spawnRate && enemies.length < currentSettings.maxEnemies) {
    spawnEnemy();
    spawnTimer = 0;
    
    // Increase difficulty over time with waves
    let timeSeconds = survivalTime / 1000;
    let difficultyLevel = floor(timeSeconds / 15); // Slower progression
    
    spawnRate = max(currentSettings.spawnRate * 0.4, currentSettings.spawnRate - (difficultyLevel * 5));
    enemySpeed = min(currentSettings.enemySpeed * 2, currentSettings.enemySpeed + (difficultyLevel * 0.1));
    
    // Occasional intensity spikes every 45 seconds
    if (floor(timeSeconds) % 45 === 0 && floor(timeSeconds) > 0 && spawnTimer === 0) {
      let spikeCount = currentDifficulty === 'easy' ? 2 : currentDifficulty === 'medium' ? 3 : 5;
      for (let i = 0; i < spikeCount; i++) {
        setTimeout(() => {
          if (enemies.length < currentSettings.maxEnemies) spawnEnemy();
        }, i * 300);
      }
    }
  }
  
  // Update enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    
    // Check collision with player
    if (enemies[i].collidesWith(player)) {
      gameOver();
      return;
    }
    
    // Check collision with echo barriers
    for (let j = echoBarriers.length - 1; j >= 0; j--) {
      if (echoBarriers[j].destroysEnemy(enemies[i])) {
        createParticleExplosion(enemies[i].x, enemies[i].y, COLORS.enemy);
        playEnemyDestroySound();
        screenShake += 3;
        enemies.splice(i, 1);
        break;
      }
    }
    
    // Bounce enemies off edges instead of removing them
    if (enemies[i]) {
      enemies[i].bounceOffEdges();
    }
  }
  
  // Update echo barriers
  for (let i = echoBarriers.length - 1; i >= 0; i--) {
    echoBarriers[i].update();
    if (echoBarriers[i].isDead()) {
      // Create destruction particles
      echoBarriers[i].createDestructionParticles();
      echoBarriers.splice(i, 1);
    }
  }
  
  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }
}

function drawGame() {
  // Draw game boundaries
  drawBoundaries();
  
  // Draw echo barriers
  for (let barrier of echoBarriers) {
    barrier.draw();
  }
  
  // Draw player (includes trail)
  player.draw();
  
  // Draw enemies
  for (let enemy of enemies) {
    enemy.draw();
  }
  
  // Draw particles
  for (let particle of particles) {
    particle.draw();
  }
  
  // Enhanced UI with Geometry Dash inspiration
  drawEnhancedTimer();
  drawShieldCooldownBar();
  
  // Minimal game info
  push();
  fill(COLORS.ui);
  textAlign(LEFT, TOP);
  textSize(14);
  text(`${enemies.length}/${difficultySettings[currentDifficulty].maxEnemies}`, 20, height - 40);
  pop();
}

function drawGameOver() {
  // Flash effect (brief red flash)
  let timeSinceGameOver = millis() - gameOverTime;
  if (timeSinceGameOver < 200) {
    let flashAlpha = map(timeSinceGameOver, 0, 200, 150, 0);
    background(COLORS.enemy[0], COLORS.enemy[1], COLORS.enemy[2], flashAlpha);
  }
  
  // Fading particles effect
  if (timeSinceGameOver < 2000) {
    for (let i = 0; i < 20; i++) {
      let x = random(width);
      let y = random(height);
      let alpha = map(timeSinceGameOver, 0, 2000, 100, 0);
      
      push();
      fill(COLORS.enemy[0], COLORS.enemy[1], COLORS.enemy[2], alpha * random(0.5, 1));
      noStroke();
      circle(x, y, random(2, 8));
      pop();
    }
  }
  
  push();
  textAlign(CENTER, CENTER);
  
  // Game over text with fade-in
  let textAlpha = min(255, map(timeSinceGameOver, 100, 800, 0, 255));
  fill(COLORS.ui[0], COLORS.ui[1], COLORS.ui[2], textAlpha);
  textSize(48);
  text("Your Echo Fades", width/2, height/2 - 80);
  
  // Score with emphasis if it's a new high score
  textSize(24);
  if (survivalTime >= highScore && survivalTime > 0) {
    // New high score - clean highlight
    fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], textAlpha);
    text("NEW RECORD!", width/2, height/2 - 45);
    fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], textAlpha);
  } else {
    fill(COLORS.ui[0], COLORS.ui[1], COLORS.ui[2], textAlpha);
  }
  text("Time Survived: " + formatTime(survivalTime), width/2, height/2 - 20);
  
  // High score
  textSize(18);
  fill(COLORS.ui[0], COLORS.ui[1], COLORS.ui[2], textAlpha * 0.8);
  text("Best Time: " + formatTime(highScore), width/2, height/2 + 20);
  
  // Clean static again button (appears after a delay)
  if (timeSinceGameOver > 1000) {
    let buttonAlpha = min(255, map(timeSinceGameOver, 1000, 2000, 0, 255));
    
    stroke(COLORS.ui[0], COLORS.ui[1], COLORS.ui[2], buttonAlpha);
    noFill();
    strokeWeight(2);
    rect(width/2 - 50, height/2 + 80, 100, 40);
    
    noStroke();
    fill(COLORS.ui[0], COLORS.ui[1], COLORS.ui[2], buttonAlpha);
    text("[ AGAIN ]", width/2, height/2 + 100);
  }
  
  pop();
}

function spawnEnemy() {
  // Spawn from just outside the visible area
  let x, y;
  let side = floor(random(4));
  let spawnOffset = 20; // Spawn just outside screen
  
  switch(side) {
    case 0: // top
      x = random(0, width);
      y = -spawnOffset;
      break;
    case 1: // right
      x = width + spawnOffset;
      y = random(0, height);
      break;
    case 2: // bottom
      x = random(0, width);
      y = height + spawnOffset;
      break;
    case 3: // left
      x = -spawnOffset;
      y = random(0, height);
      break;
  }
  
  enemies.push(new Enemy(x, y));
}

function gameOver() {
  gameState = 'gameOver';
  gameOverTime = millis();
  
  // Visual effects
  screenShake += 15;
  
  // Sound effect
  playGameOverSound();
  
  // Update high score
  if (survivalTime > highScore) {
    highScore = survivalTime;
    localStorage.setItem('echoOrbHighScore', highScore);
  }
  
  // Remove playing class and show HTML game over screen
  document.querySelector('.game-ui').classList.remove('playing');
  
  // Stop background music
  stopBackgroundMusic();
  
  showGameOver();
}

function startGame() {
  gameState = 'playing';
  gameStartTime = millis();
  survivalTime = 0;
  spawnTimer = 0;
  
  // Apply difficulty settings
  let settings = difficultySettings[currentDifficulty];
  spawnRate = settings.spawnRate;
  enemySpeed = settings.enemySpeed;
  maxShieldCooldown = settings.shieldCooldown;
  shieldCooldown = 0;
  
  // Reset arrays
  enemies = [];
  echoBarriers = [];
  particles = [];
  
  // Reset player (spawn within boundaries)
  player = new Player(width/2, height/2);
  
  // Ensure UI doesn't interfere with gameplay
  document.querySelector('.game-ui').classList.add('playing');
  
  // Start background music
  startBackgroundMusic();
  
  console.log("Game started! State:", gameState); // Debug log
}

function formatTime(ms) {
  let totalSeconds = floor(ms / 1000);
  let minutes = floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return minutes + "m " + seconds + "s";
  } else {
    return seconds + "s";
  }
}

function drawSubtlePattern() {
  // Enhanced hexagonal pattern with subtle animation
  push();
  
  let time = millis() * 0.0005;
  let intensity = gameState === 'playing' ? min(0.8, survivalTime / 60000) : 0.3;
  
  // Base pattern
  stroke(20 + intensity * 15, 20 + intensity * 10, 30 + intensity * 20);
  strokeWeight(0.4 + intensity * 0.3);
  noFill();
  
  let spacing = 50;
  for (let x = -spacing; x < width + spacing; x += spacing) {
    for (let y = -spacing; y < height + spacing; y += spacing * 0.866) {
      let offsetX = (floor(y / (spacing * 0.866)) % 2) * (spacing / 2);
      
      // Add subtle pulsing
      let distance = dist(x + offsetX, y, width/2, height/2);
      let pulse = sin(time * 2 + distance * 0.01) * 0.3 + 1;
      
      push();
      translate(x + offsetX, y);
      scale(pulse);
      
      // Vary opacity based on distance from center
      let alpha = map(distance, 0, max(width, height) * 0.5, 100, 20) * intensity;
      stroke(20 + intensity * 15, 20 + intensity * 10, 30 + intensity * 20, alpha);
      
      drawHexagon(0, 0, 12);
      pop();
    }
  }
  
  // Add some moving dots for extra visual interest
  if (gameState === 'playing') {
    fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 30 * intensity);
    noStroke();
    
    for (let i = 0; i < 5; i++) {
      let x = (sin(time + i) * 0.5 + 0.5) * width;
      let y = (cos(time * 1.3 + i * 2) * 0.5 + 0.5) * height;
      circle(x, y, 2 + intensity * 2);
    }
  }
  
  pop();
}

function drawHexagon(x, y, radius) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    let angle = (i * TWO_PI) / 6;
    let px = x + cos(angle) * radius;
    let py = y + sin(angle) * radius;
    vertex(px, py);
  }
  endShape(CLOSE);
}

function drawBoundaries() {
  push();
  
  // Outer boundary (enemy spawn zone) - exactly at screen edge
  stroke(spawnBoundaryColor);
  strokeWeight(2);
  noFill();
  rect(0, 0, width, height);
  
  // Inner boundary (player movement) - double-lined bright cyan
  stroke(boundaryColor);
  strokeWeight(2);
  
  // Outer line
  rect(boundary - 2, boundary - 2, width - (boundary - 2) * 2, height - (boundary - 2) * 2);
  // Inner line  
  rect(boundary + 2, boundary + 2, width - (boundary + 2) * 2, height - (boundary + 2) * 2);
  
  // Add corner indicators for player boundary
  fill(boundaryColor);
  noStroke();
  let cornerSize = 10;
  
  // Top-left
  triangle(boundary, boundary, boundary + cornerSize, boundary, boundary, boundary + cornerSize);
  // Top-right  
  triangle(width - boundary, boundary, width - boundary - cornerSize, boundary, width - boundary, boundary + cornerSize);
  // Bottom-left
  triangle(boundary, height - boundary, boundary + cornerSize, height - boundary, boundary, height - boundary - cornerSize);
  // Bottom-right
  triangle(width - boundary, height - boundary, width - boundary - cornerSize, height - boundary, width - boundary, height - boundary - cornerSize);
  
  pop();
}

function drawDifficultyButton(difficulty, x, y) {
  let isSelected = currentDifficulty === difficulty;
  let isHovered = abs(mouseX - x) < 40 && abs(mouseY - y) < 20;
  
  push();
  translate(x, y);
  
  // Button background
  if (isSelected) {
    fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 100);
    stroke(COLORS.player);
  } else if (isHovered) {
    fill(COLORS.ui[0], COLORS.ui[1], COLORS.ui[2], 50);
    stroke(COLORS.ui);
  } else {
    noFill();
    stroke(150, 150, 150);
  }
  
  strokeWeight(2);
  rect(-35, -15, 70, 30);
  
  // Difficulty skulls
  let skullCount = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  fill(difficulty === 'easy' ? color(100, 255, 100) : 
       difficulty === 'medium' ? color(255, 255, 100) : 
       color(255, 100, 100));
  
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(10);
  
  let skullSpacing = 12;
  let startX = -(skullCount - 1) * skullSpacing / 2;
  
  for (let i = 0; i < skullCount; i++) {
    text("💀", startX + i * skullSpacing, -8);
  }
  
  // Difficulty name
  fill(isSelected ? COLORS.player : COLORS.ui);
  textSize(12);
  text(difficultySettings[difficulty].name.toUpperCase(), 0, 8);
  
  pop();
}

function drawStartButton(x, y) {
  let isHovered = abs(mouseX - x) < 80 && abs(mouseY - y) < 25;
  
  push();
  translate(x, y);
  
  // Rhombus shape
  let w = 140;
  let h = 40;
  
  if (isHovered) {
    // Glow effect on hover
    fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 30);
    noStroke();
    beginShape();
    vertex(-w/2 - 5, 0);
    vertex(0, -h/2 - 3);
    vertex(w/2 + 5, 0);
    vertex(0, h/2 + 3);
    endShape(CLOSE);
  }
  
  // Main rhombus
  stroke(isHovered ? COLORS.player : COLORS.ui);
  strokeWeight(2);
  fill(isHovered ? color(COLORS.player[0], COLORS.player[1], COLORS.player[2], 20) : color(0, 0, 0, 0));
  
  beginShape();
  vertex(-w/2, 0);
  vertex(0, -h/2);
  vertex(w/2, 0);
  vertex(0, h/2);
  endShape(CLOSE);
  
  // Arrow indicator
  noStroke();
  fill(isHovered ? COLORS.player : COLORS.ui);
  
  // Play arrow
  triangle(-10, -8, -10, 8, 5, 0);
  
  // Text
  textAlign(CENTER, CENTER);
  textSize(16);
  text("START GAME", 20, 0);
  
  pop();
}

function drawShieldCooldownBar() {
  // Visual shield cooldown indicator
  let barWidth = 120;
  let barHeight = 8;
  let barX = 20;
  let barY = 20;
  
  push();
  
  // Background bar
  stroke(100, 100, 100);
  strokeWeight(1);
  fill(30, 30, 30);
  rect(barX, barY, barWidth, barHeight);
  
  // Cooldown progress
  if (shieldCooldown > 0) {
    let progress = 1 - (shieldCooldown / maxShieldCooldown);
    fill(255, 100, 100);
    noStroke();
    rect(barX, barY, barWidth * progress, barHeight);
    
    // "SHIELD" text
    fill(255, 100, 100);
    textAlign(LEFT, TOP);
    textSize(12);
    text("SHIELD", barX, barY + 12);
  } else {
    // Ready state
    fill(100, 255, 150);
    noStroke();
    rect(barX, barY, barWidth, barHeight);
    
    // "READY" text  
    fill(100, 255, 150);
    textAlign(LEFT, TOP);
    textSize(12);
    text("READY", barX, barY + 12);
  }
  
  pop();
}

function drawEnhancedTimer() {
  // Geometry Dash inspired timer in top right
  push();
  
  let timerX = width - 20;
  let timerY = 30;
  let timeStr = formatTime(survivalTime);
  
  // Background panel with glow
  fill(0, 0, 0, 120);
  stroke(COLORS.player[0], COLORS.player[1], COLORS.player[2], 150);
  strokeWeight(2);
  
  // Dynamic panel size based on text
  let panelWidth = textWidth(timeStr) + 40;
  let panelHeight = 50;
  
  // Angled panel (Geometry Dash style)
  beginShape();
  vertex(timerX - panelWidth + 10, timerY - 10);
  vertex(timerX, timerY - 10);
  vertex(timerX, timerY + panelHeight - 10);
  vertex(timerX - panelWidth, timerY + panelHeight - 10);
  endShape(CLOSE);
  
  // Outer glow effect
  fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 30);
  noStroke();
  beginShape();
  vertex(timerX - panelWidth + 8, timerY - 12);
  vertex(timerX + 2, timerY - 12);
  vertex(timerX + 2, timerY + panelHeight - 8);
  vertex(timerX - panelWidth - 2, timerY + panelHeight - 8);
  endShape(CLOSE);
  
  // Timer text with pulsing effect
  let pulse = sin(millis() * 0.01) * 0.1 + 1;
  fill(COLORS.ui);
  textAlign(RIGHT, CENTER);
  textSize(24 * pulse);
  text(timeStr, timerX - 15, timerY + 15);
  
  // Add difficulty indicator
  fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 150);
  textAlign(RIGHT, TOP);
  textSize(12);
  text(difficultySettings[currentDifficulty].name.toUpperCase(), timerX - 15, timerY + 35);
  
  pop();
}

function createParticleExplosion(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push(new Particle(x, y, color));
  }
  
  // Add some sparkle particles for extra effect
  for (let i = 0; i < 4; i++) {
    particles.push(new Particle(x, y, COLORS.barrier, 'sparkle'));
  }
}

// Input handling
function mousePressed() {
  if (gameState === 'playing' && mouseButton === RIGHT) {
    // Create echo barrier from trail (with cooldown)
    if (shieldCooldown <= 0) {
      if (player.sacrificeTrail()) {
        shieldCooldown = maxShieldCooldown;
      }
    }
  }
  
  return false; // Prevent default browser behavior including context menu
}

function keyPressed() {
  // Sound toggle
  if (key === 'm' || key === 'M') {
    soundEnabled = !soundEnabled;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Prevent right-click context menu globally
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  return false;
});

// HTML UI Management
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  if (screenId && document.getElementById(screenId)) {
    document.getElementById(screenId).classList.add('active');
  }
}

function hideAllScreens() {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
}

function initializeHTMLUI() {
  // Difficulty buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDifficulty = btn.getAttribute('data-difficulty');
      playMenuSound();
    });
  });
  
  // Start button
  document.getElementById('start-btn').addEventListener('click', () => {
    hideAllScreens(); // Hide UI
    playMenuSound();
    startGame();
  });
  
  // Restart button
  document.getElementById('restart-btn').addEventListener('click', () => {
    hideAllScreens(); // Hide UI
    playMenuSound();
    startGame();
  });
  
  updateHighScore();
}

function updateHighScore() {
  if (highScore > 0) {
    const highScoreText = `Best Time (${difficultySettings[currentDifficulty].name}): ${formatTime(highScore)}`;
    document.getElementById('high-score').textContent = highScoreText;
    document.getElementById('gameover-highscore').textContent = `Best Time: ${formatTime(highScore)}`;
  }
}

function showGameOver() {
  document.getElementById('final-time').textContent = `Time Survived: ${formatTime(survivalTime)}`;
  updateHighScore();
  
  if (survivalTime >= highScore && survivalTime > 0) {
    const newRecordDiv = document.createElement('div');
    newRecordDiv.textContent = 'NEW RECORD!';
    newRecordDiv.style.color = 'rgb(100, 255, 218)';
    newRecordDiv.style.fontSize = '1.2rem';
    newRecordDiv.style.marginBottom = '1rem';
    document.getElementById('final-time').appendChild(newRecordDiv);
  }
  
  // Show immediately - no delay!
  showScreen('gameover-screen');
}

// Sound effect functions
function playBarrierCreateSound() {
  if (!soundEnabled) return;
  
  try {
    // Create a rising tone for barrier creation
    oscillator.freq(200);
    oscillator.setType('triangle');
    oscillator.amp(envelope);
    oscillator.start();
    
    // Sweep frequency up
    oscillator.freq(400, 0.3);
    
    envelope.play();
    
    setTimeout(() => {
      oscillator.stop();
    }, 400);
  } catch(e) {
    console.log("Sound error:", e);
  }
}

function playEnemyDestroySound() {
  if (!soundEnabled) return;
  
  try {
    // Create a sharp, satisfying pop
    oscillator.freq(800);
    oscillator.setType('square');
    oscillator.amp(envelope);
    oscillator.start();
    
    // Quick frequency drop
    oscillator.freq(200, 0.1);
    
    envelope.play();
    
    setTimeout(() => {
      oscillator.stop();
    }, 200);
  } catch(e) {
    console.log("Sound error:", e);
  }
}

function playGameOverSound() {
  if (!soundEnabled) return;
  
  try {
    // Create a dramatic descending tone
    oscillator.freq(400);
    oscillator.setType('sawtooth');
    oscillator.amp(envelope);
    oscillator.start();
    
    // Sweep down dramatically
    oscillator.freq(50, 1.0);
    
    envelope.play();
    
    setTimeout(() => {
      oscillator.stop();
    }, 1200);
  } catch(e) {
    console.log("Sound error:", e);
  }
}

function playMenuSound() {
  if (!soundEnabled) return;
  
  try {
    // Create a gentle confirmation sound
    oscillator.freq(300);
    oscillator.setType('sine');
    oscillator.amp(envelope);
    oscillator.start();
    
    oscillator.freq(450, 0.2);
    
    envelope.play();
    
    setTimeout(() => {
      oscillator.stop();
    }, 300);
  } catch(e) {
    console.log("Sound error:", e);
  }
}

function startBackgroundMusic() {
  if (!soundEnabled || musicPlaying) return;
  
  try {
    musicOsc1.start();
    musicOsc2.start();
    musicOsc3.start();
    musicPlaying = true;
    
    playMusicSequence();
  } catch(e) {
    console.log("Music error:", e);
  }
}

function stopBackgroundMusic() {
  if (!musicPlaying) return;
  
  try {
    musicOsc1.amp(0, 1); // Fade out over 1 second
    musicOsc2.amp(0, 1);
    musicOsc3.amp(0, 1);
    
    setTimeout(() => {
      if (musicPlaying) {
        musicOsc1.stop();
        musicOsc2.stop();
        musicOsc3.stop();
        musicPlaying = false;
      }
    }, 1000);
  } catch(e) {
    console.log("Music error:", e);
  }
}

function playMusicSequence() {
  if (!musicPlaying || !soundEnabled) return;
  
  // Retro funky sequence
  let baseFreq = musicNotes[currentNote];
  let harmony1 = baseFreq * 1.25; // Perfect fourth
  let harmony2 = baseFreq * 0.75; // Lower octave
  
  musicOsc1.freq(baseFreq);
  musicOsc2.freq(harmony1);
  musicOsc3.freq(harmony2);
  
  // Dynamic volume based on game intensity
  let intensity = min(1, survivalTime / 30000); // Builds over 30 seconds
  let baseVol = 0.08 + intensity * 0.05;
  
  musicOsc1.amp(baseVol, 0.1);
  musicOsc2.amp(baseVol * 0.6, 0.1);
  musicOsc3.amp(baseVol * 0.4, 0.1);
  
  // Move to next note
  currentNote = (currentNote + 1) % musicNotes.length;
  
  // Schedule next note (retro 8-bit style timing)
  setTimeout(() => {
    if (musicPlaying) {
      playMusicSequence();
    }
  }, 400 + random(-50, 50)); // Slight timing variation
}

// Player class
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 12;
    this.trail = []; // Array of trail points
    this.maxTrailLength = 300; // Maximum trail points
  }
  
  update() {
    // Check if any echo barriers are active (orb is vulnerable during shield creation)
    let isVulnerable = echoBarriers.length > 0;
    
    if (!isVulnerable) {
      // Fast responsive movement when not creating shields
      let targetX = constrain(mouseX, boundary, width - boundary);
      let targetY = constrain(mouseY, boundary, height - boundary);
      
      // Much more responsive movement
      this.x = lerp(this.x, targetX, 0.3);
      this.y = lerp(this.y, targetY, 0.3);
    }
    // When vulnerable (shield active), orb freezes in place!
    
    // Ensure player stays within boundaries
    this.x = constrain(this.x, boundary, width - boundary);
    this.y = constrain(this.y, boundary, height - boundary);
    
    // Add to trail if moved enough
    if (this.trail.length === 0 || 
        dist(this.x, this.y, this.trail[this.trail.length-1].x, this.trail[this.trail.length-1].y) > 3) {
      this.trail.push({
        x: this.x,
        y: this.y,
        time: millis()
      });
    }
    
    // Remove old trail points (5-7 seconds)
    let trailLifetime = 6000;
    for (let i = this.trail.length - 1; i >= 0; i--) {
      if (millis() - this.trail[i].time > trailLifetime) {
        this.trail.splice(i, 1);
      } else {
        break; // Since trail is chronological, we can break here
      }
    }
    
    // Limit trail length
    if (this.trail.length > this.maxTrailLength) {
      this.trail.splice(0, this.trail.length - this.maxTrailLength);
    }
  }
  
  draw() {
    // Draw trail with gradient effect
    if (this.trail.length > 1) {
      push();
      noFill();
      
      // Draw multiple trail layers for depth
      for (let layer = 0; layer < 3; layer++) {
        let alpha = [60, 40, 20][layer];
        let weight = [10, 14, 18][layer];
        
        stroke(COLORS.trail[0], COLORS.trail[1], COLORS.trail[2], alpha);
        strokeWeight(weight);
        
        beginShape();
        for (let i = 0; i < this.trail.length; i++) {
          let point = this.trail[i];
          let age = (millis() - point.time) / 6000; // Trail lifetime is 6 seconds
          let trailAlpha = (1 - age) * alpha;
          
          if (i > 0) {
            stroke(COLORS.trail[0], COLORS.trail[1], COLORS.trail[2], trailAlpha);
          }
          vertex(point.x, point.y);
        }
        endShape();
      }
      pop();
    }
    
    // Draw player with enhanced glow effect
    push();
    
    // Check vulnerability state
    let isVulnerable = echoBarriers.length > 0;
    
    if (isVulnerable) {
      // Vulnerable state - red pulsing warning
      let vulnPulse = sin(millis() * 0.03) * 0.5 + 0.5;
      
      // Red warning glow
      fill(255, 100, 100, 100 * vulnPulse);
      noStroke();
      circle(this.x, this.y, this.size * 3);
      
      fill(255, 100, 100, 150);
      circle(this.x, this.y, this.size * 1.8);
      
      // Vulnerable orb (darker with red tint)
      fill(COLORS.player[0] * 0.7, COLORS.player[1] * 0.7, COLORS.player[2] * 0.7);
      circle(this.x, this.y, this.size);
      
      // Red warning core
      fill(255, 150, 150, 200);
      circle(this.x - 1, this.y - 1, this.size * 0.3);
    } else {
      // Normal state - enhanced responsiveness visual
      let pulseSize = sin(millis() * 0.01) * 3 + this.size * 2.5;
      
      // Multiple glow layers
      fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 40);
      noStroke();
      circle(this.x, this.y, pulseSize);
      
      fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 80);
      circle(this.x, this.y, this.size * 2);
      
      fill(COLORS.player[0], COLORS.player[1], COLORS.player[2], 140);
      circle(this.x, this.y, this.size * 1.4);
      
      // Main orb with subtle animation
      let mainSize = this.size + sin(millis() * 0.02) * 1;
      fill(COLORS.player);
      circle(this.x, this.y, mainSize);
      
      // Core bright spot
      fill(255, 255, 255, 220);
      circle(this.x - 2, this.y - 2, this.size * 0.3);
    }
    
    pop();
  }
  
  sacrificeTrail() {
    if (this.trail.length > 10) { // Minimum trail length to sacrifice
      
      // Use FULL trail - no more limiting
      echoBarriers.push(new EchoBarrier(this.trail));
      playBarrierCreateSound();
      screenShake += 2;
      
      // Create sparkle particles at barrier creation
      for (let i = 0; i < this.trail.length; i += 8) {
        let point = this.trail[i];
        particles.push(new Particle(point.x, point.y, COLORS.barrier, 'sparkle'));
      }
      
      this.trail = []; // Clear the trail
      return true; // Successfully created barrier
    }
    return false; // Not enough trail
  }
}

// Enemy class
class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseSize = 8;
    
    // Size increases based on survival time
    let sizeMultiplier = 1 + (survivalTime / 60000); // Grow 1x every minute
    this.size = this.baseSize * min(sizeMultiplier, 2.5); // Cap at 2.5x size
    
    this.targetX = player.x;
    this.targetY = player.y;
    this.speed = enemySpeed;
    
    // Calculate direction toward player's current position
    let angle = atan2(this.targetY - this.y, this.targetX - this.x);
    this.vx = cos(angle) * this.speed;
    this.vy = sin(angle) * this.speed;
    
    this.shape = floor(random(2)); // 0 = triangle, 1 = square
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Continuously grow in size based on survival time
    let sizeMultiplier = 1 + (survivalTime / 60000);
    this.size = this.baseSize * min(sizeMultiplier, 2.5);
  }
  
  draw() {
    push();
    translate(this.x, this.y);
    
    // Rotation for menacing effect
    rotate(millis() * 0.01 * (this.shape === 0 ? 1 : -1));
    
    // Glow effect
    fill(COLORS.enemy[0], COLORS.enemy[1], COLORS.enemy[2], 80);
    noStroke();
    
    if (this.shape === 0) {
      // Triangle with glow
      let glowSize = this.size * 1.6;
      triangle(0, -glowSize, -glowSize * 0.866, glowSize * 0.5, glowSize * 0.866, glowSize * 0.5);
    } else {
      // Square with glow
      rectMode(CENTER);
      rect(0, 0, this.size * 2.2, this.size * 2.2);
    }
    
    // Main shape
    fill(COLORS.enemy);
    
    if (this.shape === 0) {
      // Triangle
      triangle(0, -this.size, -this.size * 0.866, this.size * 0.5, this.size * 0.866, this.size * 0.5);
    } else {
      // Square
      rectMode(CENTER);
      rect(0, 0, this.size * 1.5, this.size * 1.5);
    }
    
    // Core dark spot for depth
    fill(0, 0, 0, 100);
    if (this.shape === 0) {
      triangle(0, -this.size * 0.5, -this.size * 0.4, this.size * 0.2, this.size * 0.4, this.size * 0.2);
    } else {
      rect(0, 0, this.size * 0.8, this.size * 0.8);
    }
    
    pop();
  }
  
  collidesWith(player) {
    return dist(this.x, this.y, player.x, player.y) < (this.size + player.size) * 0.5;
  }
  
  bounceOffEdges() {
    // Bounce off screen edges
    if (this.x < 0 || this.x > width) {
      this.vx *= -1;
      this.x = constrain(this.x, 0, width);
    }
    if (this.y < 0 || this.y > height) {
      this.vy *= -1;
      this.y = constrain(this.y, 0, height);
    }
  }
}

// Echo Barrier class
class EchoBarrier {
  constructor(trailPoints) {
    this.points = [...trailPoints]; // Copy the trail points
    this.creationTime = millis();
    this.lifetime = 2500; // 2.5 seconds
    this.glowIntensity = 255;
  }
  
  update() {
    // Fade glow over time
    let age = millis() - this.creationTime;
    this.glowIntensity = map(age, 0, this.lifetime, 255, 100);
  }
  
  draw() {
    if (this.points.length > 1) {
      push();
      
      // Electric effect animation
      let electricOffset = sin(millis() * 0.02) * 2;
      
      // Multiple glow layers for intensity
      for (let layer = 0; layer < 4; layer++) {
        let alpha = this.glowIntensity * [0.2, 0.4, 0.7, 1.0][layer];
        let weight = [25, 18, 12, 8][layer];
        
        stroke(COLORS.barrier[0], COLORS.barrier[1], COLORS.barrier[2], alpha);
        strokeWeight(weight);
        noFill();
        
        beginShape();
        for (let i = 0; i < this.points.length; i++) {
          let point = this.points[i];
          let x = point.x + (layer === 0 ? electricOffset : 0);
          let y = point.y + (layer === 0 ? sin(millis() * 0.03 + i * 0.5) * 1 : 0);
          vertex(x, y);
        }
        endShape();
      }
      
      // Core bright line
      stroke(255, 255, 255, this.glowIntensity * 0.8);
      strokeWeight(4);
      
      beginShape();
      for (let point of this.points) {
        vertex(point.x, point.y);
      }
      endShape();
      
      pop();
    }
  }
  
  isDead() {
    return millis() - this.creationTime > this.lifetime;
  }
  
  destroysEnemy(enemy) {
    // Check if enemy intersects with any segment of the barrier
    for (let i = 0; i < this.points.length - 1; i++) {
      let p1 = this.points[i];
      let p2 = this.points[i + 1];
      
      let distance = distanceToLineSegment(enemy.x, enemy.y, p1.x, p1.y, p2.x, p2.y);
      if (distance < enemy.size + 6) { // Full thickness restored
        return true;
      }
    }
    return false;
  }
  
  createDestructionParticles() {
    // Create particles along the barrier
    for (let i = 0; i < this.points.length; i += 5) {
      let point = this.points[i];
      for (let j = 0; j < 3; j++) {
        particles.push(new Particle(point.x, point.y, COLORS.barrier));
      }
    }
  }
}

// Particle class
class Particle {
  constructor(x, y, color, type = 'normal') {
    this.x = x;
    this.y = y;
    this.type = type;
    
    if (type === 'sparkle') {
      this.vx = random(-1, 1);
      this.vy = random(-1, 1);
      this.size = random(1, 3);
      this.decay = random(0.01, 0.02);
    } else {
      this.vx = random(-3, 3);
      this.vy = random(-3, 3);
      this.size = random(2, 6);
      this.decay = random(0.02, 0.04);
    }
    
    this.color = color;
    this.life = 1.0;
    this.rotation = random(TWO_PI);
    this.rotationSpeed = random(-0.2, 0.2);
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98; // Slight drag
    this.vy *= 0.98;
    this.life -= this.decay;
    this.rotation += this.rotationSpeed;
    
    if (this.type === 'sparkle') {
      this.vy -= 0.05; // Slight upward drift for sparkles
    }
  }
  
  draw() {
    if (this.life > 0) {
      push();
      translate(this.x, this.y);
      rotate(this.rotation);
      
      if (this.type === 'sparkle') {
        // Draw sparkle as a star shape
        fill(this.color[0], this.color[1], this.color[2], this.life * 255);
        noStroke();
        
        let size = this.size * this.life;
        // Simple star shape
        beginShape();
        for (let i = 0; i < 4; i++) {
          let angle = (i * TWO_PI) / 4;
          let x1 = cos(angle) * size;
          let y1 = sin(angle) * size;
          let x2 = cos(angle + PI/4) * size * 0.4;
          let y2 = sin(angle + PI/4) * size * 0.4;
          vertex(x1, y1);
          vertex(x2, y2);
        }
        endShape(CLOSE);
      } else {
        // Normal particle
        fill(this.color[0], this.color[1], this.color[2], this.life * 255);
        noStroke();
        circle(0, 0, this.size * this.life);
      }
      
      pop();
    }
  }
  
  isDead() {
    return this.life <= 0;
  }
}

// Utility function for line-point distance calculation
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  let A = px - x1;
  let B = py - y1;
  let C = x2 - x1;
  let D = y2 - y1;
  
  let dot = A * C + B * D;
  let lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  let dx = px - xx;
  let dy = py - yy;
  
  return sqrt(dx * dx + dy * dy);
}
