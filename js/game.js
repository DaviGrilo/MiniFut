// ===== GAME STATE =====

const GameState = {
    MENU: "MENU",
    PLAYING: "PLAYING",
    END: "END"
};

let currentState = GameState.MENU;

// ===== GAME VARIABLES =====

let scoreBlue = 0;
let scoreRed = 0;
let gameMode = null;
let timeRemaining = 5 * 60;
let gameTimerInterval;
let animationFrameId;

function startGame(mode) {
    gameMode = mode;

    scoreBlue = 0;
    scoreRed = 0;

    scoreBlueElement.textContent = scoreBlue;
    scoreRedElement.textContent = scoreRed;

    timeRemaining = 5 * 60;
    updateTimerDisplay();
    startTimer();

    ball.reset();
    resetPlayersPosition();

    currentState = GameState.PLAYING;
}

function endGame() {
    currentState = GameState.END;
    clearInterval(gameTimerInterval);
    showEndScreen();
}
