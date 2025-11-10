/**
 * Development-only logging utilities
 * These will be stripped out in production builds
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const devLog = (...args: any[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

export const devError = (...args: any[]) => {
  if (isDevelopment) {
    console.error(...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

// Keep error logging in production (for error tracking)
export const prodError = console.error.bind(console);











