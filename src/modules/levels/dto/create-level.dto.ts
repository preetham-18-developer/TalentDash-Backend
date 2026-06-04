import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLevelDto {
  @ApiProperty({
    example: 'clj9458fg00003b5yqw...',
    description: 'ID of the company',
  })
  @IsString()
  @IsNotEmpty({ message: 'Company ID is required' })
  company_id: string;

  @ApiProperty({ example: 'L5', description: 'Title of the level' })
  @IsString()
  @IsNotEmpty({ message: 'Level title is required' })
  title: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Normalized level equivalence number (lower is junior)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  level_number?: number;

  @ApiPropertyOptional({
    example: 'Senior Software Engineer',
    description: 'Subtitle or standard title mapping',
  })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({
    example: 'Equivalent to senior IC role...',
    description: 'Description of the level',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
