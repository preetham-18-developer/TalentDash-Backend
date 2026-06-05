import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
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
import { RedisModule } from './modules/redis/redis.module';
import { QueueModule } from './modules/queue/queue.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { PostsModule } from './modules/posts/posts.module';
import { SavedItemsModule } from './modules/saved-items/saved-items.module';
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

    // ── Redis & Background Task Queue ──────────────────────────────
    RedisModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          try {
            const url = new URL(redisUrl);
            return {
              connection: {
                host: url.hostname,
                port: parseInt(url.port, 10) || 6379,
                username: url.username || undefined,
                password: url.password || undefined,
              },
            };
          } catch {
            // Fallback if URL parsing fails
          }
        }
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),
    QueueModule,

    // ── Core Features ──────────────────────────────────────────────
    UsersModule,
    AuthModule,
    CompaniesModule,
    LevelsModule,
    SalariesModule,
    ReviewsModule,
    InterviewsModule,
    OffersModule,
    JobsModule,
    PostsModule,
    SavedItemsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*path');
  }
}
