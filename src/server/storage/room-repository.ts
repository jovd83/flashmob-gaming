/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Room } from '../../shared/types.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

export class RoomRepository {
    public async ensureDataDir(): Promise<void> {
        if (!existsSync(DATA_DIR)) {
            logger.info({ dir: DATA_DIR }, 'Creating data directory');
            mkdirSync(DATA_DIR, { recursive: true });
        }
    }

    public async loadAll(): Promise<Room[]> {
        try {
            if (existsSync(ROOMS_FILE)) {
                const data = await fs.readFile(ROOMS_FILE, 'utf8');
                return JSON.parse(data);
            }
            return [];
        } catch (err) {
            logger.error({ err }, 'Failed to load rooms from disk');
            return [];
        }
    }

    public async saveAll(rooms: Room[]): Promise<void> {
        const tempFile = `${ROOMS_FILE}.tmp`;
        try {
            await fs.writeFile(tempFile, JSON.stringify(rooms, null, 2));
            await fs.rename(tempFile, ROOMS_FILE);
        } catch (err) {
            logger.error({ err }, 'Failed to save rooms to disk');
            throw new Error('Persistence failure', { cause: err });
        }
    }
}
