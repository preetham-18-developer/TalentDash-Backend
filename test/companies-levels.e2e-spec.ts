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

interface TestCompany {
  id: string;
  name: string;
  slug: string;
  industry?: string;
}

interface TestCompanyListResponse {
  success: boolean;
  data: {
    companies: TestCompany[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

interface TestCompanyDetailResponse {
  success: boolean;
  data: TestCompany & {
    stats: {
      counts: {
        salaries: number;
        reviews: number;
        interviews: number;
        jobs: number;
      };
      salary: { averageTotalComp: number; averageBaseSalary: number };
      rating: {
        overall: number;
        workLife: number;
        culture: number;
        salary: number;
        management: number;
        career: number;
      };
    };
  };
}

interface TestLevel {
  id: string;
  title: string;
  subtitle?: string;
  level_number: number;
}

interface TestLevelListResponse {
  success: boolean;
  data: TestLevel[];
}

interface TestLevelCompareResponse {
  success: boolean;
  data: {
    companies: { id: string; name: string; slug: string }[];
    levels: {
      level_number: number;
      mappings: Record<string, { id: string; title: string } | null>;
    }[];
  };
}

interface TestLoginResponse {
  success: boolean;
  data: {
    accessToken: string;
  };
}

describe('Companies & Levels (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let createdCompanyId: string;
  let googleCompanyId: string;
  let microsoftCompanyId: string;

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

    // Log in as the seeded admin to retrieve credentials for mutated calls
    const res = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: 'admin@talentdash.com',
      password: 'Admin@123',
    });
    const body = res.body as TestLoginResponse;
    adminToken = body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Public Company Queries', () => {
    it('should search and list companies with pagination - GET /v1/companies', () => {
      return request(app.getHttpServer())
        .get('/v1/companies')
        .query({ search: 'Google' })
        .expect(200)
        .expect((res) => {
          const body = res.body as TestCompanyListResponse;
          expect(body.success).toBe(true);
          expect(body.data.companies.length).toBeGreaterThan(0);
          expect(body.data.companies[0].name).toBe('Google');
          googleCompanyId = body.data.companies[0].id;
        });
    });

    it('should retrieve second company for level comparisons', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/companies')
        .query({ search: 'Microsoft' });
      const body = res.body as TestCompanyListResponse;
      microsoftCompanyId = body.data.companies[0].id;
    });

    it('should get detailed company data and stats by slug - GET /v1/companies/:slug', () => {
      return request(app.getHttpServer())
        .get('/v1/companies/google')
        .expect(200)
        .expect((res) => {
          const body = res.body as TestCompanyDetailResponse;
          expect(body.success).toBe(true);
          expect(body.data.slug).toBe('google');
          expect(body.data.stats).toBeDefined();
          expect(body.data.stats.counts.salaries).toBeGreaterThan(0);
          expect(body.data.stats.salary.averageTotalComp).toBeGreaterThan(0);
        });
    });

    it('should return 404 for non-existent company slug', () => {
      return request(app.getHttpServer())
        .get('/v1/companies/non-existent-company')
        .expect(404);
    });
  });

  describe('Public Levels Queries', () => {
    it('should list all levels defined for a company - GET /v1/levels/company/:companyId', () => {
      return request(app.getHttpServer())
        .get(`/v1/levels/company/${googleCompanyId}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as TestLevelListResponse;
          expect(body.success).toBe(true);
          expect(body.data.length).toBeGreaterThan(0);
          expect(body.data[0].title).toBeDefined();
        });
    });

    it('should generate aligned level comparison matrix - GET /v1/levels/compare', () => {
      return request(app.getHttpServer())
        .get('/v1/levels/compare')
        .query({ company_ids: `${googleCompanyId},${microsoftCompanyId}` })
        .expect(200)
        .expect((res) => {
          const body = res.body as TestLevelCompareResponse;
          expect(body.success).toBe(true);
          expect(body.data.companies.length).toBe(2);
          expect(body.data.levels.length).toBeGreaterThan(0);
          expect(body.data.levels[0].mappings).toBeDefined();
        });
    });
  });

  describe('Admin Actions (Create/Update/Delete)', () => {
    it('should block non-admins from creating a company', () => {
      return request(app.getHttpServer())
        .post('/v1/companies')
        .send({
          name: 'BlockTech',
          industry: 'Security',
        })
        .expect(401); // Unauthorized
    });

    it('should allow admins to create a company - POST /v1/companies', () => {
      return request(app.getHttpServer())
        .post('/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'TalentDash Inc',
          industry: 'Software',
          website: 'https://talentdash.com',
          headquarters: 'Bengaluru, India',
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as { success: boolean; data: TestCompany };
          expect(body.success).toBe(true);
          expect(body.data.name).toBe('TalentDash Inc');
          expect(body.data.slug).toBe('talentdash-inc');
          createdCompanyId = body.data.id;
        });
    });

    it('should allow admins to map levels to a company - POST /v1/levels', () => {
      return request(app.getHttpServer())
        .post('/v1/levels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_id: createdCompanyId,
          title: 'T1',
          level_number: 1,
          subtitle: 'Associate',
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as { success: boolean; data: TestLevel };
          expect(body.success).toBe(true);
          expect(body.data.title).toBe('T1');
          expect(body.data.level_number).toBe(1);
        });
    });

    it('should allow admins to update a company - PATCH /v1/companies/:id', () => {
      return request(app.getHttpServer())
        .patch(`/v1/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Platform for salaries and review data.',
        })
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success: boolean;
            data: TestCompany & { description: string };
          };
          expect(body.success).toBe(true);
          expect(body.data.description).toBe(
            'Platform for salaries and review data.',
          );
        });
    });

    it('should allow admins to delete a company - DELETE /v1/companies/:id', () => {
      return request(app.getHttpServer())
        .delete(`/v1/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as { success: boolean };
          expect(body.success).toBe(true);
        });
    });

    it('should verify deleted company is no longer returned in public lists', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/companies')
        .query({ search: 'TalentDash Inc' });
      const body = res.body as TestCompanyListResponse;
      expect(body.data.companies.length).toBe(0);
    });
  });
});
