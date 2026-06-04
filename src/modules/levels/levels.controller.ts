import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LevelsService } from './levels.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { CompareLevelsQueryDto } from './dto/compare-levels-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Levels')
@Controller('levels')
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a company level mapping (Admin only)' })
  @ApiResponse({ status: 201, description: 'Level successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  @ApiResponse({
    status: 409,
    description: 'Level already exists for this company.',
  })
  create(@Body() createLevelDto: CreateLevelDto) {
    return this.levelsService.create(createLevelDto);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get all levels defined for a company' })
  @ApiResponse({ status: 200, description: 'Returns list of company levels.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.levelsService.findByCompany(companyId);
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare levels across multiple companies' })
  @ApiResponse({ status: 200, description: 'Returns level comparison matrix.' })
  compare(@Query() query: CompareLevelsQueryDto) {
    const ids = query.company_ids
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    return this.levelsService.compare(ids);
  }
}
