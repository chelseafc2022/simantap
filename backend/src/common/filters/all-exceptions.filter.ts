import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Terjadi kesalahan internal pada server';

    this.logger.error(
      `Unhandled Exception: [${request.method}] ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const errorResponse: ApiResponse = {
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
