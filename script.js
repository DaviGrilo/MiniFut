const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreBlueElement = document.getElementById('scoreBlue');
const scoreRedElement = document.getElementById('scoreRed');
const restartButton = document.getElementById('restartButton');

const startScreen = document.getElementById('startScreen');
const gameInterface = document.getElementById('gameInterface');
const pvpButton = document.getElementById('pvpButton');
const pvaiButton = document.getElementById('pvaiButton');

const timerElement = document.getElementById('timer');

const PLAYER_RADIUS = 15;
const BALL_RADIUS = 8;
const PLAYER_SPEED = 3;
const FRICTION = 0.98;
const BOUNCE_LOSS = 0.8;
const KICK_STRENGTH = 10;
const KICK_RADIUS_MULTIPLIER = 1.5;
const GOAL_MESSAGE_DURATION = 2000;
const GAME_DURATION_SECONDS = 5 * 60;
const GAME_START_COOLDOWN = 500;

const CLEARANCE_KICK_STRENGTH = 15;
const OFFENSIVE_KICK_STRENGTH = 10;

let scoreBlue = 0;
let scoreRed = 0;
let gameRunning = false;
let gameMode = null;
let goalMessageTimeout = null;
let timeRemaining = GAME_DURATION_SECONDS;
let gameTimerInterval;
let animationFrameId;
let isGoalCooldown = false;
let lastGameStartTimestamp = 0;

const ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    color: '#fff',
    reset: function() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.vx = 0;
        this.vy = 0;
    }
};

function Player(x, y, color, controls, isAI = false) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = PLAYER_RADIUS;
    this.color = color;
    this.controls = controls;
    this.isMoving = false;
    this.isAI = isAI;
}

const player1 = new Player(50, 0, '#4299e1', { up: 'w', down: 's', left: 'a', right: 'd', kick: ' ' }); // Azul (Espaço para chutar)
const player2 = new Player(0, 0, '#e53e3e', { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', kick: 'Enter' }, false); // Vermelho (Enter para chutar, pode ser AI)

const keysPressed = {};
document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
});
document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

function drawField() {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 60 * (canvas.width / 800), 0, Math.PI * 2);
    ctx.stroke();

    const goalAreaWidth = canvas.width * 0.15;
    const goalAreaHeight = canvas.height * 0.6;

    ctx.strokeRect(0, (canvas.height - goalAreaHeight) / 2, goalAreaWidth, goalAreaHeight);
    ctx.strokeRect(canvas.width - goalAreaWidth, (canvas.height - goalAreaHeight) / 2, goalAreaWidth, goalAreaHeight);

    const goalPostWidth = 10 * (canvas.width / 800);
    const goalPostHeight = canvas.height * 0.3;

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, (canvas.height - goalPostHeight) / 2, goalPostWidth, goalPostHeight);
    ctx.fillRect(canvas.width - goalPostWidth, (canvas.height - goalPostHeight) / 2, goalPostWidth, goalPostHeight);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * (canvas.width / 800), 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
}

function drawPlayer(player) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * (canvas.width / 800), 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(player.x + player.vx * 2, player.y + player.vy * 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.closePath();
}

function showGoalMessage(teamColor) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'goal-message';
    messageDiv.textContent = `GOL DO TIME ${teamColor.toUpperCase()}!`;
    document.body.appendChild(messageDiv);

    if (goalMessageTimeout) {
        clearTimeout(goalMessageTimeout);
    }

    goalMessageTimeout = setTimeout(() => {
        messageDiv.remove();
        goalMessageTimeout = null;
        isGoalCooldown = false;
        gameRunning = true;
    }, GOAL_MESSAGE_DURATION);
}

function updatePlayer(player) {
    if (player.isAI && gameMode === 'PvAI') {
        player.isMoving = true;

        let targetX = ball.x;
        let targetY = ball.y;

        const distanceToBall = Math.sqrt(Math.pow(player.x - ball.x, 2) + Math.pow(player.y - ball.y, 2));
        const scaledPlayerRadius = player.radius * (canvas.width / 800);
        const scaledBallRadius = ball.radius * (canvas.width / 800);
        const touchDistance = scaledPlayerRadius + scaledBallRadius + 2;

        const opponentGoalX = 0;
        const opponentGoalY = canvas.height / 2;

        const defensiveZoneX = canvas.width / 2;

        const DRIBBLE_PUSH_DISTANCE = PLAYER_RADIUS * 1.5;
        

        if (ball.x >= defensiveZoneX) {
            if (distanceToBall < touchDistance) {
                const goalDistance = Math.abs(ball.x - canvas.width);
                if (goalDistance < canvas.width * 0.2 && Math.random() < 0.9) {
                    kickBall(player, CLEARANCE_KICK_STRENGTH, opponentGoalX, opponentGoalY);
                    return;
                } else {
                    targetX = ball.x - DRIBBLE_PUSH_DISTANCE;
                    targetY = ball.y;
                }
            } else {
                targetX = ball.x;
                targetY = ball.y;
            }
            
            targetX = Math.max(defensiveZoneX + PLAYER_RADIUS, Math.min(targetX, canvas.width - PLAYER_RADIUS));

        } else {
            if (distanceToBall < touchDistance) {
                if (Math.random() < 0.6) {
                    kickBall(player, OFFENSIVE_KICK_STRENGTH, opponentGoalX, opponentGoalY);
                    return;
                } else {
                    targetX = ball.x + DRIBBLE_PUSH_DISTANCE;
                    targetY = ball.y;
                }
            } else {
                targetX = ball.x;
                targetY = ball.y;
            }
            targetX = Math.max(PLAYER_RADIUS, Math.min(targetX, defensiveZoneX - PLAYER_RADIUS));
        }

        if (targetX < player.x) {
            player.vx = -PLAYER_SPEED;
        } else if (targetX > player.x) {
            player.vx = PLAYER_SPEED;
        } else {
            player.vx = 0;
        }

        if (targetY < player.y) {
            player.vy = -PLAYER_SPEED;
        } else if (targetY > player.y) {
            player.vy = PLAYER_SPEED;
        } else {
            player.vy = 0;
        }

        if (Math.random() < 0.05) {
            player.vx *= (Math.random() * 0.5 + 0.5);
            player.vy *= (Math.random() * 0.5 + 0.5);
        }

    } else {
        player.isMoving = false;
        player.vx = 0;
        player.vy = 0;

        if (keysPressed[player.controls.up]) { player.vy = -PLAYER_SPEED; player.isMoving = true; }
        if (keysPressed[player.controls.down]) { player.vy = PLAYER_SPEED; player.isMoving = true; }
        if (keysPressed[player.controls.left]) { player.vx = -PLAYER_SPEED; player.isMoving = true; }
        if (keysPressed[player.controls.right]) { player.vx = PLAYER_SPEED; player.isMoving = true; }

        if (keysPressed[player.controls.kick]) {
            kickBall(player, KICK_STRENGTH);
        }
    }

    if (!player.isMoving && !player.isAI) {
        player.vx *= FRICTION;
        player.vy *= FRICTION;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
        if (Math.abs(player.vy) < 0.1) player.vy = 0;
    } else if (player.isAI) {
        player.vx *= FRICTION;
        player.vy *= FRICTION;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
        if (Math.abs(player.vy) < 0.1) player.vy = 0;
    }


    player.x += player.vx;
    player.y += player.vy;

    const scaledPlayerRadius = player.radius * (canvas.width / 800);
    if (player.x - scaledPlayerRadius < 0) {
        player.x = scaledPlayerRadius;
        player.vx = 0;
    }
    if (player.x + scaledPlayerRadius > canvas.width) {
        player.x = canvas.width - scaledPlayerRadius;
        player.vx = 0;
    }
    if (player.y - scaledPlayerRadius < 0) {
        player.y = scaledPlayerRadius;
        player.vy = 0;
    }
    if (player.y + scaledPlayerRadius > canvas.height) {
        player.y = canvas.height - scaledPlayerRadius;
        player.vy = 0;
    }
}

function updateBall() {
    ball.x += ball.vx;
    ball.y += ball.vy;

    ball.vx *= FRICTION;
    ball.vy *= FRICTION;
    if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.05) ball.vy = 0;

    const scaledBallRadius = ball.radius * (canvas.width / 800);

    if (ball.y + scaledBallRadius > canvas.height || ball.y - scaledBallRadius < 0) {
        ball.vy *= -BOUNCE_LOSS;
        if (ball.y + scaledBallRadius > canvas.height) ball.y = canvas.height - scaledBallRadius;
        if (ball.y - scaledBallRadius < 0) ball.y = scaledBallRadius;
    }

    const goalPostWidth = 10 * (canvas.width / 800);
    const goalPostHeight = canvas.height * 0.3;
    const goalTop = (canvas.height - goalPostHeight) / 2;
    const goalBottom = goalTop + goalPostHeight;

    if (isGoalCooldown) {
        return;
    }

    let goalScoredThisFrame = false;

    if (ball.x - scaledBallRadius < goalPostWidth && ball.y > goalTop && ball.y < goalBottom) {
        scoreRed++;
        scoreRedElement.textContent = scoreRed;
        showGoalMessage('vermelho');
        goalScoredThisFrame = true;
    }
    else if (ball.x + scaledBallRadius > canvas.width - goalPostWidth && ball.y > goalTop && ball.y < goalBottom) {
        scoreBlue++;
        scoreBlueElement.textContent = scoreBlue;
        showGoalMessage('azul');
        goalScoredThisFrame = true;
    }
    else if (ball.x + scaledBallRadius > canvas.width || ball.x - scaledBallRadius < 0) {
        ball.vx *= -BOUNCE_LOSS;
        if (ball.x + scaledBallRadius > canvas.width) ball.x = canvas.width - scaledBallRadius;
        if (ball.x - scaledBallRadius < 0) ball.x = scaledBallRadius;
    }

    if (goalScoredThisFrame) {
        isGoalCooldown = true;
        gameRunning = false;
        ball.reset();
        resetPlayersPosition();
    }
}

function checkCollision(obj1, obj2) {
    const scaledRadius1 = obj1.radius * (canvas.width / 800);
    const scaledRadius2 = obj2.radius * (canvas.width / 800);

    let dx = obj1.x - obj2.x;
    let dy = obj1.y - obj2.y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    const minDist = scaledRadius1 + scaledRadius2;

    if (distance < minDist) {
        if (distance < 0.001) {
            dx = (Math.random() - 0.5) * 0.2;
            dy = (Math.random() - 0.5) * 0.2;
            distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 0.001) {
                dx = 0.1;
                dy = 0;
                distance = 0.1;
            }
        }

        const overlap = minDist - distance;
        const normalX = dx / distance;
        const normalY = dy / distance;

        obj1.x += normalX * overlap * 0.5;
        obj1.y += normalY * overlap * 0.5;
        obj2.x -= normalX * overlap * 0.5;
        obj2.y -= normalY * overlap * 0.5;

        dx = obj1.x - obj2.x;
        dy = obj1.y - obj2.y;
        distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.001) {
            obj1.x = canvas.width / 2;
            obj1.y = canvas.height / 2 - 20;
            obj1.vx = 0;
            obj1.vy = 0;
            obj2.x = canvas.width / 2;
            obj2.y = canvas.height / 2 + 20;
            obj2.vx = 0;
            obj2.vy = 0;
            return;
        }

        const newNormalX = dx / distance;
        const newNormalY = dy / distance;

        const relativeVx = obj1.vx - obj2.vx;
        const relativeVy = obj1.vy - obj2.vy;
        const dotProduct = relativeVx * newNormalX + relativeVy * newNormalY;

        if (dotProduct < 0) {
            const mass1 = scaledRadius1;
            const mass2 = scaledRadius2;

            const impulseMagnitude = (-(1 + BOUNCE_LOSS) * dotProduct) / ((1 / mass1) + (1 / mass2));

            obj1.vx += impulseMagnitude * newNormalX / mass1;
            obj1.vy += impulseMagnitude * newNormalY / mass1;
            obj2.vx -= impulseMagnitude * newNormalX / mass2;
            obj2.vy -= impulseMagnitude * newNormalY / mass2;
        }
    }

    if (isNaN(obj1.x) || isNaN(obj1.y) || isNaN(obj1.vx) || isNaN(obj1.vy)) {
        console.error(`Objeto 1 (${obj1.color || 'ball'}) tem valores NaN! Resetando.`);
        obj1.x = canvas.width / 2;
        obj1.y = canvas.height / 2 - 20;
        obj1.vx = 0;
        obj1.vy = 0;
    }
    if (isNaN(obj2.x) || isNaN(obj2.y) || isNaN(obj2.vx) || isNaN(obj2.vy)) {
        console.error(`Objeto 2 (${obj2.color || 'ball'}) tem valores NaN! Resetando.`);
        obj2.x = canvas.width / 2;
        obj2.y = canvas.height / 2 + 20;
        obj2.vx = 0;
        obj2.vy = 0;
    }
}

function kickBall(player, force = KICK_STRENGTH, targetX = null, targetY = null) {
    const scaledPlayerRadius = player.radius * (canvas.width / 800);
    const scaledBallRadius = ball.radius * (canvas.width / 800);
    const kickDistance = (scaledPlayerRadius + scaledBallRadius) * KICK_RADIUS_MULTIPLIER;

    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const distanceToBall = Math.sqrt(dx * dx + dy * dy);

    if (distanceToBall < kickDistance) {
        let directionX;
        let directionY;

        if (player.isAI && targetX !== null && targetY !== null) {
            directionX = targetX - player.x;
            directionY = targetY - player.y;

            const dist = Math.sqrt(directionX * directionX + directionY * directionY);
            if (dist > 0) {
                directionX /= dist;
                directionY /= dist;
            }

            if (force === OFFENSIVE_KICK_STRENGTH) {
                const angleOffset = (Math.random() - 0.5) * Math.PI * 0.15;
                const currentAngle = Math.atan2(directionY, directionX);
                const newAngle = currentAngle + angleOffset;
                directionX = Math.cos(newAngle);
                directionY = Math.sin(newAngle);
            }

        } else {
            directionX = dx / distanceToBall;
            directionY = dy / distanceToBall;
        }

        ball.vx = directionX * force;
        ball.vy = directionY * force;
    }
}


function resetPlayersPosition() {
    player1.x = 50 * (canvas.width / 800);
    player1.y = canvas.height / 2;
    player1.vx = 0;
    player1.vy = 0;

    player2.x = canvas.width - (50 * (canvas.width / 800));
    player2.y = canvas.height / 2;
    player2.vx = 0;
    player2.vy = 0;
}

function resizeCanvas() {
    const aspectRatio = 800 / 600;
    let width = window.innerWidth * 0.8;
    let height = width / aspectRatio;

    if (height > window.innerHeight * 0.7) {
        height = window.innerHeight * 0.7;
        width = height * aspectRatio;
    }

    canvas.width = width;
    canvas.height = height;

    ball.reset();
    resetPlayersPosition();

    drawField();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawField();

    if (gameRunning && !isGoalCooldown) {
        updatePlayer(player1);
        updatePlayer(player2);
        updateBall();

        checkCollision(ball, player1);
        checkCollision(ball, player2);
        checkCollision(player1, player2);
    }
    
    drawBall(); 
    drawPlayer(player1);
    drawPlayer(player2);

    animationFrameId = requestAnimationFrame(gameLoop);
}

function animate() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const seconds = (timeRemaining % 60).toString().padStart(2, '0');
    if (timerElement) {
        timerElement.textContent = `${minutes}:${seconds}`;
    }
}

function startTimer() {
    clearInterval(gameTimerInterval);
    updateTimerDisplay();

    gameTimerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(gameTimerInterval);
            gameRunning = false;
            handleGameEnd();
        }
    }, 1000);
}

function startGameForNextRound() {
    ball.reset();
    resetPlayersPosition();
    gameRunning = true;
    isGoalCooldown = false;
}


function handleGameEnd() {
    const existingGoalMessage = document.querySelector('.goal-message');
    if (existingGoalMessage) {
        existingGoalMessage.remove();
    }
    if (goalMessageTimeout) {
        clearTimeout(goalMessageTimeout);
        goalMessageTimeout = null;
    }


    if (gameInterface) {
        gameInterface.classList.add('hidden');
    }
    if (endGameScreen) {
        endGameScreen.classList.remove('hidden');
    }

    let winnerMessage = '';
    if (scoreBlue > scoreRed) {
        winnerMessage = 'Time AZUL Venceu!';
    } else if (scoreRed > scoreBlue) {
        winnerMessage = 'Time VERMELHO Venceu!';
    } else {
        winnerMessage = 'Empate!';
    }
    if (endGameMessage) {
        endGameMessage.textContent = winnerMessage;
    }

    if (playAgainButton) {
        playAgainButton.onclick = () => {
            endGameScreen.classList.add('hidden');
            startScreen.classList.remove('hidden');
        };
        playAgainButton.blur();
    }
}


pvpButton.addEventListener('click', () => {
    gameMode = 'PvP';
    player2.isAI = false;
    startScreen.classList.add('hidden');
    gameInterface.classList.remove('hidden');
    startGame();
    pvpButton.blur();
});

pvaiButton.addEventListener('click', () => {
    gameMode = 'PvAI';
    player2.isAI = true;
    startScreen.classList.add('hidden');
    gameInterface.classList.remove('hidden');
    startGame();
    pvaiButton.blur();
});

function startGame() {
    const now = Date.now();
    if (now - lastGameStartTimestamp < GAME_START_COOLDOWN) {
        return;
    }
    lastGameStartTimestamp = now;

    scoreBlue = 0;
    scoreRed = 0;
    scoreBlueElement.textContent = scoreBlue;
    scoreRedElement.textContent = scoreRed;
    
    timeRemaining = GAME_DURATION_SECONDS;
    startTimer(); 

    startGameForNextRound();
}

restartButton.addEventListener('click', () => {
    startGame();
    restartButton.blur();
});

window.addEventListener('resize', resizeCanvas);
window.onload = function() {
    resizeCanvas();
    animate(); 
};
