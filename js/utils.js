// Retorna o fator de escala baseado na largura atual do canvas
// A referência original era 800px de largura
export function getScale(canvasWidth) {
    return canvasWidth / 800;
}

export function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function limitValue(val, min, max) {
    return Math.max(min, Math.min(val, max));
}