import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review, Prisma } from '@prisma/client';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    // Verify company exists
    const company = await this.prisma.company.findFirst({
      where: { id: dto.company_id, deleted_at: null },
    });
    if (!company) {
      throw new NotFoundException(
        `Company with ID ${dto.company_id} not found`,
      );
    }

    const review = await this.prisma.review.create({
      data: {
        company_id: dto.company_id,
        user_id: userId,
        role: dto.role || null,
        city: dto.city || null,
        employment_status: dto.employment_status || null,
        rating: dto.rating,
        work_life_rating: dto.work_life_rating || null,
        culture_rating: dto.culture_rating || null,
        salary_rating: dto.salary_rating || null,
        management_rating: dto.management_rating || null,
        career_rating: dto.career_rating || null,
        title: dto.title || null,
        pros: dto.pros || null,
        cons: dto.cons || null,
        summary: dto.summary || null,
        recommend: dto.recommend ?? null,
        is_verified: false, // Default to false for moderation
        source: 'user_submission',
      },
    });

    // Invalidate company cache
    await this.redisService.del(`company:slug:${company.slug}`);

    return review;
  }

  async findByCompany(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      company_id: companyId,
      deleted_at: null,
    };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
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
      this.prisma.review.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
