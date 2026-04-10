/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
export const renderVipers = (ctx: CanvasRenderingContext2D, state: any) => {
    const gs = state.gridSize || 20;
    
    // Draw Food
    if (state.food) {
        ctx.fillStyle = '#ffff00';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffff00';
        ctx.beginPath();
        ctx.arc(state.food.x * gs + gs/2, state.food.y * gs + gs/2, gs/3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw vipers
    Object.values(state.teams || {}).forEach((team: any) => {
        ctx.fillStyle = team.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = team.color;
        team.body.forEach((part: any, i: number) => {
            const alpha = 1 - (i / team.body.length) * 0.5;
            ctx.globalAlpha = alpha;
            ctx.fillRect(part.x * gs + 1, part.y * gs + 1, gs - 2, gs - 2);
        });
        ctx.globalAlpha = 1.0;
    });
    ctx.shadowBlur = 0;
};
