import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyQueryDto } from './dto/company-query.dto';
import { Company, Prisma } from '@prisma/client';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    const existing = await this.prisma.company.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Company with name "${dto.name}" already exists`,
      );
    }

    let slug = this.slugify(dto.name);
    // Double check slug uniqueness
    const slugCollision = await this.prisma.company.findUnique({
      where: { slug },
    });

    if (slugCollision) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    return this.prisma.company.create({
      data: {
        ...dto,
        slug,
      },
    });
  }

  async findAll(query: CompanyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CompanyWhereInput = {
      deleted_at: null,
    };

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.industry) {
      where.industry = {
        equals: query.industry,
        mode: 'insensitive',
      };
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      companies,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findById(id: string): Promise<Company> {
    const company = await this.prisma.company.findFirst({
      where: { id, deleted_at: null },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async findBySlug(slug: string) {
    const cacheKey = `company:slug:${slug}`;
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData) as Record<string, unknown>;
    }

    const company = await this.prisma.company.findFirst({
      where: { slug, deleted_at: null },
    });

    if (!company) {
      throw new NotFoundException(`Company with slug "${slug}" not found`);
    }

    // Compute aggregate statistics
    const [
      salaryAgg,
      reviewAgg,
      salaryCount,
      reviewCount,
      interviewCount,
      jobCount,
    ] = await Promise.all([
      this.prisma.salary.aggregate({
        _avg: {
          total_compensation: true,
          base_salary: true,
        },
        where: { company_id: company.id, deleted_at: null },
      }),
      this.prisma.review.aggregate({
        _avg: {
          rating: true,
          work_life_rating: true,
          culture_rating: true,
          salary_rating: true,
          management_rating: true,
          career_rating: true,
        },
        where: { company_id: company.id, deleted_at: null },
      }),
      this.prisma.salary.count({
        where: { company_id: company.id, deleted_at: null },
      }),
      this.prisma.review.count({
        where: { company_id: company.id, deleted_at: null },
      }),
      this.prisma.interview.count({
        where: { company_id: company.id, deleted_at: null },
      }),
      this.prisma.job.count({
        where: { company_id: company.id, deleted_at: null, is_active: true },
      }),
    ]);

    const result = {
      ...company,
      stats: {
        counts: {
          salaries: salaryCount,
          reviews: reviewCount,
          interviews: interviewCount,
          jobs: jobCount,
        },
        salary: {
          averageTotalComp: salaryAgg._avg.total_compensation || 0,
          averageBaseSalary: salaryAgg._avg.base_salary || 0,
        },
        rating: {
          overall: reviewAgg._avg.rating || 0,
          workLife: reviewAgg._avg.work_life_rating || 0,
          culture: reviewAgg._avg.culture_rating || 0,
          salary: reviewAgg._avg.salary_rating || 0,
          management: reviewAgg._avg.management_rating || 0,
          career: reviewAgg._avg.career_rating || 0,
        },
      },
    };

    // Cache computed stats for 1 hour (3600 seconds)
    await this.redisService.set(cacheKey, JSON.stringify(result), 3600);

    return result;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findById(id);

    if (dto.name && dto.name !== company.name) {
      const existing = await this.prisma.company.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Company with name "${dto.name}" already exists`,
        );
      }
    }

    const data: Prisma.CompanyUpdateInput = { ...dto };
    if (dto.name) {
      let slug = this.slugify(dto.name);
      const slugCollision = await this.prisma.company.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugCollision) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
      }
      data.slug = slug;
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data,
    });

    // Invalidate caches
    await this.redisService.del(`company:slug:${company.slug}`);
    if (updatedCompany.slug !== company.slug) {
      await this.redisService.del(`company:slug:${updatedCompany.slug}`);
    }

    return updatedCompany;
  }

  async remove(id: string): Promise<Company> {
    const company = await this.findById(id);
    const deletedCompany = await this.prisma.company.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    // Invalidate cache
    await this.redisService.del(`company:slug:${company.slug}`);

    return deletedCompany;
  }
}
