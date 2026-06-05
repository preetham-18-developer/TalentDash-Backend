import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({
    example: 'Salary',
    description: 'Post category (e.g. Salary, Interview, Advice, General)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @ApiProperty({
    example: 'Is L5 at Google Bengaluru really ₹50L base?',
    description: 'The title of the forum post',
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @ApiProperty({
    example:
      'I recently saw some self-reported salary figures for Google L5 SWEs in India and wanted to check if this is normal...',
    description: 'Detailed body of the forum post',
  })
  @IsString()
  @IsNotEmpty({ message: 'Body content is required' })
  body: string;

  @ApiPropertyOptional({
    example: ['google', 'salary', 'bengaluru'],
    description: 'List of tag keywords associated with the post',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
