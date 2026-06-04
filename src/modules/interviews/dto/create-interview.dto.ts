import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InterviewDifficulty, InterviewResult } from '@prisma/client';

export class CreateInterviewQuestionDto {
  @ApiProperty({
    example:
      'Explain the difference between interface and abstract class in TypeScript.',
    description: 'The interview question text',
  })
  @IsString()
  @IsNotEmpty({ message: 'Question text is required' })
  question: string;

  @ApiPropertyOptional({
    example: ['TypeScript', 'OOP'],
    description: 'Tags representing topics covered by this question',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateInterviewDto {
  @ApiProperty({
    example: 'company-uuid',
    description: 'The unique ID of the company',
  })
  @IsString()
  @IsNotEmpty({ message: 'Company ID is required' })
  company_id: string;

  @ApiProperty({
    example: 'Software Engineer',
    description: 'The role or title applied for',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string;

  @ApiProperty({
    enum: InterviewDifficulty,
    example: InterviewDifficulty.MEDIUM,
    description: 'Interview difficulty rating',
  })
  @IsEnum(InterviewDifficulty, { message: 'Invalid interview difficulty' })
  difficulty: InterviewDifficulty;

  @ApiPropertyOptional({
    enum: InterviewResult,
    example: InterviewResult.OFFER,
    description: 'Outcome of the interview',
  })
  @IsOptional()
  @IsEnum(InterviewResult, { message: 'Invalid interview result' })
  result?: InterviewResult;

  @ApiPropertyOptional({
    example: 'Three rounds: 1 coding, 1 system design, 1 HM.',
    description: 'Description of the interview process',
  })
  @IsOptional()
  @IsString()
  process?: string;

  @ApiPropertyOptional({
    example: 'Brush up on system design fundamentals.',
    description: 'Tips for future candidates',
  })
  @IsOptional()
  @IsString()
  tips?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Number of interview rounds',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rounds?: number;

  @ApiPropertyOptional({
    example: 14,
    description: 'Entire interview process duration in days',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration_days?: number;

  @ApiPropertyOptional({
    type: [CreateInterviewQuestionDto],
    description: 'Nested array of interview questions asked during the process',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInterviewQuestionDto)
  questions?: CreateInterviewQuestionDto[];
}
