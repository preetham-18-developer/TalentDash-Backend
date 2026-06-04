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
import { InterviewDifficulty, InterviewResult } from '@prisma/client';

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

describe('Transactional Submissions (e2e)', () => {
  let app: INestApplication<App>;
  let userToken: string;
  let companyId: string;

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

    // Log in as standard user to retrieve bearer token
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'user1@example.com',
        password: 'User@123',
      });
    const loginBody = loginRes.body as TestLoginResponse;
    userToken = loginBody.data.accessToken;

    // Retrieve Google company ID
    const companyRes = await request(app.getHttpServer())
      .get('/v1/companies')
      .query({ search: 'Google' });
    const companyBody = companyRes.body as TestCompanyListResponse;
    companyId = companyBody.data.companies[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Salaries Module Submissions', () => {
    it('should submit a salary successfully - POST /v1/salaries', () => {
      return request(app.getHttpServer())
        .post('/v1/salaries')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          company_id: companyId,
          role: 'Software Engineer',
          level: 'L4',
          years_of_experience: 3,
          base_salary: 1500000,
          bonus: 200000,
          equity: 300000,
          city: 'Bengaluru',
          country: 'India',
          employment_type: 'Full-time',
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: {
              id: string;
              total_compensation: number;
              role: string;
            };
          };
          expect(body.success).toBe(true);
          expect(body.data.id).toBeDefined();
          expect(body.data.role).toBe('Software Engineer');
          expect(body.data.total_compensation).toBe(2000000); // 15L base + 2L bonus + 3L equity
        });
    });

    it('should reject salary submission without authentication', () => {
      return request(app.getHttpServer())
        .post('/v1/salaries')
        .send({
          company_id: companyId,
          role: 'Software Engineer',
          base_salary: 1500000,
        })
        .expect(401);
    });

    it('should query salaries with filters - GET /v1/salaries', () => {
      return request(app.getHttpServer())
        .get('/v1/salaries')
        .query({
          company_id: companyId,
          role: 'Software Engineer',
          min_experience: 2,
          max_experience: 5,
        })
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: {
              salaries: Array<{
                id: string;
                role: string;
                years_of_experience: number;
              }>;
              meta: { total: number };
            };
          };
          expect(body.success).toBe(true);
          expect(body.data.salaries.length).toBeGreaterThan(0);
          expect(body.data.salaries[0].role).toBe('Software Engineer');
          expect(body.data.salaries[0].years_of_experience).toBeGreaterThanOrEqual(2);
          expect(body.data.salaries[0].years_of_experience).toBeLessThanOrEqual(5);
        });
    });
  });

  describe('Reviews Module Submissions', () => {
    it('should submit a review successfully - POST /v1/reviews', () => {
      return request(app.getHttpServer())
        .post('/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          company_id: companyId,
          role: 'Software Engineer',
          city: 'Bengaluru',
          employment_status: 'Current',
          rating: 4,
          work_life_rating: 4,
          culture_rating: 5,
          salary_rating: 4,
          management_rating: 3,
          career_rating: 4,
          title: 'Good company with great culture',
          pros: 'Amazing peers and compensation',
          cons: 'Bureaucracy and slow decision making',
          summary: 'Highly recommended',
          recommend: true,
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { id: string; rating: number; title: string };
          };
          expect(body.success).toBe(true);
          expect(body.data.id).toBeDefined();
          expect(body.data.rating).toBe(4);
          expect(body.data.title).toBe('Good company with great culture');
        });
    });

    it('should query reviews for a company - GET /v1/reviews', () => {
      return request(app.getHttpServer())
        .get('/v1/reviews')
        .query({ company_id: companyId })
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: {
              reviews: Array<{ id: string; rating: number; pros: string }>;
            };
          };
          expect(body.success).toBe(true);
          expect(body.data.reviews.length).toBeGreaterThan(0);
          expect(body.data.reviews[0].pros).toBeDefined();
        });
    });
  });

  describe('Interviews Module Submissions', () => {
    it('should submit an interview experience with nested questions - POST /v1/interviews', () => {
      return request(app.getHttpServer())
        .post('/v1/interviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          company_id: companyId,
          role: 'Senior SDE',
          difficulty: InterviewDifficulty.MEDIUM,
          result: InterviewResult.OFFER,
          process: 'System design followed by core JS round.',
          tips: 'Study system design patterns thoroughly.',
          rounds: 2,
          duration_days: 10,
          questions: [
            { question: 'What is event loop in JS?', tags: ['JavaScript', 'Frontend'] },
            { question: 'Design a rate limiter.', tags: ['System Design', 'Backend'] },
          ],
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: {
              id: string;
              role: string;
              questions: Array<{ id: string; question: string; tags: string[] }>;
            };
          };
          expect(body.success).toBe(true);
          expect(body.data.id).toBeDefined();
          expect(body.data.role).toBe('Senior SDE');
          expect(body.data.questions.length).toBe(2);
          expect(body.data.questions[0].question).toBe('What is event loop in JS?');
          expect(body.data.questions[0].tags).toContain('JavaScript');
        });
    });

    it('should query interviews for a company - GET /v1/interviews', () => {
      return request(app.getHttpServer())
        .get('/v1/interviews')
        .query({ company_id: companyId })
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: {
              interviews: Array<{
                id: string;
                role: string;
                questions: Array<{ question: string }>;
              }>;
            };
          };
          expect(body.success).toBe(true);
          expect(body.data.interviews.length).toBeGreaterThan(0);
          expect(body.data.interviews[0].questions.length).toBeGreaterThan(0);
        });
    });
  });

  describe('Offers Module Submissions', () => {
    it('should submit an offer and return score - POST /v1/offers', () => {
      return request(app.getHttpServer())
        .post('/v1/offers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          company_id: companyId,
          role: 'Software Engineer',
          level: 'L4',
          base_salary: 2500000,
          bonus: 300000,
          equity: 400000,
          benefits_value: 50000,
          city: 'Bengaluru',
          country: 'India',
          currency: 'INR',
          negotiated: true,
          final_comp: 3250000,
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: { id: string; total_comp: number; offer_score: number };
          };
          expect(body.success).toBe(true);
          expect(body.data.id).toBeDefined();
          expect(body.data.total_comp).toBe(3250000); // 25L base + 3L bonus + 4L equity + 50k benefits
          expect(body.data.offer_score).toBeDefined();
        });
    });

    it('should query offers for a company - GET /v1/offers', () => {
      return request(app.getHttpServer())
        .get('/v1/offers')
        .query({ company_id: companyId })
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: {
              offers: Array<{ id: string; role: string; total_comp: number }>;
            };
          };
          expect(body.success).toBe(true);
          expect(body.data.offers.length).toBeGreaterThan(0);
        });
    });
  });
});
