import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompareLevelsQueryDto {
  @ApiProperty({
    example: 'google-id,microsoft-id',
    description: 'Comma-separated list of company IDs to compare',
  })
  @IsString()
  @IsNotEmpty({ message: 'At least one company ID is required' })
  company_ids: string;
}
