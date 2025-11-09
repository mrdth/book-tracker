import { config } from 'dotenv';

// Load environment variables from .env file
config();

interface EnvironmentConfig {
  // Database
  databasePath: string;

  // Hardcover API
  hardcoverApiUrl: string;
  hardcoverApiKey: string;

  // Book Collection
  collectionRoot: string;

  // Server
  port: number;
  nodeEnv: string;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  const level = process.env.LOG_LEVEL?.toLowerCase() || 'info';
  const validLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLevels.includes(level)) {
    console.warn(`Invalid LOG_LEVEL "${level}", defaulting to "info"`);
    return 'info';
  }
  return level as 'debug' | 'info' | 'warn' | 'error';
}

export const env: EnvironmentConfig = {
  databasePath: getEnvVar('DATABASE_PATH', './data/books.db'),
  hardcoverApiUrl: getEnvVar('HARDCOVER_API_URL', 'https://hardcover.app/graphql'),
  hardcoverApiKey: getEnvVar('HARDCOVER_API_KEY'),
  collectionRoot: getEnvVar('COLLECTION_ROOT'),
  port: parseInt(getEnvVar('PORT', '3000'), 10),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  logLevel: getLogLevel(),
};

export function isProduction(): boolean {
  return env.nodeEnv === 'production';
}

export function isDevelopment(): boolean {
  return env.nodeEnv === 'development';
}
