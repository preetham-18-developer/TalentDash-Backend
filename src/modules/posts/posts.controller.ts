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
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Community')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new forum post' })
  @ApiResponse({ status: 201, description: 'Post successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@CurrentUser() user: User, @Body() createPostDto: CreatePostDto) {
    return this.postsService.createPost(user.id, createPostDto);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter community posts' })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of posts.',
  })
  findAll(@Query() query: PostQueryDto) {
    return this.postsService.findAllPosts(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific post with its nested comments' })
  @ApiResponse({ status: 200, description: 'Returns post and comments.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOnePost(id);
  }

  @Post(':id/upvote')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upvote a community post' })
  @ApiResponse({ status: 200, description: 'Post upvoted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  upvotePost(@Param('id') id: string) {
    return this.postsService.upvotePost(id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit a new comment on a post' })
  @ApiResponse({ status: 201, description: 'Comment successfully added.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  createComment(
    @CurrentUser() user: User,
    @Param('id') postId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.postsService.createComment(user.id, postId, createCommentDto);
  }

  @Post('comments/:commentId/upvote')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upvote a comment' })
  @ApiResponse({ status: 200, description: 'Comment upvoted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  upvoteComment(@Param('commentId') commentId: string) {
    return this.postsService.upvoteComment(commentId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a post (Author or Admin only)' })
  @ApiResponse({ status: 200, description: 'Post successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.postsService.removePost(user.id, id, user.role);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a comment (Author or Admin only)' })
  @ApiResponse({ status: 200, description: 'Comment successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  removeComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
  ) {
    return this.postsService.removeComment(user.id, commentId, user.role);
  }
}
