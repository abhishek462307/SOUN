import { ExecutionEventLog } from '../models/response';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export class LoggingSystem {
  private logs: ExecutionEventLog[] = [];

  public log(event: ExecutionEventLog): void {
    this.logs.push(event);
    logger.info(`[SOUN EVENT] ${event.name} | ${event.status} | ${event.latency_ms}ms`, { event });
  }

  public error(message: string, meta?: any): void {
    logger.error(message, meta);
  }

  public getLogs(): ExecutionEventLog[] {
    return this.logs;
  }

  public getMetrics() {
    const total = this.logs.length;
    const successes = this.logs.filter(l => l.status === 'success').length;
    const avgLatency = total > 0 ? this.logs.reduce((acc, l) => acc + l.latency_ms, 0) / total : 0;
    
    return {
      success_rate: total > 0 ? successes / total : 0,
      average_latency: avgLatency,
      total_executions: total
    };
  }
}

export const loggingSystem = new LoggingSystem();
