import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const timeRange = searchParams.get('timeRange') || '24h';
    const level = searchParams.get('level'); // Filter by error level
    const resolved = searchParams.get('resolved'); // Filter by resolution status

    if (!projectId || projectId === 'all') {
      // Return error logs for all user projects
      const userProjects = await prisma.project.findMany({
        where: { userId: user.id },
        select: { id: true }
      });

      const projectIds = userProjects.map(p => p.id);

      const where: any = {
        projectId: { in: projectIds },
        timestamp: {
          gte: getTimeRangeDate(timeRange)
        }
      };

      if (level) {
        where.level = level.toUpperCase();
      }

      if (resolved !== null && resolved !== undefined) {
        where.resolved = resolved === 'true';
      }

      const errors = await prisma.errorLog.findMany({
        where,
        include: {
          project: {
            select: {
              name: true,
              generatedUrl: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      return NextResponse.json({
        success: true,
        errors
      });
    } else {
      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.id
        }
      });

      if (!project) {
        return NextResponse.json(
          { success: false, error: 'Project not found or unauthorized' },
          { status: 404 }
        );
      }

      const where: any = {
        projectId: projectId,
        timestamp: {
          gte: getTimeRangeDate(timeRange)
        }
      };

      if (level) {
        where.level = level.toUpperCase();
      }

      if (resolved !== null && resolved !== undefined) {
        where.resolved = resolved === 'true';
      }

      const errors = await prisma.errorLog.findMany({
        where,
        orderBy: {
          timestamp: 'desc'
        }
      });

      return NextResponse.json({
        success: true,
        errors
      });
    }

  } catch (error) {
    console.error('Error logs monitoring error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}

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

    const { projectId, level, message, url, stack, userAgent } = await request.json();

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id
      }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Create error log record
    const errorLog = await prisma.errorLog.create({
      data: {
        projectId: project.id,
        level: level || 'ERROR',
        message: message || 'Unknown error occurred',
        url,
        stack,
        userAgent,
        userId: user.id
      }
    });

    return NextResponse.json({
      success: true,
      data: errorLog
    });

  } catch (error) {
    console.error('Error log creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create error log' },
      { status: 500 }
    );
  }
}

// PATCH /api/monitoring/errors - Mark error as resolved
export async function PATCH(request: NextRequest) {
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

    const { errorId, resolved } = await request.json();

    // Verify error log ownership through project
    const errorLog = await prisma.errorLog.findFirst({
      where: {
        id: errorId,
      },
      include: {
        project: true
      }
    });

    if (!errorLog || errorLog.project?.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Error log not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update error log resolution status
    const updatedErrorLog = await prisma.errorLog.update({
      where: { id: errorId },
      data: { resolved: resolved !== false }
    });

    return NextResponse.json({
      success: true,
      data: updatedErrorLog
    });

  } catch (error) {
    console.error('Error log update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update error log' },
      { status: 500 }
    );
  }
}

function getTimeRangeDate(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}
