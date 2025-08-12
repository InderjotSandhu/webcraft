import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

// Schema for review creation/update
const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(500).optional(),
  isPublic: z.boolean().default(true),
})

// GET /api/marketplace/templates/[templateId]/reviews - Get template reviews
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 10
    const sortBy = searchParams.get('sortBy') || 'newest'

    const skip = (page - 1) * limit

    let orderBy: any = {}
    switch (sortBy) {
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'rating-high':
        orderBy = { rating: 'desc' }
        break
      case 'rating-low':
        orderBy = { rating: 'asc' }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    const [reviews, totalCount, ratingStats] = await Promise.all([
      prisma.templateReview.findMany({
        where: {
          templateId: params.templateId,
          isPublic: true,
        },
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      }),
      prisma.templateReview.count({
        where: {
          templateId: params.templateId,
          isPublic: true,
        },
      }),
      prisma.templateReview.groupBy({
        by: ['rating'],
        where: {
          templateId: params.templateId,
          isPublic: true,
        },
        _count: {
          rating: true,
        },
      }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    // Calculate rating distribution
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    }

    ratingStats.forEach((stat) => {
      ratingDistribution[stat.rating as keyof typeof ratingDistribution] = stat._count.rating
    })

    const avgRating = ratingStats.reduce((acc, stat) => {
      return acc + (stat.rating * stat._count.rating)
    }, 0) / totalCount

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        stats: {
          averageRating: Number(avgRating.toFixed(1)) || 0,
          totalReviews: totalCount,
          distribution: ratingDistribution,
        },
      },
    })
  } catch (error) {
    console.error('Get reviews error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST /api/marketplace/templates/[templateId]/reviews - Create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const data = reviewSchema.parse(await request.json())

    // Check if user already reviewed this template
    const existingReview = await prisma.templateReview.findUnique({
      where: {
        templateId_userId: {
          templateId: params.templateId,
          userId: user.id,
        },
      },
    })

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this template' },
        { status: 409 }
      )
    }

    // Check if template exists
    const template = await prisma.template.findUnique({
      where: { id: params.templateId },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create review
    const review = await prisma.templateReview.create({
      data: {
        templateId: params.templateId,
        userId: user.id,
        rating: data.rating,
        comment: data.comment,
        isPublic: data.isPublic,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Update template rating statistics
    const allReviews = await prisma.templateReview.findMany({
      where: { templateId: params.templateId },
      select: { rating: true },
    })

    const avgRating = allReviews.reduce((acc, review) => acc + review.rating, 0) / allReviews.length
    const totalRatings = allReviews.length

    await prisma.template.update({
      where: { id: params.templateId },
      data: {
        averageRating: Number(avgRating.toFixed(2)),
        totalRatings,
      },
    })

    return NextResponse.json({
      success: true,
      data: review,
      message: 'Review created successfully',
    })
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    )
  }
}

// PUT /api/marketplace/templates/[templateId]/reviews - Update user's review
export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const data = reviewSchema.parse(await request.json())

    // Find existing review
    const existingReview = await prisma.templateReview.findUnique({
      where: {
        templateId_userId: {
          templateId: params.templateId,
          userId: user.id,
        },
      },
    })

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      )
    }

    // Update review
    const updatedReview = await prisma.templateReview.update({
      where: {
        templateId_userId: {
          templateId: params.templateId,
          userId: user.id,
        },
      },
      data: {
        rating: data.rating,
        comment: data.comment,
        isPublic: data.isPublic,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Recalculate template rating statistics
    const allReviews = await prisma.templateReview.findMany({
      where: { templateId: params.templateId },
      select: { rating: true },
    })

    const avgRating = allReviews.reduce((acc, review) => acc + review.rating, 0) / allReviews.length

    await prisma.template.update({
      where: { id: params.templateId },
      data: {
        averageRating: Number(avgRating.toFixed(2)),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedReview,
      message: 'Review updated successfully',
    })
  } catch (error) {
    console.error('Update review error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update review' },
      { status: 500 }
    )
  }
}

// DELETE /api/marketplace/templates/[templateId]/reviews - Delete user's review
export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Find and delete review
    const deletedReview = await prisma.templateReview.delete({
      where: {
        templateId_userId: {
          templateId: params.templateId,
          userId: user.id,
        },
      },
    })

    // Recalculate template rating statistics
    const allReviews = await prisma.templateReview.findMany({
      where: { templateId: params.templateId },
      select: { rating: true },
    })

    const avgRating = allReviews.length > 0 
      ? allReviews.reduce((acc, review) => acc + review.rating, 0) / allReviews.length 
      : null
    
    const totalRatings = allReviews.length

    await prisma.template.update({
      where: { id: params.templateId },
      data: {
        averageRating: avgRating ? Number(avgRating.toFixed(2)) : null,
        totalRatings,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    })
  } catch (error) {
    console.error('Delete review error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
