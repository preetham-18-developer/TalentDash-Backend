import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PostSortOption {
  LATEST = 'latest',
  UPVOTES = 'upvotes',
  HOT = 'hot',
}

export class PostQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category (e.g. Salary, Interview)',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by a specific tag keyword' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Search term matching title or body content',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: PostSortOption,
    default: PostSortOption.LATEST,
    description:
      'Sort option: latest (by date), upvotes (by popularity), hot (by activity & upvotes)',
  })
  @IsOptional()
  @IsEnum(PostSortOption)
  sort_by?: PostSortOption;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Limit number of items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
