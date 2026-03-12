import { EXTENSION_NAME } from '../constants';

/**
 * Logger utility for consistent logging throughout the extension
 */
export class Logger {
  /**
   * Log an info message
   */
  public static info(message: string, ...args: unknown[]): void {
    console.log(`[${EXTENSION_NAME}] [INFO]`, message, ...args);
  }

  /**
   * Log a warning message
   */
  public static warn(message: string, ...args: unknown[]): void {
    console.warn(`[${EXTENSION_NAME}] [WARN]`, message, ...args);
  }

  /**
   * Log an error message
   */
  public static error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    console.error(`[${EXTENSION_NAME}] [ERROR]`, message, error, ...args);
  }
}
