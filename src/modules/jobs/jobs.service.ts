import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobQueryDto } from './dto/job-query.dto';
import { Job, Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('background-tasks') private readonly backgroundQueue: Queue,
  ) {}

  async create(dto: CreateJobDto): Promise<Job> {
    // Verify company exists and is active
    const company = await this.prisma.company.findFirst({
      where: { id: dto.company_id, deleted_at: null },
    });
    if (!company) {
      throw new NotFoundException(
        `Company with ID ${dto.company_id} not found or has been deleted.`,
      );
    }

    const job = await this.prisma.job.create({
      data: {
        company_id: dto.company_id,
        title: dto.title,
        description: dto.description || null,
        location: dto.location || null,
        city: dto.city || null,
        country: dto.country || null,
        is_remote: dto.is_remote ?? false,
        job_type: dto.job_type ?? 'FULL_TIME',
        experience_min: dto.experience_min ?? null,
        experience_max: dto.experience_max ?? null,
        salary_min: dto.salary_min ?? null,
        salary_max: dto.salary_max ?? null,
        currency: dto.currency || 'INR',
        skills: dto.skills || [],
        apply_url: dto.apply_url || null,
      },
    });

    // Queue background skill analysis task
    if (dto.skills && dto.skills.length > 0) {
      try {
        await this.backgroundQueue.add('process-skills', {
          jobId: job.id,
          skills: dto.skills,
        });
      } catch (err) {
        this.logger.error(
          `Failed to queue process-skills task for job ${job.id}:`,
          err,
        );
      }
    }

    return job;
  }

  async findAll(query: JobQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {
      deleted_at: null,
    };

    if (query.company_id) {
      where.company_id = query.company_id;
    }

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.is_remote !== undefined) {
      where.is_remote = query.is_remote;
    }

    if (query.job_type) {
      where.job_type = query.job_type;
    }

    if (query.skills) {
      const skillArray = query.skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (skillArray.length > 0) {
        where.skills = { hasSome: skillArray };
      }
    }

    if (query.search) {
      const searchPattern = query.search;
      where.OR = [
        { title: { contains: searchPattern, mode: 'insensitive' } },
        { description: { contains: searchPattern, mode: 'insensitive' } },
        { skills: { hasSome: [searchPattern] } },
      ];
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
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
          posted_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      jobs,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.prisma.job.findFirst({
      where: { id, deleted_at: null },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            industry: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found.`);
    }

    return job;
  }

  async remove(id: string): Promise<Job> {
    // Check existence first
    const job = await this.prisma.job.findFirst({
      where: { id, deleted_at: null },
    });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found.`);
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_active: false,
      },
    });
  }
}
