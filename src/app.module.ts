import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { LevelsModule } from './modules/levels/levels.module';
import { SalariesModule } from './modules/salaries/salaries.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { OffersModule } from './modules/offers/offers.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // ── Environment Configuration ──────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── Rate Limiting ──────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => [
        {
          name: 'global',
          ttl: 60000, // 1 minute window
          limit: 100, // max 100 requests per window per IP
        },
      ],
    }),

    // ── Database ───────────────────────────────────────────────────
    PrismaModule,

    // ── Core Features ──────────────────────────────────────────────
    UsersModule,
    AuthModule,
    CompaniesModule,
    LevelsModule,
    SalariesModule,
    ReviewsModule,
    InterviewsModule,
    OffersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*path');
  }
}
