import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const purchaseSchema = z.object({
  templateId: z.string().cuid(),
  price: z.number().min(0),
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

    const { templateId, price } = purchaseSchema.parse(await request.json());

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

    // Check if user has already purchased this template
    const existingPurchase = await prisma.templatePurchase.findFirst({
      where: {
        userId: user.id,
        templateId: templateId,
        status: 'COMPLETED',
      },
    });

    if (existingPurchase) {
      return NextResponse.json(
        { success: false, error: 'Template already purchased' },
        { status: 400 }
      );
    }

    // For free templates, create immediate purchase record
    if (template.price === 0) {
      const purchase = await prisma.templatePurchase.create({
        data: {
          userId: user.id,
          templateId: templateId,
          amount: 0,
          currency: 'USD',
          status: 'COMPLETED',
        },
      });

      // Increment download count
      await prisma.template.update({
        where: { id: templateId },
        data: {
          downloads: {
            increment: 1,
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: purchase,
        message: 'Free template acquired successfully',
      });
    }

    // For premium templates, simulate payment processing
    // In a real implementation, this would integrate with Stripe or similar
    const purchase = await prisma.templatePurchase.create({
      data: {
        userId: user.id,
        templateId: templateId,
        amount: price,
        currency: 'USD',
        status: 'COMPLETED', // Simulating successful payment
        stripeSessionId: `sim_${Date.now()}`, // Simulated session ID
      },
    });

    // Increment download count
    await prisma.template.update({
      where: { id: templateId },
      data: {
        downloads: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: purchase,
      message: 'Template purchased successfully',
    });

  } catch (error) {
    console.error('Template purchase error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process purchase' },
      { status: 500 }
    );
  }
}

// GET /api/marketplace/purchase - Get user's purchases
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

    const purchases = await prisma.templatePurchase.findMany({
      where: {
        userId: user.id,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            previewImage: true,
            author: {
              select: {
                name: true,
                image: true,
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
      data: purchases,
    });

  } catch (error) {
    console.error('Get purchases error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}
