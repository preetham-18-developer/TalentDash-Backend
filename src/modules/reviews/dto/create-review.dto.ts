import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    example: 'company-uuid',
    description: 'The unique ID of the company being reviewed',
  })
  @IsString()
  @IsNotEmpty({ message: 'Company ID is required' })
  company_id: string;

  @ApiPropertyOptional({
    example: 'Software Engineer',
    description: 'The job title/role of the reviewer',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    example: 'Mumbai',
    description: 'City where the reviewer works/worked',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Current',
    description: 'Employment status (Current or Former)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['Current', 'Former'], {
    message: 'Employment status must be either Current or Former',
  })
  employment_status?: string;

  @ApiProperty({
    example: 4.5,
    description: 'Overall company rating (1 to 5)',
  })
  @IsNumber()
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating: number;

  @ApiPropertyOptional({
    example: 4.0,
    description: 'Work-life balance rating (1 to 5)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  work_life_rating?: number;

  @ApiPropertyOptional({
    example: 5.0,
    description: 'Company culture rating (1 to 5)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  culture_rating?: number;

  @ApiPropertyOptional({
    example: 4.0,
    description: 'Compensation and benefits rating (1 to 5)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  salary_rating?: number;

  @ApiPropertyOptional({
    example: 3.5,
    description: 'Management rating (1 to 5)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  management_rating?: number;

  @ApiPropertyOptional({
    example: 4.0,
    description: 'Career opportunities rating (1 to 5)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  career_rating?: number;

  @ApiPropertyOptional({
    example: 'Great work environment and growth prospects',
    description: 'Short headline/title for the review',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'Good benefits, excellent mentorship, high pay.',
    description: 'Detailed pros/advantages of working at the company',
  })
  @IsOptional()
  @IsString()
  pros?: string;

  @ApiPropertyOptional({
    example: 'Long working hours during crunch cycles, slow processes.',
    description: 'Detailed cons/disadvantages of working at the company',
  })
  @IsOptional()
  @IsString()
  cons?: string;

  @ApiPropertyOptional({
    example: 'Overall it is a fantastic place to grow.',
    description: 'Summary of the reviewer experience',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the reviewer recommends the company',
  })
  @IsOptional()
  @IsBoolean()
  recommend?: boolean;
}
