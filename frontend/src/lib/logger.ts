type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  [key: string]: unknown
}

function emit(level: LogLevel, message: string, extra?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  }

  const line = JSON.stringify(entry)

  switch (level) {
    case 'error':
      console.error(line)
      break
    case 'warn':
      console.warn(line)
      break
    default:
      console.log(line)
  }
}

export const logger = {
  info: (message: string, extra?: Record<string, unknown>) => emit('info', message, extra),
  warn: (message: string, extra?: Record<string, unknown>) => emit('warn', message, extra),
  error: (message: string, extra?: Record<string, unknown>) => emit('error', message, extra),
}
