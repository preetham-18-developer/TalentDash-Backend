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
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import type { User } from '@prisma/client';

@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit a new offer' })
  @ApiResponse({
    status: 201,
    description: 'Offer successfully submitted.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  async create(
    @CurrentUser() user: User,
    @Body() createOfferDto: CreateOfferDto,
  ) {
    const data = await this.offersService.create(user.id, createOfferDto);
    return data;
  }

  @Get()
  @ApiOperation({ summary: 'Get offers for a company with pagination' })
  @ApiQuery({
    name: 'company_id',
    required: true,
    description: 'The company ID',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Offers retrieved successfully.',
  })
  async findByCompany(
    @Query('company_id') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const result = await this.offersService.findByCompany(
      companyId,
      pageNum,
      limitNum,
    );
    return result;
  }
}
