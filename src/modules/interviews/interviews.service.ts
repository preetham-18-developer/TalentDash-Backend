import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { Interview, Prisma } from '@prisma/client';

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateInterviewDto): Promise<Interview> {
    // Verify company exists
    const company = await this.prisma.company.findFirst({
      where: { id: dto.company_id, deleted_at: null },
    });
    if (!company) {
      throw new NotFoundException(
        `Company with ID ${dto.company_id} not found`,
      );
    }

    // Run inside database transaction to ensure question mappings are created atomically
    return this.prisma.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          company_id: dto.company_id,
          user_id: userId,
          role: dto.role,
          difficulty: dto.difficulty,
          result: dto.result || null,
          process: dto.process || null,
          tips: dto.tips || null,
          rounds: dto.rounds || null,
          duration_days: dto.duration_days || null,
          source: 'user_submission',
        },
      });

      if (dto.questions && dto.questions.length > 0) {
        await tx.interviewQuestion.createMany({
          data: dto.questions.map((q) => ({
            interview_id: interview.id,
            question: q.question,
            tags: q.tags || [],
          })),
        });
      }

      return tx.interview.findUniqueOrThrow({
        where: { id: interview.id },
        include: { questions: true },
      });
    });
  }

  async findByCompany(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: Prisma.InterviewWhereInput = {
      company_id: companyId,
      deleted_at: null,
    };

    const [interviews, total] = await Promise.all([
      this.prisma.interview.findMany({
        where,
        include: {
          questions: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: {
          submitted_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.interview.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      interviews,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
