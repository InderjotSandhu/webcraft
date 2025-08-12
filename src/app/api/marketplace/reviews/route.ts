import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const reviewSchema = z.object({
  templateId: z.string().cuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { templateId, rating, comment } = reviewSchema.parse(await request.json());

    // Check if template exists and is available
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        isPublic: true,
        isActive: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found or unavailable' },
        { status: 404 }
      );
    }

    // Check if user has already reviewed this template
    const existingReview = await prisma.templateReview.findFirst({
      where: {
        userId: user.id,
        templateId: templateId,
      },
    });

    if (existingReview) {
      // Update existing review
      const updatedReview = await prisma.templateReview.update({
        where: {
          id: existingReview.id,
        },
        data: {
          rating,
          comment: comment || existingReview.comment,
        },
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });

      // Recalculate template average rating
      await updateTemplateRating(templateId);

      return NextResponse.json({
        success: true,
        data: updatedReview,
        message: 'Review updated successfully',
      });
    } else {
      // Create new review
      const review = await prisma.templateReview.create({
        data: {
          userId: user.id,
          templateId: templateId,
          rating,
          comment: comment || '',
        },
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });

      // Update template rating statistics
      await updateTemplateRating(templateId);

      return NextResponse.json({
        success: true,
        data: review,
        message: 'Review submitted successfully',
      });
    }

  } catch (error) {
    console.error('Template review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}

// GET /api/marketplace/reviews - Get reviews for a template or user's reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!templateId && !userId) {
      return NextResponse.json(
        { success: false, error: 'templateId or userId parameter required' },
        { status: 400 }
      );
    }

    const where: any = {};
    
    if (templateId) {
      where.templateId = templateId;
    }
    
    if (userId) {
      where.userId = userId;
    }

    const [reviews, totalCount] = await Promise.all([
      prisma.templateReview.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
          template: templateId ? undefined : {
            select: {
              name: true,
              previewImage: true,
              category: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.templateReview.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// DELETE /api/marketplace/reviews - Delete a review
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'reviewId parameter required' },
        { status: 400 }
      );
    }

    // Check if review exists and belongs to user
    const review = await prisma.templateReview.findFirst({
      where: {
        id: reviewId,
        userId: user.id,
      },
    });

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete the review
    await prisma.templateReview.delete({
      where: {
        id: reviewId,
      },
    });

    // Update template rating statistics
    await updateTemplateRating(review.templateId);

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });

  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}

// Helper function to update template rating statistics
async function updateTemplateRating(templateId: string) {
  const reviews = await prisma.templateReview.findMany({
    where: { templateId },
    select: { rating: true },
  });

  if (reviews.length === 0) {
    await prisma.template.update({
      where: { id: templateId },
      data: {
        averageRating: 0,
        totalRatings: 0,
      },
    });
    return;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  await prisma.template.update({
    where: { id: templateId },
    data: {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalRatings: reviews.length,
    },
  });
}
