import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { Offer, Prisma } from '@prisma/client';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOfferDto): Promise<Offer> {
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
    const totalComp =
      dto.base_salary +
      (dto.bonus || 0) +
      (dto.equity || 0) +
      (dto.benefits_value || 0);

    // Calculate relative offer score compared to company average total comp for same role
    let offerScore = 70; // Default score
    const agg = await this.prisma.salary.aggregate({
      _avg: {
        total_compensation: true,
      },
      where: {
        company_id: dto.company_id,
        role: { contains: dto.role, mode: 'insensitive' },
        deleted_at: null,
      },
    });

    const averageComp = agg._avg.total_compensation;
    if (averageComp && averageComp > 0) {
      const ratio = totalComp / averageComp;
      if (ratio >= 1.3) {
        offerScore = 95;
      } else if (ratio >= 1.1) {
        offerScore = 85;
      } else if (ratio >= 0.9) {
        offerScore = 70;
      } else if (ratio >= 0.7) {
        offerScore = 50;
      } else {
        offerScore = 30;
      }
    }

    return this.prisma.offer.create({
      data: {
        company_id: dto.company_id,
        user_id: userId,
        role: dto.role,
        level: dto.level || null,
        base_salary: dto.base_salary,
        bonus: dto.bonus || 0,
        equity: dto.equity || 0,
        benefits_value: dto.benefits_value || 0,
        total_comp: totalComp,
        city: dto.city || null,
        country: dto.country || 'India',
        currency: dto.currency || 'INR',
        offer_score: offerScore,
        negotiated: dto.negotiated ?? false,
        final_comp: dto.final_comp || null,
        source: 'user_submission',
      },
    });
  }

  async findByCompany(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: Prisma.OfferWhereInput = {
      company_id: companyId,
      deleted_at: null,
    };

    const [offers, total] = await Promise.all([
      this.prisma.offer.findMany({
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
      this.prisma.offer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      offers,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
