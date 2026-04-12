/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { z } from 'zod';

export const RoomCreationSchema = z.object({
    name: z.string().min(3).max(50),
    gameType: z.enum(['paddle-battle', 'vipers', 'brick-burst']).default('paddle-battle'),
    palette: z.string().default('cyber-cyan'),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    config: z.record(z.string(), z.any()).optional(),
    teamNames: z.record(z.string(), z.string()).optional()
});

export const LoginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1)
});

export const ConfigUpdateSchema = z.object({
    ballSpeed: z.number().min(1).max(20).optional(),
    accelerationFactor: z.number().min(1).max(2).optional(),
    paddleHeight: z.number().min(20).max(200).optional(),
    speed: z.number().min(1).max(50).optional(),
    gridSize: z.number().min(10).max(100).optional()
});
