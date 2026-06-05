import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveItemDto {
  @ApiProperty({
    example: 'job',
    description:
      'Type of item being saved: salary, company, review, job, or interview',
  })
  @IsString()
  @IsNotEmpty({ message: 'Item type is required' })
  @IsIn(['salary', 'company', 'review', 'job', 'interview'], {
    message:
      'Item type must be one of: salary, company, review, job, interview',
  })
  item_type: string;

  @ApiProperty({
    example: 'job-uuid-12345',
    description: 'The unique database ID of the item being saved',
  })
  @IsString()
  @IsNotEmpty({ message: 'Item ID is required' })
  item_id: string;
}
