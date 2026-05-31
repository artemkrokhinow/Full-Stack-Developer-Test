import { AsyncLocalStorage } from 'node:async_hooks';

export interface LogContext {
  correlationId: string;
  channelId: string;
}

export const loggerContext = new AsyncLocalStorage<LogContext>();

const maskSensitiveData = (data: unknown): unknown => {
  if (typeof data !== 'object' || data === null) return data;
  
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  const source = data as Record<string, unknown>;
  const masked: Record<string, unknown> = { ...source };
  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('authorization') || lowerKey.includes('secret')) {
      masked[key] = '***REDACTED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }
  return masked;
};

const createEnvelope = (level: string, contextMsg: string, payloadData: unknown = {}, error?: unknown) => {
  const ctx = loggerContext.getStore();
  const environment = process.env.NODE_ENV || 'development';
  
  const payload: Record<string, unknown> = {
    context: contextMsg,
    data: maskSensitiveData(payloadData)
  };

  if (error) {
    if (error instanceof Error) {
      payload.error = error.message;
      payload.stack = error.stack; // Important for debugging
    } else {
      payload.error = String(error);
    }
  }

  return JSON.stringify({
    correlationId: ctx?.correlationId || 'no-correlation-id',
    timestamp: new Date().toISOString(),
    environment,
    channel_id: ctx?.channelId || 'system',
    level,
    payload
  });
};

export const logger = {
  info: (msg: string, data: unknown = {}) => console.log(createEnvelope('info', msg, data)),
  warn: (msg: string, data: unknown = {}) => console.warn(createEnvelope('warn', msg, data)),
  error: (msg: string, err?: unknown, data: unknown = {}) => console.error(createEnvelope('error', msg, data, err)),
  fatal: (msg: string, err?: unknown, data: unknown = {}) => console.error(createEnvelope('fatal', msg, data, err))
};
