import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveItemDto } from './dto/save-item.dto';
import { SavedItem } from '@prisma/client';

@Injectable()
export class SavedItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, dto: SaveItemDto): Promise<SavedItem> {
    // 1. Verify that the target item exists
    let itemExists = false;
    const itemId = dto.item_id;

    switch (dto.item_type) {
      case 'salary': {
        const salary = await this.prisma.salary.findFirst({
          where: { id: itemId, deleted_at: null },
        });
        itemExists = !!salary;
        break;
      }
      case 'company': {
        const company = await this.prisma.company.findFirst({
          where: { id: itemId, deleted_at: null },
        });
        itemExists = !!company;
        break;
      }
      case 'review': {
        const review = await this.prisma.review.findFirst({
          where: { id: itemId, deleted_at: null },
        });
        itemExists = !!review;
        break;
      }
      case 'job': {
        const job = await this.prisma.job.findFirst({
          where: { id: itemId, deleted_at: null },
        });
        itemExists = !!job;
        break;
      }
      case 'interview': {
        const interview = await this.prisma.interview.findFirst({
          where: { id: itemId, deleted_at: null },
        });
        itemExists = !!interview;
        break;
      }
      default:
        throw new BadRequestException(`Invalid item type: ${dto.item_type}`);
    }

    if (!itemExists) {
      throw new NotFoundException(
        `Target ${dto.item_type} with ID ${dto.item_id} not found or has been deleted.`,
      );
    }

    // 2. Prevent duplicate bookmark creations
    const existing = await this.prisma.savedItem.findUnique({
      where: {
        user_id_item_type_item_id: {
          user_id: userId,
          item_type: dto.item_type,
          item_id: dto.item_id,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.savedItem.create({
      data: {
        user_id: userId,
        item_type: dto.item_type,
        item_id: dto.item_id,
      },
    });
  }

  async unsave(userId: string, id: string): Promise<SavedItem> {
    const savedItem = await this.prisma.savedItem.findUnique({
      where: { id },
    });

    if (!savedItem) {
      throw new NotFoundException(`Saved item with ID ${id} not found.`);
    }

    if (savedItem.user_id !== userId) {
      throw new ForbiddenException('You do not own this saved item.');
    }

    return this.prisma.savedItem.delete({
      where: { id },
    });
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [savedItems, total] = await Promise.all([
      this.prisma.savedItem.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.savedItem.count({
        where: { user_id: userId },
      }),
    ]);

    // Batch resolve items dynamically to prevent N+1 queries
    const salariesIds = savedItems
      .filter((i) => i.item_type === 'salary')
      .map((i) => i.item_id);
    const companiesIds = savedItems
      .filter((i) => i.item_type === 'company')
      .map((i) => i.item_id);
    const reviewsIds = savedItems
      .filter((i) => i.item_type === 'review')
      .map((i) => i.item_id);
    const jobsIds = savedItems
      .filter((i) => i.item_type === 'job')
      .map((i) => i.item_id);
    const interviewsIds = savedItems
      .filter((i) => i.item_type === 'interview')
      .map((i) => i.item_id);

    const [salaries, companies, reviews, jobs, interviews] = await Promise.all([
      salariesIds.length
        ? this.prisma.salary.findMany({
            where: { id: { in: salariesIds }, deleted_at: null },
            include: {
              company: {
                select: { id: true, name: true, slug: true, logo_url: true },
              },
            },
          })
        : [],
      companiesIds.length
        ? this.prisma.company.findMany({
            where: { id: { in: companiesIds }, deleted_at: null },
          })
        : [],
      reviewsIds.length
        ? this.prisma.review.findMany({
            where: { id: { in: reviewsIds }, deleted_at: null },
            include: {
              company: {
                select: { id: true, name: true, slug: true, logo_url: true },
              },
            },
          })
        : [],
      jobsIds.length
        ? this.prisma.job.findMany({
            where: { id: { in: jobsIds }, deleted_at: null },
            include: {
              company: {
                select: { id: true, name: true, slug: true, logo_url: true },
              },
            },
          })
        : [],
      interviewsIds.length
        ? this.prisma.interview.findMany({
            where: { id: { in: interviewsIds }, deleted_at: null },
            include: {
              company: {
                select: { id: true, name: true, slug: true, logo_url: true },
              },
            },
          })
        : [],
    ]);

    const salariesMap = new Map(salaries.map((s) => [s.id, s]));
    const companiesMap = new Map(companies.map((c) => [c.id, c]));
    const reviewsMap = new Map(reviews.map((r) => [r.id, r]));
    const jobsMap = new Map(jobs.map((j) => [j.id, j]));
    const interviewsMap = new Map(interviews.map((i) => [i.id, i]));

    const resolvedItems = savedItems.map((item) => {
      let details: unknown = null;
      if (item.item_type === 'salary') details = salariesMap.get(item.item_id);
      else if (item.item_type === 'company')
        details = companiesMap.get(item.item_id);
      else if (item.item_type === 'review')
        details = reviewsMap.get(item.item_id);
      else if (item.item_type === 'job') details = jobsMap.get(item.item_id);
      else if (item.item_type === 'interview')
        details = interviewsMap.get(item.item_id);

      return {
        id: item.id,
        user_id: item.user_id,
        item_type: item.item_type,
        item_id: item.item_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        details: details || null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      savedItems: resolvedItems,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
