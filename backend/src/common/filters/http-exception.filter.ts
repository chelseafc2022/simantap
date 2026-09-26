import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = exception.message;
    let data: any = null;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as any;
      if (Array.isArray(respObj.message)) {
        message = respObj.message.join(', ');
        data = respObj.message;
      } else if (respObj.message) {
        message = respObj.message;
      }
    }

    this.logger.warn(
      `[${request.method}] ${request.url} - ${status} - ${message}`,
    );

    const errorResponse: ApiResponse = {
      success: false,
      statusCode: status,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
