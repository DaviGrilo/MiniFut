import { CONFIG, COLORS } from './constants.js';
import { getScale } from './utils.js';

export class Ball {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = CONFIG.BALL_RADIUS;
        this.color = COLORS.BALL;
    }

    reset(canvas) {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.vx = 0;
        this.vy = 0;
    }

    update(canvas) {
        this.x += this.vx;
        this.y += this.vy;

        this.vx *= CONFIG.FRICTION;
        this.vy *= CONFIG.FRICTION;

        if (Math.abs(this.vx) < 0.05) this.vx = 0;
        if (Math.abs(this.vy) < 0.05) this.vy = 0;

        const scale = getScale(canvas.width);
        const scaledRadius = this.radius * scale;

        if (this.y - scaledRadius < 0) {
            this.y = scaledRadius;
            this.vy *= -CONFIG.BOUNCE_LOSS;
        } else if (this.y + scaledRadius > canvas.height) {
            this.y = canvas.height - scaledRadius;
            this.vy *= -CONFIG.BOUNCE_LOSS;
        }

    }

    draw(ctx, canvasWidth) {
        const scale = getScale(canvasWidth);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}