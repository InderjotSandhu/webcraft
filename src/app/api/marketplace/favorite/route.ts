import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const favoriteSchema = z.object({
  templateId: z.string().cuid(),
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

    const { templateId } = favoriteSchema.parse(await request.json());

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

    // Check if already favorited
    const existingFavorite = await prisma.templateFavorite.findFirst({
      where: {
        userId: user.id,
        templateId: templateId,
      },
    });

    if (existingFavorite) {
      // Remove favorite (toggle)
      await prisma.templateFavorite.delete({
        where: {
          id: existingFavorite.id,
        },
      });

      return NextResponse.json({
        success: true,
        data: { favorited: false },
        message: 'Template removed from favorites',
      });
    } else {
      // Add favorite
      const favorite = await prisma.templateFavorite.create({
        data: {
          userId: user.id,
          templateId: templateId,
        },
      });

      return NextResponse.json({
        success: true,
        data: { favorited: true, favorite },
        message: 'Template added to favorites',
      });
    }

  } catch (error) {
    console.error('Template favorite error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update favorite' },
      { status: 500 }
    );
  }
}

// GET /api/marketplace/favorite - Get user's favorites
export async function GET(request: NextRequest) {
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

    const favorites = await prisma.templateFavorite.findMany({
      where: {
        userId: user.id,
      },
      include: {
        template: {
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: favorites,
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}
