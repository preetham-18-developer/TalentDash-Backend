import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { Level } from '@prisma/client';

@Injectable()
export class LevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLevelDto): Promise<Level> {
    // Verify company exists
    const company = await this.prisma.company.findFirst({
      where: { id: dto.company_id, deleted_at: null },
    });
    if (!company) {
      throw new NotFoundException(
        `Company with ID ${dto.company_id} not found`,
      );
    }

    // Check unique constraint for company_id and title
    const existing = await this.prisma.level.findUnique({
      where: {
        company_id_title: {
          company_id: dto.company_id,
          title: dto.title,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Level with title "${dto.title}" already exists for this company`,
      );
    }

    // Fetch total levels of this company to compute order_index if not provided
    const levelCount = await this.prisma.level.count({
      where: { company_id: dto.company_id },
    });

    return this.prisma.level.create({
      data: {
        company_id: dto.company_id,
        title: dto.title,
        level_number: dto.level_number ?? levelCount + 1,
        subtitle: dto.subtitle || null,
        description: dto.description || null,
        order_index: levelCount,
      },
    });
  }

  async findByCompany(companyId: string): Promise<Level[]> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deleted_at: null },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    return this.prisma.level.findMany({
      where: { company_id: companyId },
      orderBy: { level_number: 'asc' },
    });
  }

  async compare(companyIds: string[]) {
    // Verify companies exist and are not deleted
    const companies = await this.prisma.company.findMany({
      where: {
        id: { in: companyIds },
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo_url: true,
      },
    });

    if (companies.length === 0) {
      return {
        companies: [],
        levels: [],
      };
    }

    const validCompanyIds = companies.map((c) => c.id);

    // Fetch all levels for these companies
    const levels = await this.prisma.level.findMany({
      where: {
        company_id: { in: validCompanyIds },
      },
      orderBy: { level_number: 'asc' },
    });

    // Find all unique level numbers (sorted ascending)
    const levelNumbers = Array.from(
      new Set(
        levels
          .map((l) => l.level_number)
          .filter((n): n is number => n !== null),
      ),
    ).sort((a, b) => a - b);

    // Build comparison grid rows
    const grid = levelNumbers.map((num) => {
      const rowMappings: Record<string, Partial<Level> | null> = {};

      for (const cid of validCompanyIds) {
        // Find level matching level_number for this company
        const matchedLevel = levels.find(
          (l) => l.company_id === cid && l.level_number === num,
        );
        rowMappings[cid] = matchedLevel
          ? {
              id: matchedLevel.id,
              title: matchedLevel.title,
              subtitle: matchedLevel.subtitle,
              description: matchedLevel.description,
            }
          : null;
      }

      return {
        level_number: num,
        mappings: rowMappings,
      };
    });

    return {
      companies,
      levels: grid,
    };
  }
}
