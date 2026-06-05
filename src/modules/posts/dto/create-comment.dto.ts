import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    example:
      'Yes, that base is standard for L5 SWE in Bengaluru. Bonus/equity would be on top of that.',
    description: 'Content of the comment',
  })
  @IsString()
  @IsNotEmpty({ message: 'Comment content cannot be empty' })
  body: string;
}
