import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SavedItemsService } from './saved-items.service';
import { SaveItemDto } from './dto/save-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Saved Items')
@Controller('saved-items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class SavedItemsController {
  constructor(private readonly savedItemsService: SavedItemsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Save (bookmark) an item (salary, company, review, job, interview)',
  })
  @ApiResponse({ status: 201, description: 'Item successfully saved.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Target item not found.' })
  save(@CurrentUser() user: User, @Body() saveItemDto: SaveItemDto) {
    return this.savedItemsService.save(user.id, saveItemDto);
  }

  @Get()
  @ApiOperation({
    summary: "Get all current user's saved items with details resolved",
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: "Returns list of user's saved items with full details.",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.savedItemsService.findAll(user.id, pageNum, limitNum);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unsave (delete) a bookmarked item by its saved item ID',
  })
  @ApiResponse({ status: 200, description: 'Item successfully unsaved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (item not owned by user).',
  })
  @ApiResponse({ status: 404, description: 'Saved item not found.' })
  unsave(@CurrentUser() user: User, @Param('id') id: string) {
    return this.savedItemsService.unsave(user.id, id);
  }
}
