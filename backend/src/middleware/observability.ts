import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { PassThrough } from 'stream';
import { logger, loggerContext } from '../utils/logger';

interface Metrics {
  totalRequests: number;
  totalErrors: number;
  avgResponseTimeMs: number;
  uptimeSeconds: number;
}

let totalRequests = 0;
let totalErrors = 0;
let totalResponseTime = 0;

export const observabilityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract or generate Correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  
  // Set the Correlation ID in the response headers immediately
  res.setHeader('X-Correlation-ID', correlationId);

  // Wrap the entire request lifecycle in AsyncLocalStorage context
  loggerContext.run({ correlationId, channelId: 'express-server' }, () => {
    
    totalRequests++;

    // Log incoming request
    logger.info(`Incoming ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      body: req.body, // Will be redacted automatically by logger
      query: req.query
    });

    const start = process.hrtime();
    let bytesSent = 0;

    // Use PassThrough stream to capture bytes sent
    const originalWrite = res.write;
    const originalEnd = res.end;

    const passthrough = new PassThrough();
    passthrough.on('data', (chunk) => {
      bytesSent += chunk.length;
    });

    res.write = function (this: Response, chunk: unknown, encoding?: unknown, callback?: unknown) {
      if (chunk) passthrough.write(chunk as string | Buffer);
      return originalWrite.call(this, chunk as string | Uint8Array, encoding as BufferEncoding, callback as (error: Error | null | undefined) => void);
    } as typeof res.write;

    res.end = function (this: Response, chunk?: unknown, encoding?: unknown, callback?: unknown) {
      if (chunk && typeof chunk !== 'function') passthrough.end(chunk as string | Buffer);
      return originalEnd.call(this, chunk as string | Uint8Array, encoding as BufferEncoding, callback as () => void);
    } as typeof res.end;

    res.on('finish', () => {
      const diff = process.hrtime(start);
      const timeMs = (diff[0] * 1e9 + diff[1]) / 1e6;
      
      totalResponseTime += timeMs;
      if (res.statusCode >= 400) {
        totalErrors++;
      }

      logger.info(`Outgoing Response ${req.method} ${req.url} - ${res.statusCode}`, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        timeMs: timeMs.toFixed(2),
        bytesSent
      });
    });

    next();
  });
};

export function getMetrics(): Metrics {
  return {
    totalRequests,
    totalErrors,
    avgResponseTimeMs: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0,
    uptimeSeconds: Math.round(process.uptime())
  };
}
