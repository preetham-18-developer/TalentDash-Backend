import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  IsEnum,
  IsArray,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType } from '@prisma/client';

export class CreateJobDto {
  @ApiProperty({
    example: 'company-uuid-12345',
    description: 'The unique ID of the company listing the job',
  })
  @IsString()
  @IsNotEmpty({ message: 'Company ID is required' })
  company_id: string;

  @ApiProperty({
    example: 'Senior Software Engineer',
    description: 'The job title',
  })
  @IsString()
  @IsNotEmpty({ message: 'Job title is required' })
  title: string;

  @ApiPropertyOptional({
    example:
      'We are looking for a Senior Backend Engineer proficient in NestJS...',
    description: 'Detailed description of the job posting',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Remote',
    description: 'General location description (e.g. Remote, Hybrid, Onsite)',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: 'Bengaluru',
    description: 'City where the role is based',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'India',
    description: 'Country where the role is based',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Whether the role is fully remote',
  })
  @IsOptional()
  @IsBoolean()
  is_remote?: boolean;

  @ApiPropertyOptional({
    enum: JobType,
    example: JobType.FULL_TIME,
    default: JobType.FULL_TIME,
    description:
      'Employment type: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE',
  })
  @IsOptional()
  @IsEnum(JobType, { message: 'Invalid job type' })
  job_type?: JobType;

  @ApiPropertyOptional({
    example: 3,
    description: 'Minimum years of experience required',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Minimum experience cannot be negative' })
  experience_min?: number;

  @ApiPropertyOptional({
    example: 8,
    description: 'Maximum years of experience preferred',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Maximum experience cannot be negative' })
  experience_max?: number;

  @ApiPropertyOptional({
    example: 1800000,
    description: 'Minimum salary offered per year',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Minimum salary cannot be negative' })
  salary_min?: number;

  @ApiPropertyOptional({
    example: 3000000,
    description: 'Maximum salary offered per year',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Maximum salary cannot be negative' })
  salary_max?: number;

  @ApiPropertyOptional({
    example: 'INR',
    default: 'INR',
    description: 'Currency of the salary offered',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: ['TypeScript', 'NestJS', 'Prisma', 'PostgreSQL'],
    description: 'Skills list required for the job',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    example: 'https://careers.google.com/jobs/1234',
    description: 'External link to apply to the job',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Apply URL must be a valid URL' })
  apply_url?: string;
}
