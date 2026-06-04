import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(`[${request.method}] ${request.url} — ${duration}ms`);
      }),
      map((data: unknown) => {
        // If the handler already returned a shaped response with { data, meta }, preserve it
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          return {
            success: true,
            data: (data as { data: T }).data,
            meta: (data as { meta: Record<string, unknown> }).meta,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        return {
          success: true,
          data: data as T,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
