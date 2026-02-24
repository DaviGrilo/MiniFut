import { CONFIG } from './constants.js';
import { getScale, distance } from './utils.js';

export class AIController {
    constructor() {
        // Pode adicionar estados aqui no futuro (ex: this.state = 'DEFENDING')
    }

    calculateMove(player, ball, canvas) {
        const scale = getScale(canvas.width);
        
        let targetX = ball.x;
        let targetY = ball.y;
        let shouldKick = false;
        let kickTarget = { x: 0, y: canvas.height / 2 };
        let kickPower = CONFIG.KICK_STRENGTH;

        const distToBall = distance(player.x, player.y, ball.x, ball.y);
        const touchDist = (player.radius + ball.radius) * scale + 2;
        const defensiveLine = canvas.width / 2;

        
        if (ball.x >= defensiveLine) {
            if (distToBall < touchDist) {
                
                if (Math.abs(ball.x - canvas.width) < canvas.width * 0.2 && Math.random() < 0.9) {
                    shouldKick = true;
                    kickPower = CONFIG.CLEARANCE_KICK_STRENGTH;
                } else {
                    targetX = ball.x - (CONFIG.PLAYER_RADIUS * 1.5);
                }
            }
        } 
    
        else {
            if (distToBall < touchDist) {
                if (Math.random() < 0.6) {
                    shouldKick = true;
                    kickPower = CONFIG.OFFENSIVE_KICK_STRENGTH;
                } else {
                    targetX = ball.x + (CONFIG.PLAYER_RADIUS * 1.5);
                }
            }
        }

        targetX = Math.max(0, Math.min(targetX, canvas.width));
        targetY = Math.max(0, Math.min(targetY, canvas.height));

        let vx = 0;
        let vy = 0;

        if (targetX < player.x - 2) vx = -CONFIG.PLAYER_SPEED;
        else if (targetX > player.x + 2) vx = CONFIG.PLAYER_SPEED;

        if (targetY < player.y - 2) vy = -CONFIG.PLAYER_SPEED;
        else if (targetY > player.y + 2) vy = CONFIG.PLAYER_SPEED;

        if (Math.random() < 0.05) {
            vx *= 0.5;
            vy *= 0.5;
        }

        return { vx, vy, shouldKick, kickTarget, kickPower };
    }
}