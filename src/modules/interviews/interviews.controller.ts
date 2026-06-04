import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import type { User } from '@prisma/client';

@ApiTags('Interviews')
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit a new interview experience' })
  @ApiResponse({
    status: 201,
    description: 'Interview experience successfully submitted.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  async create(
    @CurrentUser() user: User,
    @Body() createInterviewDto: CreateInterviewDto,
  ) {
    const data = await this.interviewsService.create(
      user.id,
      createInterviewDto,
    );
    return data;
  }

  @Get()
  @ApiOperation({
    summary: 'Get interview experiences for a company with pagination',
  })
  @ApiQuery({
    name: 'company_id',
    required: true,
    description: 'The company ID',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Interview experiences retrieved successfully.',
  })
  async findByCompany(
    @Query('company_id') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const result = await this.interviewsService.findByCompany(
      companyId,
      pageNum,
      limitNum,
    );
    return result;
  }
}
