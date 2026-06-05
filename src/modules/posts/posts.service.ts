import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PostQueryDto, PostSortOption } from './dto/post-query.dto';
import { Post, Comment, UserRole, Prisma } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(userId: string, dto: CreatePostDto): Promise<Post> {
    return this.prisma.post.create({
      data: {
        user_id: userId,
        category: dto.category,
        title: dto.title,
        body: dto.body,
        tags: dto.tags || [],
      },
    });
  }

  async findAllPosts(query: PostQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      deleted_at: null,
    };

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.tag) {
      where.tags = { has: query.tag };
    }

    if (query.search) {
      const searchPattern = query.search;
      where.OR = [
        { title: { contains: searchPattern, mode: 'insensitive' } },
        { body: { contains: searchPattern, mode: 'insensitive' } },
        { tags: { hasSome: [searchPattern] } },
      ];
    }

    let orderBy: Prisma.PostOrderByWithRelationInput = { created_at: 'desc' };
    if (query.sort_by === PostSortOption.UPVOTES) {
      orderBy = { upvotes: 'desc' };
    } else if (query.sort_by === PostSortOption.HOT) {
      // Order by upvotes then views for a simulated hot ranking
      orderBy = { upvotes: 'desc' };
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar_url: true,
              role: true,
            },
          },
          _count: {
            select: { comments: { where: { deleted_at: null } } },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      posts,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOnePost(id: string): Promise<Post> {
    const exists = await this.prisma.post.findFirst({
      where: { id, deleted_at: null },
    });
    if (!exists) {
      throw new NotFoundException(`Post with ID ${id} not found.`);
    }

    const post = await this.prisma.post.update({
      where: { id },
      data: { views: { increment: 1 } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
            role: true,
          },
        },
        comments: {
          where: { deleted_at: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar_url: true,
                role: true,
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

    return post;
  }

  async upvotePost(id: string): Promise<Post> {
    const post = await this.prisma.post.findFirst({
      where: { id, deleted_at: null },
    });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found.`);
    }

    return this.prisma.post.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
    });
  }

  async createComment(
    userId: string,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deleted_at: null },
    });
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found.`);
    }

    return this.prisma.comment.create({
      data: {
        user_id: userId,
        post_id: postId,
        body: dto.body,
      },
    });
  }

  async upvoteComment(commentId: string): Promise<Comment> {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, deleted_at: null },
    });
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { upvotes: { increment: 1 } },
    });
  }

  async removePost(
    userId: string,
    id: string,
    userRole: UserRole,
  ): Promise<Post> {
    const post = await this.prisma.post.findFirst({
      where: { id, deleted_at: null },
    });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found.`);
    }

    if (post.user_id !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You are not authorized to delete this post.',
      );
    }

    return this.prisma.post.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async removeComment(
    userId: string,
    id: string,
    userRole: UserRole,
  ): Promise<Comment> {
    const comment = await this.prisma.comment.findFirst({
      where: { id, deleted_at: null },
    });
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found.`);
    }

    if (comment.user_id !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You are not authorized to delete this comment.',
      );
    }

    return this.prisma.comment.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
