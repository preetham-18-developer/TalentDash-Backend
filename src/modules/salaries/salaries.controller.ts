import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SalariesService } from './salaries.service';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { SalaryQueryDto } from './dto/salary-query.dto';
import type { User } from '@prisma/client';

@ApiTags('Salaries')
@Controller('salaries')
export class SalariesController {
  constructor(private readonly salariesService: SalariesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit a new salary' })
  @ApiResponse({
    status: 201,
    description: 'Salary successfully submitted.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  async create(
    @CurrentUser() user: User,
    @Body() createSalaryDto: CreateSalaryDto,
  ) {
    const data = await this.salariesService.create(user.id, createSalaryDto);
    return data;
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter salaries with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Salaries list retrieved successfully.',
  })
  async findAll(@Query() query: SalaryQueryDto) {
    const result = await this.salariesService.findAll(query);
    return result;
  }
}
