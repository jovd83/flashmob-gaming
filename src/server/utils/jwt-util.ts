/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import jwt from 'jsonwebtoken';
import { logger } from './logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mass-gaming-v3-secret-change-this';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    // This is redundant with index.ts but keeps the module safe if imported elsewhere
    throw new Error('JWT_SECRET must be provided in production');
}
const JWT_EXPIRES_IN = '24h';

export interface JWTPayload {
    username: string;
    role: 'admin';
}

export class JWTUtil {
    public static sign(payload: JWTPayload): string {
        try {
            return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        } catch (err) {
            logger.error({ err }, 'Failed to sign JWT');
            throw new Error('Token generation failed', { cause: err });
        }
    }

    public static verify(token: string): JWTPayload | null {
        try {
            return jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch (err) {
            logger.debug({ err }, 'JWT verification failed');
            return null;
        }
    }
}
