/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { COLORS } from '../../shared/constants.js';

export const renderBrickBurst = (ctx: CanvasRenderingContext2D, state: any, canvas: HTMLCanvasElement) => {
    // Bricks
    (state.bricks || []).forEach((brick: any) => {
        if (brick.active) {
            ctx.fillStyle = brick.color || '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = brick.color || '#ffffff';
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        }
    });


    // Paddles
    Object.values(state.teams || {}).forEach((team: any) => {
        ctx.fillStyle = team.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = team.color;
        ctx.fillRect(team.paddleX, canvas.height - 30, 100, 10);
    });


    // Balls
    (state.balls || []).forEach((ball: any) => {
        ctx.fillStyle = ball.color || '#ffffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = ball.color || '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.shadowBlur = 0;
};
