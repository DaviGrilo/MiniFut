import { CONFIG, COLORS } from './constants.js';
import { getScale } from './utils.js';

export class Player {
    constructor(isLeftField, color, controls, isAI = false) {
        this.isLeftField = isLeftField; // Para saber onde dar spawn (true = esquerda)
        this.color = color;
        this.controls = controls;
        this.isAI = isAI;
        
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = CONFIG.PLAYER_RADIUS;
    }

    reset(canvas) {
        const scale = getScale(canvas.width);
        const offset = 50 * scale;
        
        this.y = canvas.height / 2;
        this.vx = 0;
        this.vy = 0;

        if (this.isLeftField) {
            this.x = offset;
        } else {
            this.x = canvas.width - offset;
        }
    }

    // Recebe input externo (do teclado ou da IA)
    update(canvas, inputVx, inputVy) {
        this.vx = inputVx;
        this.vy = inputVy;

        // Aplica atrito se não estiver se movendo ativamente
        if (inputVx === 0 && inputVy === 0) {
            this.vx *= CONFIG.FRICTION;
            this.vy *= CONFIG.FRICTION;
        }
        
        // Zera velocidades residuais
        if (Math.abs(this.vx) < 0.1) this.vx = 0;
        if (Math.abs(this.vy) < 0.1) this.vy = 0;

        this.x += this.vx;
        this.y += this.vy;

        this.checkBoundaries(canvas);
    }

    checkBoundaries(canvas) {
        const scale = getScale(canvas.width);
        const r = this.radius * scale;

        if (this.x - r < 0) { this.x = r; this.vx = 0; }
        if (this.x + r > canvas.width) { this.x = canvas.width - r; this.vx = 0; }
        if (this.y - r < 0) { this.y = r; this.vy = 0; }
        if (this.y + r > canvas.height) { this.y = canvas.height - r; this.vy = 0; }
    }

    draw(ctx, canvasWidth) {
        const scale = getScale(canvasWidth);
        const r = this.radius * scale;

        // Desenha o corpo
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        // Efeito simples de direção/sombra
        ctx.beginPath();
        ctx.arc(this.x + this.vx * 2, this.y + this.vy * 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.PLAYER_SHADOW;
        ctx.fill();
        ctx.closePath();
    }
}