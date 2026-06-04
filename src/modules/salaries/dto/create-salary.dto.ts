import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSalaryDto {
  @ApiProperty({
    example: 'google-company-id',
    description: 'The unique ID of the company',
  })
  @IsString()
  @IsNotEmpty({ message: 'Company ID is required' })
  company_id: string;

  @ApiProperty({
    example: 'Software Engineer',
    description: 'The job role or title',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string;

  @ApiPropertyOptional({
    example: 'L4',
    description: 'The level or grade at the company',
  })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Years of professional experience',
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Years of experience cannot be negative' })
  years_of_experience?: number;

  @ApiProperty({
    example: 1200000,
    description: 'Annual base salary amount',
  })
  @IsNumber()
  @Min(0, { message: 'Base salary cannot be negative' })
  base_salary: number;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Annual variable bonus amount',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Bonus cannot be negative' })
  bonus?: number;

  @ApiPropertyOptional({
    example: 200000,
    description: 'Annual stock/equity compensation value',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Equity cannot be negative' })
  equity?: number;

  @ApiPropertyOptional({
    example: 'Bengaluru',
    description: 'City of employment',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Karnataka',
    description: 'State of employment',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 'India',
    default: 'India',
    description: 'Country of employment',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: 'INR',
    default: 'INR',
    description: 'Compensation currency',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: 'Full-time',
    description: 'Employment type (e.g., Full-time, Contract)',
  })
  @IsOptional()
  @IsString()
  employment_type?: string;
}
