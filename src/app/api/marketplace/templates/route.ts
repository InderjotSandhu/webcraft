import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

// Schema for marketplace template queries
const marketplaceQuerySchema = z.object({
  category: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
  sortBy: z.enum(['popular', 'newest', 'rating', 'price']).default('popular'),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  isPremium: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(12),
})

// GET /api/marketplace/templates - Get marketplace templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = marketplaceQuerySchema.parse({
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy') || 'popular',
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      isPremium: searchParams.get('isPremium') ? searchParams.get('isPremium') === 'true' : undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 12,
    })

    // Build where clause
    const where: any = {
      isPublic: true,
      isActive: true,
    }

    if (query.category) {
      where.category = query.category
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { tags: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    if (query.isPremium !== undefined) {
      where.isPremium = query.isPremium
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {}
      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice
      }
    }

    // Build orderBy clause
    let orderBy: any = {}
    switch (query.sortBy) {
      case 'popular':
        orderBy = { downloads: 'desc' }
        break
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'rating':
        orderBy = { averageRating: 'desc' }
        break
      case 'price':
        orderBy = { price: 'asc' }
        break
      default:
        orderBy = { downloads: 'desc' }
    }

    const skip = (query.page - 1) * query.limit

    const [templates, totalCount] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              purchases: true,
              favorites: true,
              projects: true,
            },
          },
        },
      }),
      prisma.template.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / query.limit)

    return NextResponse.json({
      success: true,
      data: {
        templates,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: totalCount,
          pages: totalPages,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1,
        },
      },
    })
  } catch (error) {
    console.error('Marketplace templates error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch marketplace templates' },
      { status: 500 }
    )
  }
}

// POST /api/marketplace/templates - Publish a new template to marketplace
export async function POST(request: NextRequest) {
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

    const publishSchema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(10).max(1000),
      category: z.string(),
      metadata: z.any(),
      previewImage: z.string().optional(),
      tags: z.array(z.string()).max(10),
      isPremium: z.boolean().default(false),
      price: z.number().min(0).optional(),
      license: z.string().default('MIT'),
    })

    const data = publishSchema.parse(await request.json())

    // Create template
    const template = await prisma.template.create({
      data: {
        name: data.name,
        category: data.category,
        metadata: data.metadata,
        previewImage: data.previewImage,
        description: data.description,
        tags: JSON.stringify(data.tags),
        isPremium: data.isPremium,
        price: data.price || 0,
        license: data.license,
        isPublic: true, // Auto-publish for now
        authorId: user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            purchases: true,
            favorites: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template published successfully',
    })
  } catch (error) {
    console.error('Template publish error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to publish template' },
      { status: 500 }
    )
  }
}
