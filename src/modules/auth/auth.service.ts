import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { User, AuthProvider } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException(
        'A user with this email address already exists',
      );
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    return this.usersService.create({
      email: dto.email.toLowerCase(),
      password_hash: passwordHash,
      name: dto.name || null,
      role: dto.role || 'USER',
      provider: AuthProvider.EMAIL,
      is_verified: false,
      is_active: true,
    });
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    if (!user.password_hash) {
      throw new UnauthorizedException(
        `This account was created via ${user.provider} sign-in. Please log in using that method.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);
    await this.createSession(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: string;
      }>(refreshToken, {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'your-super-secret-key-min-32-chars-for-refresh-token',
        ),
      });

      const session = await this.prisma.session.findUnique({
        where: { token: refreshToken },
      });

      if (!session || session.expires_at < new Date()) {
        if (session) {
          await this.prisma.session
            .delete({ where: { id: session.id } })
            .catch(() => {});
        }
        throw new UnauthorizedException('Session expired or invalid');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new tokens (Rotate tokens)
      const tokens = await this.generateTokens(user);

      // Remove old session and create a new one (Token rotation)
      await this.prisma.session
        .delete({ where: { id: session.id } })
        .catch(() => {});
      await this.createSession(user.id, tokens.refreshToken);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      };
    } catch (e) {
      const error = e as Error;
      this.logger.warn(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.session
      .delete({
        where: { token: refreshToken },
      })
      .catch(() => {
        // Ignore if session already deleted or not found
      });
  }

  async validateGoogleUser(profile: {
    email: string;
    name: string;
    avatar_url: string | null;
    provider: string;
    provider_id: string;
  }): Promise<User> {
    let user = await this.usersService.findByEmail(profile.email);

    if (user) {
      // Update existing user with Google details if not already present
      if (!user.provider_id || user.provider === AuthProvider.EMAIL) {
        user = await this.usersService.update(user.id, {
          provider: AuthProvider.GOOGLE,
          provider_id: profile.provider_id,
          avatar_url: user.avatar_url || profile.avatar_url,
          is_verified: true, // OAuth emails are verified
        });
      }
    } else {
      // Create new user for Google login
      user = await this.usersService.create({
        email: profile.email.toLowerCase(),
        name: profile.name,
        avatar_url: profile.avatar_url,
        provider: AuthProvider.GOOGLE,
        provider_id: profile.provider_id,
        is_verified: true,
        is_active: true,
        role: 'USER',
      });
    }

    return user;
  }

  async generateOAuthResponse(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const tokens = await this.generateTokens(user);
    await this.createSession(user.id, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>(
          'JWT_SECRET',
          'your-super-secret-key-min-32-chars-for-jwt',
        ),
        expiresIn: this.configService.get<string>(
          'JWT_EXPIRES_IN',
          '7d',
        ) as '7d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'your-super-secret-key-min-32-chars-for-refresh-token',
        ),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '30d',
        ) as '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async createSession(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    // Session expires in 30 days by default (matching JWT_REFRESH_EXPIRES_IN)
    const expiresInDays = 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.session.create({
      data: {
        user_id: userId,
        token: refreshToken,
        expires_at: expiresAt,
      },
    });
  }
}
