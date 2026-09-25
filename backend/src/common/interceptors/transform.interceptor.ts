import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((res) => {
        // If already formatted, return as-is
        if (res && typeof res === 'object' && 'success' in res && 'statusCode' in res) {
          return res;
        }

        let message = 'Operasi berhasil dilaksanakan';
        let data = res;
        let meta = undefined;

        if (res && typeof res === 'object' && 'data' in res && ('meta' in res || 'message' in res)) {
          data = res.data;
          message = res.message || message;
          meta = res.meta;
        }

        return {
          success: true,
          statusCode,
          message,
          data,
          meta,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
