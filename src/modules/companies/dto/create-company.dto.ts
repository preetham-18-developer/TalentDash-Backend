import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Google', description: 'Name of the company' })
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  name: string;

  @ApiPropertyOptional({
    example: 'https://logo.com/google.png',
    description: 'Logo URL',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  logo_url?: string;

  @ApiPropertyOptional({
    example: 'https://www.google.com',
    description: 'Website URL',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website URL must be a valid URL' })
  website?: string;

  @ApiPropertyOptional({
    example: 'A technology company...',
    description: 'Company description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Technology',
    description: 'Industry category',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    example: 'Internet Search & Cloud',
    description: 'Sub-industry category',
  })
  @IsOptional()
  @IsString()
  sub_industry?: string;

  @ApiPropertyOptional({
    example: 'Mountain View, CA',
    description: 'Headquarters location',
  })
  @IsOptional()
  @IsString()
  headquarters?: string;

  @ApiPropertyOptional({ example: 1998, description: 'Founded year' })
  @IsOptional()
  @IsInt()
  founded_year?: number;

  @ApiPropertyOptional({
    example: '10000+',
    description: 'Total range of employees',
  })
  @IsOptional()
  @IsString()
  employees_range?: string;

  @ApiPropertyOptional({ example: '$10B+', description: 'Revenue range' })
  @IsOptional()
  @IsString()
  revenue_range?: string;

  @ApiPropertyOptional({ example: 'Sundar Pichai', description: 'CEO name' })
  @IsOptional()
  @IsString()
  ceo?: string;

  @ApiPropertyOptional({
    example: 'https://linkedin.com/company/google',
    description: 'LinkedIn URL',
  })
  @IsOptional()
  @IsUrl({}, { message: 'LinkedIn URL must be a valid URL' })
  linkedin_url?: string;

  @ApiPropertyOptional({
    example: 'https://glassdoor.com/google',
    description: 'Glassdoor URL',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Glassdoor URL must be a valid URL' })
  glassdoor_url?: string;

  @ApiPropertyOptional({ example: true, description: 'Verification status' })
  @IsOptional()
  @IsBoolean()
  is_verified?: boolean;
}
