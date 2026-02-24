import { CONFIG } from './constants.js';
import { getScale, distance } from './utils.js';

export function checkCollision(obj1, obj2, canvas) {
    const scale = getScale(canvas.width);
    const scaledRadius1 = obj1.radius * scale;
    const scaledRadius2 = obj2.radius * scale;

    let dx = obj1.x - obj2.x;
    let dy = obj1.y - obj2.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    const minDist = scaledRadius1 + scaledRadius2;

    if (dist < minDist) {
        // Correção do script.js: Se a distância for quase zero, aplica um pequeno empurrão aleatório
        if (dist < 0.001) {
            dx = (Math.random() - 0.5) * 0.2;
            dy = (Math.random() - 0.5) * 0.2;
            dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.001) {
                dx = 0.1; dy = 0; dist = 0.1;
            }
        }

        const overlap = minDist - dist;
        const normalX = dx / dist;
        const normalY = dy / dist;

        obj1.x += normalX * overlap * 0.5;
        obj1.y += normalY * overlap * 0.5;
        obj2.x -= normalX * overlap * 0.5;
        obj2.y -= normalY * overlap * 0.5;

        // Recalcular distância após mover
        dx = obj1.x - obj2.x;
        dy = obj1.y - obj2.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 0.001) return; // Evita divisão por zero

        const newNormalX = dx / dist;
        const newNormalY = dy / dist;

        const relativeVx = obj1.vx - obj2.vx;
        const relativeVy = obj1.vy - obj2.vy;
        const dotProduct = relativeVx * newNormalX + relativeVy * newNormalY;

        if (dotProduct < 0) {
            // Aproximação de massa baseada no raio
            const mass1 = scaledRadius1;
            const mass2 = scaledRadius2;
            const impulseMagnitude = (-(1 + CONFIG.BOUNCE_LOSS) * dotProduct) / ((1 / mass1) + (1 / mass2));

            obj1.vx += impulseMagnitude * newNormalX / mass1;
            obj1.vy += impulseMagnitude * newNormalY / mass1;
            obj2.vx -= impulseMagnitude * newNormalX / mass2;
            obj2.vy -= impulseMagnitude * newNormalY / mass2;
        }
    }

    // Prevenção extra de NaN (herdada do seu script.js)
    if (isNaN(obj1.x) || isNaN(obj1.y)) {
        obj1.x = canvas.width / 2 - 20;
        obj1.y = canvas.height / 2;
        obj1.vx = 0; obj1.vy = 0;
    }
    if (isNaN(obj2.x) || isNaN(obj2.y)) {
        obj2.x = canvas.width / 2 + 20;
        obj2.y = canvas.height / 2;
        obj2.vx = 0; obj2.vy = 0;
    }
}

export function applyKick(player, ball, canvas, force = CONFIG.KICK_STRENGTH, targetX = null, targetY = null) {
    const scale = getScale(canvas.width);
    const scaledPlayerRadius = player.radius * scale;
    const scaledBallRadius = ball.radius * scale;
    const kickRange = (scaledPlayerRadius + scaledBallRadius) * CONFIG.KICK_RADIUS_MULTIPLIER;

    const dist = distance(player.x, player.y, ball.x, ball.y);

    if (dist < kickRange) {
        let dirX, dirY;

        if (targetX !== null && targetY !== null) {
            const dX = targetX - player.x;
            const dY = targetY - player.y;
            const mag = Math.sqrt(dX*dX + dY*dY);
            if (mag > 0) {
                dirX = dX / mag;
                dirY = dY / mag;
            } else {
                dirX = 1; dirY = 0;
            }

            // Adiciona uma pequena variação no chute ofensivo da IA
            if (force === CONFIG.OFFENSIVE_KICK_STRENGTH) {
                const angleOffset = (Math.random() - 0.5) * Math.PI * 0.15;
                const currentAngle = Math.atan2(dirY, dirX);
                const newAngle = currentAngle + angleOffset;
                dirX = Math.cos(newAngle);
                dirY = Math.sin(newAngle);
            }
        } else {
            const dX = ball.x - player.x;
            const dY = ball.y - player.y;
            dirX = dX / dist;
            dirY = dY / dist;
        }

        ball.vx = dirX * force;
        ball.vy = dirY * force;
    }
}