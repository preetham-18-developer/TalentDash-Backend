import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty({
    example: 'company-uuid',
    description: 'The unique ID of the company making the offer',
  })
  @IsString()
  @IsNotEmpty({ message: 'Company ID is required' })
  company_id: string;

  @ApiProperty({
    example: 'Software Engineer',
    description: 'The offered job role or title',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string;

  @ApiPropertyOptional({
    example: 'L4',
    description: 'The offered career level/grade',
  })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({
    example: 1500000,
    description: 'Offered annual base salary',
  })
  @IsNumber()
  @Min(0, { message: 'Base salary cannot be negative' })
  base_salary: number;

  @ApiPropertyOptional({
    example: 200000,
    description: 'Offered variable bonus amount',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Bonus cannot be negative' })
  bonus?: number;

  @ApiPropertyOptional({
    example: 300000,
    description: 'Offered annual stock/equity compensation value',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Equity cannot be negative' })
  equity?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Value of other benefits (e.g. food/transport allowance)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Benefits value cannot be negative' })
  benefits_value?: number;

  @ApiPropertyOptional({
    example: 'Bengaluru',
    description: 'City of employment',
  })
  @IsOptional()
  @IsString()
  city?: string;

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
    example: true,
    description: 'Whether the candidate negotiated the initial offer',
  })
  @IsOptional()
  @IsBoolean()
  negotiated?: boolean;

  @ApiPropertyOptional({
    example: 1800000,
    description: 'Final accepted total compensation after negotiation',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Final compensation cannot be negative' })
  final_comp?: number;
}
