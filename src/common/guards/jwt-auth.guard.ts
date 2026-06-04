import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add custom authentication logic here if needed
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(typeof err === 'string' ? err : 'Authentication error');
    }
    if (!user) {
      throw new UnauthorizedException(
        'Please authenticate to access this resource',
      );
    }
    return user;
  }
}
