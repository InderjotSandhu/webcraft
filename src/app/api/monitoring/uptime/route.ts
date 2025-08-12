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

    if (!projectId || projectId === 'all') {
      // Return uptime data for all user projects
      const userProjects = await prisma.project.findMany({
        where: { userId: user.id },
        select: { id: true }
      });

      const projectIds = userProjects.map(p => p.id);

      const checks = await prisma.uptimeCheck.findMany({
        where: {
          projectId: { in: projectIds },
          timestamp: {
            gte: getTimeRangeDate(timeRange)
          }
        },
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
        checks
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

      const checks = await prisma.uptimeCheck.findMany({
        where: {
          projectId: projectId,
          timestamp: {
            gte: getTimeRangeDate(timeRange)
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      return NextResponse.json({
        success: true,
        checks
      });
    }

  } catch (error) {
    console.error('Uptime monitoring error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch uptime data' },
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

    const { projectId } = await request.json();

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

    // Simulate uptime check
    const startTime = Date.now();
    let status: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
    let responseTime = Math.random() * 1000 + 100; // 100-1100ms
    let statusCode = 200;
    let error: string | undefined;

    // Simulate occasional downtime (5% chance)
    if (Math.random() < 0.05) {
      status = 'DOWN';
      statusCode = 500;
      error = 'Server Error';
      responseTime = 0;
    } else if (Math.random() < 0.1) {
      // Simulate slow response (degraded)
      status = 'DEGRADED';
      responseTime = Math.random() * 2000 + 2000; // 2-4s
      statusCode = 200;
    }

    // Create uptime check record
    const uptimeCheck = await prisma.uptimeCheck.create({
      data: {
        projectId: project.id,
        url: project.generatedUrl || `https://${project.name.toLowerCase().replace(/\s+/g, '-')}.example.com`,
        status,
        responseTime: Math.round(responseTime),
        statusCode,
        error
      }
    });

    return NextResponse.json({
      success: true,
      data: uptimeCheck
    });

  } catch (error) {
    console.error('Uptime check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform uptime check' },
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
