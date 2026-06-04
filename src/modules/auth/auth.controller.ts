import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserEntity } from '../users/entities/user.entity';

import type { Request, Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered.',
    type: UserEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async register(@Body() registerDto: RegisterDto): Promise<UserEntity> {
    const user = await this.authService.register(registerDto);
    return new UserEntity(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: new UserEntity(result.user),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refresh(
      refreshTokenDto.refresh_token,
    );
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: new UserEntity(result.user),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Log out user and invalidate refresh token session',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refresh_token);
    return {
      message: 'Logged out successfully',
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Google.' })
  async googleAuth() {
    // Initiates the Google OAuth2 flow (handled by passport)
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback URL' })
  @ApiResponse({
    status: 302,
    description: 'Redirects back to frontend application with tokens.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns tokens and user payload directly if no frontend URL is set.',
  })
  async googleAuthCallback(
    @Req()
    req: Request & {
      user: {
        email: string;
        name: string;
        avatar_url: string | null;
        provider: string;
        provider_id: string;
      };
    },
    @Res() res: Response,
  ) {
    const user = await this.authService.validateGoogleUser(req.user);
    const result = await this.authService.generateOAuthResponse(user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (frontendUrl) {
      return res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
      );
    }

    return res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: new UserEntity(result.user),
    });
  }
}
