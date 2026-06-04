import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SalaryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsOptional()
  @IsString()
  company_id?: string;

  @ApiPropertyOptional({ description: 'Filter by job role/title' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Minimum years of experience' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_experience?: number;

  @ApiPropertyOptional({ description: 'Maximum years of experience' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_experience?: number;

  @ApiPropertyOptional({
    description: 'Search term for role, company, or city',
  })
  @IsOptional()
  @IsString()
  search?: string;

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
