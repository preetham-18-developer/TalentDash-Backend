import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { SalaryQueryDto } from './dto/salary-query.dto';
import { Salary, Prisma } from '@prisma/client';

@Injectable()
export class SalariesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSalaryDto): Promise<Salary> {
    // Verify company exists
    const company = await this.prisma.company.findFirst({
      where: { id: dto.company_id, deleted_at: null },
    });
    if (!company) {
      throw new NotFoundException(
        `Company with ID ${dto.company_id} not found`,
      );
    }

    // Calculate total compensation
    const totalComp = dto.base_salary + (dto.bonus || 0) + (dto.equity || 0);

    return this.prisma.salary.create({
      data: {
        company_id: dto.company_id,
        user_id: userId,
        role: dto.role,
        level: dto.level || null,
        years_of_experience: dto.years_of_experience || null,
        base_salary: dto.base_salary,
        bonus: dto.bonus || 0,
        equity: dto.equity || 0,
        total_compensation: totalComp,
        city: dto.city || null,
        state: dto.state || null,
        country: dto.country || 'India',
        currency: dto.currency || 'INR',
        employment_type: dto.employment_type || null,
        is_verified: false, // Default to unverified for admin moderation
        source: 'user_submission',
      },
    });
  }

  async findAll(query: SalaryQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SalaryWhereInput = {
      deleted_at: null,
    };

    if (query.company_id) {
      where.company_id = query.company_id;
    }

    if (query.role) {
      where.role = { contains: query.role, mode: 'insensitive' };
    }

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (
      query.min_experience !== undefined ||
      query.max_experience !== undefined
    ) {
      where.years_of_experience = {};
      if (query.min_experience !== undefined) {
        where.years_of_experience.gte = query.min_experience;
      }
      if (query.max_experience !== undefined) {
        where.years_of_experience.lte = query.max_experience;
      }
    }

    if (query.search) {
      const searchPattern = query.search;
      where.OR = [
        { role: { contains: searchPattern, mode: 'insensitive' } },
        { city: { contains: searchPattern, mode: 'insensitive' } },
        { company: { name: { contains: searchPattern, mode: 'insensitive' } } },
      ];
    }

    const [salaries, total] = await Promise.all([
      this.prisma.salary.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo_url: true,
            },
          },
        },
        orderBy: {
          submitted_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.salary.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      salaries,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
