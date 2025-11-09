import { env } from './env.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
};

const RESET_COLOR = '\x1b[0m';

class Logger {
  private minLevel: number;

  constructor(level: LogLevel = 'info') {
    this.minLevel = LOG_LEVELS[level];
  }

  setLevel(level: LogLevel): void {
    this.minLevel = LOG_LEVELS[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const color = LOG_COLORS[level];

    let formattedMessage = `${color}[${timestamp}] ${levelStr}${RESET_COLOR} ${message}`;

    if (meta !== undefined) {
      formattedMessage += '\n' + JSON.stringify(meta, null, 2);
    }

    return formattedMessage;
  }

  debug(message: string, meta?: unknown): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: unknown): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, error?: Error | unknown, meta?: unknown): void {
    if (this.shouldLog('error')) {
      const errorMeta =
        error instanceof Error
          ? { message: error.message, stack: error.stack, ...((meta as object) || {}) }
          : { error, ...((meta as object) || {}) };

      console.error(this.formatMessage('error', message, errorMeta));
    }
  }
}

// Create singleton logger instance
export const logger = new Logger(env.logLevel);
