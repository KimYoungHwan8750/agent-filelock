import { resolve } from 'node:path';
import { DEFAULT_DB_PATH, DEFAULT_PORT } from '../shared/constants.js';

export interface ServerConfig {
  port: number;
  host: string;
  dbPath: string;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT) || DEFAULT_PORT,
    host: process.env.HOST || '0.0.0.0',
    dbPath: process.env.DB_PATH || resolve(process.cwd(), DEFAULT_DB_PATH),
  };
}
