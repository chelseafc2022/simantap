import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse();
          const { statusCode } = response;
          const delay = Date.now() - now;
          this.logger.log(
            `[${method}] ${originalUrl} ${statusCode} - ${delay}ms - ${ip} - ${userAgent.slice(0, 40)}`,
          );
        },
        error: (err) => {
          const delay = Date.now() - now;
          this.logger.error(
            `[${method}] ${originalUrl} ERR - ${delay}ms - ${ip} - ${err.message}`,
          );
        },
      }),
    );
  }
}
