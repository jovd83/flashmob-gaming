/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { COLORS, PADDLE_OFFSET } from '../../shared/constants.js';

export const renderPaddleBattle = (ctx: CanvasRenderingContext2D, state: any, canvas: HTMLCanvasElement) => {
    // Center line
    ctx.strokeStyle = COLORS.CENTER_LINE;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // PADDLES
    ctx.shadowBlur = 15;
    ctx.fillStyle = state.teams.left.color;
    ctx.shadowColor = state.teams.left.color;
    ctx.fillRect(PADDLE_OFFSET, state.teams.left.paddleY, state.teams.left.paddleWidth, state.teams.left.paddleHeight);
    
    ctx.fillStyle = state.teams.right.color;
    ctx.shadowColor = state.teams.right.color;
    ctx.fillRect(canvas.width - PADDLE_OFFSET - state.teams.right.paddleWidth, state.teams.right.paddleY, state.teams.right.paddleWidth, state.teams.right.paddleHeight);

    // BALL
    ctx.fillStyle = COLORS.BALL;
    ctx.shadowColor = COLORS.BALL;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
};
