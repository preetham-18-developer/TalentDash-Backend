import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
  Module,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { RedisService } from '../src/modules/redis/redis.service';
import { QueueModule } from '../src/modules/queue/queue.module';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { JobType } from '@prisma/client';

jest.setTimeout(60000);

interface TestLoginResponse {
  success: boolean;
  data: {
    accessToken: string;
  };
}

interface TestCompany {
  id: string;
  name: string;
  slug: string;
}

interface TestCompanyListResponse {
  success: boolean;
  data: {
    companies: TestCompany[];
  };
}

// Custom mock modules to prevent BullMQ connection attempts when Redis is down
@Module({})
class MockBullModule {
  static forRootAsync() {
    return {
      module: MockBullModule,
    };
  }
}

@Module({
  providers: [
    {
      provide: getQueueToken('background-tasks'),
      useValue: {
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
      },
    },
  ],
  exports: [getQueueToken('background-tasks')],
})
class MockQueueModule {}

describe('Upgrades Modules & Cache/Queue (e2e)', () => {
  let app: INestApplication<App>;
  let userToken: string;
  let adminToken: string;
  let companyId: string;
  let companySlug: string;
  let redisService: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(BullModule)
      .useModule(MockBullModule)
      .overrideModule(QueueModule)
      .useModule(MockQueueModule)
      .compile();

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

    redisService = app.get<RedisService>(RedisService);
    // Flush cache to ensure consistent E2E runs
    await redisService.flushAll();

    // Log in as standard user
    const userLoginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'user1@example.com',
        password: 'User@123',
      });
    userToken = (userLoginRes.body as TestLoginResponse).data.accessToken;

    // Log in as admin user
    const adminLoginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'admin@talentdash.com',
        password: 'Admin@123',
      });
    adminToken = (adminLoginRes.body as TestLoginResponse).data.accessToken;

    // Get a seeded company ID (Google)
    const companyRes = await request(app.getHttpServer())
      .get('/v1/companies')
      .query({ search: 'Google' });
    const companyBody = companyRes.body as TestCompanyListResponse;
    companyId = companyBody.data.companies[0].id;
    companySlug = companyBody.data.companies[0].slug;
  });

  afterAll(async () => {
    await redisService.flushAll();
    await app.close();
  });

  describe('Jobs Module', () => {
    let createdJobId: string;

    it('should query jobs publicly with pagination', () => {
      return request(app.getHttpServer())
        .get('/v1/jobs')
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { jobs: any[]; meta: { total: number } };
          };
          expect(body.success).toBe(true);
          expect(body.data.jobs).toBeDefined();
          expect(body.data.meta.total).toBeDefined();
        });
    });

    it('should reject job creation by a regular user - POST /v1/jobs (403)', () => {
      return request(app.getHttpServer())
        .post('/v1/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          company_id: companyId,
          title: 'Unpermitted Job Posting',
          job_type: JobType.FULL_TIME,
        })
        .expect(403);
    });

    it('should permit job creation by an admin user - POST /v1/jobs', () => {
      return request(app.getHttpServer())
        .post('/v1/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_id: companyId,
          title: 'Senior NestJS Developer',
          description: 'Help scale our career intelligence engines.',
          city: 'Bengaluru',
          country: 'India',
          is_remote: true,
          job_type: JobType.FULL_TIME,
          experience_min: 5,
          experience_max: 10,
          salary_min: 2400000,
          salary_max: 3600000,
          skills: ['TypeScript', 'NestJS', 'Redis'],
          apply_url: 'https://careers.google.com/jobs/nestjs',
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { id: string; title: string; is_remote: boolean };
          };
          expect(body.success).toBe(true);
          expect(body.data.id).toBeDefined();
          expect(body.data.title).toBe('Senior NestJS Developer');
          expect(body.data.is_remote).toBe(true);
          createdJobId = body.data.id;
        });
    });

    it('should retrieve job details publicly by ID - GET /v1/jobs/:id', () => {
      return request(app.getHttpServer())
        .get(`/v1/jobs/${createdJobId}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { id: string; title: string; company: { name: string } };
          };
          expect(body.success).toBe(true);
          expect(body.data.id).toBe(createdJobId);
          expect(body.data.company.name).toBe('Google');
        });
    });

    it('should query jobs using search filters', () => {
      return request(app.getHttpServer())
        .get('/v1/jobs')
        .query({ search: 'NestJS', is_remote: true })
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { jobs: { title: string }[] };
          };
          expect(body.success).toBe(true);
          expect(body.data.jobs.length).toBeGreaterThan(0);
          expect(body.data.jobs[0].title).toContain('NestJS');
        });
    });

    it('should soft delete job listing as admin - DELETE /v1/jobs/:id', () => {
      return request(app.getHttpServer())
        .delete(`/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then(() => {
          // Confirm it is no longer returned in public lists or details
          return request(app.getHttpServer())
            .get(`/v1/jobs/${createdJobId}`)
            .expect(404);
        });
    });
  });

  describe('Community / Forum Module', () => {
    let createdPostId: string;

    it('should create a new forum thread - POST /v1/posts', () => {
      return request(app.getHttpServer())
        .post('/v1/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          category: 'Tech Discussion',
          title: 'Why choose NestJS over Express?',
          body: 'NestJS provides modularity, Dependency Injection, and typescript out-of-the-box, making it ideal for microservices and SaaS engines.',
          tags: ['nestjs', 'backend', 'architecture'],
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { id: string; title: string; upvotes: number };
          };
          expect(body.success).toBe(true);
          expect(body.data.id).toBeDefined();
          expect(body.data.title).toBe('Why choose NestJS over Express?');
          expect(body.data.upvotes).toBe(0);
          createdPostId = body.data.id;
        });
    });

    it('should list forum posts matching category filters', () => {
      return request(app.getHttpServer())
        .get('/v1/posts')
        .query({ category: 'Tech Discussion' })
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { posts: any[] };
          };
          expect(body.success).toBe(true);
          expect(body.data.posts.length).toBeGreaterThan(0);
        });
    });

    it('should increment upvotes on upvote trigger - POST /v1/posts/:id/upvote', () => {
      return request(app.getHttpServer())
        .post(`/v1/posts/${createdPostId}/upvote`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { upvotes: number };
          };
          expect(body.success).toBe(true);
          expect(body.data.upvotes).toBe(1);
        });
    });

    it('should add comment to post thread - POST /v1/posts/:id/comments', () => {
      return request(app.getHttpServer())
        .post(`/v1/posts/${createdPostId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          body: 'Totally agree, the DI engine alone makes it worth it!',
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { id: string; body: string; upvotes: number };
          };
          expect(body.success).toBe(true);
          expect(body.data.id).toBeDefined();
          expect(body.data.body).toContain('DI engine');
          expect(body.data.upvotes).toBe(0);
        });
    });

    it('should return post details with comments and increment views - GET /v1/posts/:id', () => {
      return request(app.getHttpServer())
        .get(`/v1/posts/${createdPostId}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { id: string; views: number; comments: { body: string }[] };
          };
          expect(body.success).toBe(true);
          expect(body.data.views).toBeGreaterThan(0);
          expect(body.data.comments.length).toBe(1);
          expect(body.data.comments[0].body).toContain('DI engine');
        });
    });

    it('should delete post thread as author - DELETE /v1/posts/:id', () => {
      return request(app.getHttpServer())
        .delete(`/v1/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('Saved Items Module', () => {
    let bookmarkId: string;

    it('should reject bookmarking a non-existent item (404)', () => {
      return request(app.getHttpServer())
        .post('/v1/saved-items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          item_type: 'company',
          item_id: 'non-existent-company-uuid',
        })
        .expect(404);
    });

    it('should successfully save a company - POST /v1/saved-items', () => {
      return request(app.getHttpServer())
        .post('/v1/saved-items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          item_type: 'company',
          item_id: companyId,
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { id: string; item_type: string; item_id: string };
          };
          expect(body.success).toBe(true);
          expect(body.data.id).toBeDefined();
          expect(body.data.item_type).toBe('company');
          expect(body.data.item_id).toBe(companyId);
          bookmarkId = body.data.id;
        });
    });

    it('should retrieve list of bookmarks resolving details - GET /v1/saved-items', () => {
      return request(app.getHttpServer())
        .get('/v1/saved-items')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { savedItems: { details: { name: string } }[] };
          };
          expect(body.success).toBe(true);
          expect(body.data.savedItems.length).toBeGreaterThan(0);
          expect(body.data.savedItems[0].details).toBeDefined();
          expect(body.data.savedItems[0].details.name).toBe('Google');
        });
    });

    it('should delete a saved item bookmark - DELETE /v1/saved-items/:id', () => {
      return request(app.getHttpServer())
        .delete(`/v1/saved-items/${bookmarkId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('Redis Caching & Queue Integration', () => {
    it('should write to, read from, and invalidate cache for company detail endpoint', async () => {
      // Step 1: Query company detail (fetches from database, caches internally)
      await request(app.getHttpServer())
        .get(`/v1/companies/${companySlug}`)
        .expect(200);

      // Verify that cache key exists
      const cached = await redisService.get(`company:slug:${companySlug}`);
      expect(cached).toBeDefined();
      expect(cached).not.toBeNull();
      const companyObj = JSON.parse(cached!) as { name: string };
      expect(companyObj.name).toBe('Google');

      // Step 2: Trigger invalidation by submitting a new salary for that company
      await request(app.getHttpServer())
        .post('/v1/salaries')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          company_id: companyId,
          role: 'Junior Engineer',
          base_salary: 800000,
          city: 'Hyderabad',
        })
        .expect(201);

      // Confirm cache key was successfully invalidated (deleted)
      const afterInvalidation = await redisService.get(
        `company:slug:${companySlug}`,
      );
      expect(afterInvalidation).toBeNull();
    });

    it('should write to, read from, and invalidate levels comparison grids', async () => {
      // Step 1: Run compare levels endpoint (caches internally)
      await request(app.getHttpServer())
        .get('/v1/levels/compare')
        .query({ company_ids: companyId })
        .expect(200);

      // Verify cached compare patterns exist
      const cacheKey = `levels:compare:${companyId}`;
      const cached = await redisService.get(cacheKey);
      expect(cached).toBeDefined();
      expect(cached).not.toBeNull();

      // Step 2: Trigger invalidation by creating a new level for Google (Admin only)
      const mockLevelTitle = `TestLevel-${Math.random()}`;
      await request(app.getHttpServer())
        .post('/v1/levels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_id: companyId,
          title: mockLevelTitle,
          level_number: 10,
        })
        .expect(201);

      // Confirm the cached grid has been cleared
      const afterInvalidation = await redisService.get(cacheKey);
      expect(afterInvalidation).toBeNull();
    });
  });
});
