import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

interface TestRegisterResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    password_hash?: string;
  };
}

interface TestLoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
  };
}

interface TestProfileResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
  };
}

interface TestLogoutResponse {
  success: boolean;
  data: {
    message: string;
  };
}

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'password123';
  const testName = 'Test User';

  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
      new ResponseInterceptor(),
    );
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new user successfully - POST /v1/auth/register', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      })
      .expect(201)
      .expect((res) => {
        const body = res.body as TestRegisterResponse;
        expect(body.success).toBe(true);
        expect(body.data.email).toBe(testEmail.toLowerCase());
        expect(body.data.name).toBe(testName);
        expect(body.data.password_hash).toBeUndefined();
      });
  });

  it('should fail to register a user with duplicate email', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      })
      .expect(409);
  });

  it('should login successfully - POST /v1/auth/login', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200)
      .expect((res) => {
        const body = res.body as TestLoginResponse;
        expect(body.success).toBe(true);
        expect(body.data.accessToken).toBeDefined();
        expect(body.data.refreshToken).toBeDefined();
        expect(body.data.user.email).toBe(testEmail.toLowerCase());

        // Save tokens for subsequent tests
        accessToken = body.data.accessToken;
        refreshToken = body.data.refreshToken;
      });
  });

  it('should fail login with incorrect password', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: testEmail,
        password: 'wrongpassword',
      })
      .expect(401);
  });

  it('should retrieve current user profile with JWT - GET /v1/users/me', () => {
    return request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as TestProfileResponse;
        expect(body.success).toBe(true);
        expect(body.data.email).toBe(testEmail.toLowerCase());
        expect(body.data.name).toBe(testName);
      });
  });

  it('should fail to retrieve profile without token', () => {
    return request(app.getHttpServer()).get('/v1/users/me').expect(401);
  });

  it('should rotate/refresh tokens - POST /v1/auth/refresh', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({
        refresh_token: refreshToken,
      })
      .expect(200)
      .expect((res) => {
        const body = res.body as TestLoginResponse;
        expect(body.success).toBe(true);
        expect(body.data.accessToken).toBeDefined();
        expect(body.data.refreshToken).toBeDefined();

        // Update tokens
        accessToken = body.data.accessToken;
        refreshToken = body.data.refreshToken;
      });
  });

  it('should logout user - POST /v1/auth/logout', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        refresh_token: refreshToken,
      })
      .expect(200)
      .expect((res) => {
        const body = res.body as TestLogoutResponse;
        expect(body.success).toBe(true);
      });
  });

  it('should reject refresh requests using the logged-out refresh token', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({
        refresh_token: refreshToken,
      })
      .expect(401);
  });
});
