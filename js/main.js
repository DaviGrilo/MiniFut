import { CONFIG, COLORS } from './constants.js';
import { getScale } from './utils.js';
import { checkCollision, applyKick } from './physics.js';
import { AIController } from './ai.js';
import { Ball } from './ball.js';
import { Player } from './player.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreBlueEl = document.getElementById('scoreBlue');
const scoreRedEl = document.getElementById('scoreRed');
const timerEl = document.getElementById('timer');

const startScreen = document.getElementById('startScreen');
const gameInterface = document.getElementById('gameInterface');
const endGameScreen = document.getElementById('endGameScreen');
const endGameMessage = document.getElementById('endGameMessage');
const howToPlayModal = document.getElementById('howToPlayModal');

const pvpButton = document.getElementById('pvpButton');
const pvaiButton = document.getElementById('pvaiButton');
const restartButton = document.getElementById('restartButton');
const playAgainButton = document.getElementById('playAgainButton');
const goToMenuButton = document.getElementById('goToMenuButton');
const howToPlayButton = document.getElementById('howToPlayButton');
const closeModalButton = document.getElementById('closeModalButton');

let gameRunning = false;
let isGoalCooldown = false;
let gameMode = null; 
let animationId;
let timerInterval;
let timeRemaining = CONFIG.GAME_DURATION_SECONDS;
let scoreBlue = 0;
let scoreRed = 0;
let lastGameStartTimestamp = 0;

const keys = {};
const ai = new AIController();
const ball = new Ball();
const player1 = new Player(true, COLORS.BLUE_PLAYER, { up: 'w', down: 's', left: 'a', right: 'd', kick: ' ' });
const player2 = new Player(false, COLORS.RED_PLAYER, { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', kick: 'Enter' });

window.addEventListener('keydown', (e) => {

    if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); 
    }
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});


function initGame(mode) {
    gameMode = mode;
    player2.isAI = (mode === 'PvAI');
    
    startScreen.classList.add('hidden');
    gameInterface.classList.remove('hidden');
    startGame();
}

function startGame() {
    const now = Date.now();
    if (now - lastGameStartTimestamp < CONFIG.GAME_START_COOLDOWN) return;
    lastGameStartTimestamp = now;

    scoreBlue = 0;
    scoreRed = 0;
    scoreBlueEl.textContent = '0';
    scoreRedEl.textContent = '0';
    timeRemaining = CONFIG.GAME_DURATION_SECONDS;
    
    isGoalCooldown = false;
    gameRunning = true;

    ball.reset(canvas);
    player1.reset(canvas);
    player2.reset(canvas);
    
    startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameRunning && !isGoalCooldown) {
            timeRemaining--;
            const mins = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
            const secs = (timeRemaining % 60).toString().padStart(2, '0');
            timerEl.textContent = `${mins}:${secs}`;
            
            if (timeRemaining <= 0) endGame();
        }
    }, 1000);
}

function update() {
    if (!gameRunning) return;

    if (!isGoalCooldown) {

        const p1Vx = (keys[player1.controls.left] ? -CONFIG.PLAYER_SPEED : 0) + (keys[player1.controls.right] ? CONFIG.PLAYER_SPEED : 0);
        const p1Vy = (keys[player1.controls.up] ? -CONFIG.PLAYER_SPEED : 0) + (keys[player1.controls.down] ? CONFIG.PLAYER_SPEED : 0);
        player1.update(canvas, p1Vx, p1Vy);
        if (keys[player1.controls.kick]) applyKick(player1, ball, canvas);

        if (player2.isAI) {
            const aiMove = ai.calculateMove(player2, ball, canvas);
            player2.update(canvas, aiMove.vx, aiMove.vy);
            
            if (aiMove.shouldKick) {

                applyKick(player2, ball, canvas, aiMove.kickPower, 0, canvas.height / 2);
            }
        } else {
            const p2Vx = (keys[player2.controls.left] ? -CONFIG.PLAYER_SPEED : 0) + (keys[player2.controls.right] ? CONFIG.PLAYER_SPEED : 0);
            const p2Vy = (keys[player2.controls.up] ? -CONFIG.PLAYER_SPEED : 0) + (keys[player2.controls.down] ? CONFIG.PLAYER_SPEED : 0);
            player2.update(canvas, p2Vx, p2Vy);
            if (keys[player2.controls.kick]) applyKick(player2, ball, canvas);
        }

        ball.update(canvas);

        checkCollision(player1, ball, canvas);
        checkCollision(player2, ball, canvas);
        checkCollision(player1, player2, canvas);

        handleBallBoundaries();
    }
}

function handleBallBoundaries() {
    const scale = getScale(canvas.width);
    const r = ball.radius * scale;
    const goalH = canvas.height * 0.3;
    const goalTop = (canvas.height - goalH) / 2;
    const goalBottom = goalTop + goalH;

    if (ball.x - r < 0) {
        if (ball.y > goalTop && ball.y < goalBottom) {
            scoreRed++;
            scoreRedEl.textContent = scoreRed;
            handleGoal('VERMELHO');
        } else {
            ball.x = r;
            ball.vx *= -CONFIG.BOUNCE_LOSS;
        }
    }

    if (ball.x + r > canvas.width) {
        if (ball.y > goalTop && ball.y < goalBottom) {
            scoreBlue++;
            scoreBlueEl.textContent = scoreBlue;
            handleGoal('AZUL');
        } else {
            ball.x = canvas.width - r;
            ball.vx *= -CONFIG.BOUNCE_LOSS;
        }
    }
}

function handleGoal(team) {
    isGoalCooldown = true;
    
    const msg = document.createElement('div');
    msg.className = 'goal-message';
    msg.textContent = `GOL DO TIME ${team}!`;
    document.body.appendChild(msg);

    ball.vx = 0;
    ball.vy = 0;

    setTimeout(() => {
        msg.remove();
        ball.reset(canvas);
        player1.reset(canvas);
        player2.reset(canvas);
        isGoalCooldown = false;
    }, CONFIG.GOAL_MESSAGE_DURATION);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawField();
    
    player1.draw(ctx, canvas.width);
    player2.draw(ctx, canvas.width);
    ball.draw(ctx, canvas.width);
    
    animationId = requestAnimationFrame(draw);
}

setInterval(update, 1000 / 60);

function drawField() {
    const scale = getScale(canvas.width);
    ctx.strokeStyle = COLORS.FIELD_LINES;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 60 * scale, 0, Math.PI * 2);
    ctx.stroke();

    const areaW = canvas.width * 0.15;
    const areaH = canvas.height * 0.6;
    ctx.strokeRect(0, (canvas.height - areaH)/2, areaW, areaH);
    ctx.strokeRect(canvas.width - areaW, (canvas.height - areaH)/2, areaW, areaH);

    const postW = 10 * scale;
    const postH = canvas.height * 0.3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(0, (canvas.height - postH)/2, postW, postH);
    ctx.fillRect(canvas.width - postW, (canvas.height - postH)/2, postW, postH);
}

function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    gameInterface.classList.add('hidden');
    endGameScreen.classList.remove('hidden');

    let msg = 'Empate!';
    if (scoreBlue > scoreRed) msg = 'Time AZUL Venceu!';
    else if (scoreRed > scoreBlue) msg = 'Time VERMELHO Venceu!';
    endGameMessage.textContent = msg;
}

const attachButtonEvent = (btn, callback) => {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        callback();
    });
};

attachButtonEvent(pvpButton, () => initGame('PvP'));
attachButtonEvent(pvaiButton, () => initGame('PvAI'));
attachButtonEvent(restartButton, () => startGame());
attachButtonEvent(playAgainButton, () => {
    endGameScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});
attachButtonEvent(goToMenuButton, () => {
    endGameScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});
attachButtonEvent(howToPlayButton, () => howToPlayModal.classList.replace('hidden', 'flex'));
attachButtonEvent(closeModalButton, () => howToPlayModal.classList.replace('flex', 'hidden'));

function resize() {
    const aspect = 800 / 600;
    let w = window.innerWidth * 0.95;
    let h = w / aspect;
    
    if (h > window.innerHeight * 0.7) {
        h = window.innerHeight * 0.7;
        w = h * aspect;
    }
    
    canvas.width = w;
    canvas.height = h;
    
    if (!gameRunning) {
        ball.reset(canvas);
        player1.reset(canvas);
        player2.reset(canvas);
    }
}

window.addEventListener('resize', resize);
resize();
draw();