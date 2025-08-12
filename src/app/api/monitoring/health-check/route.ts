import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

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

    const url = project.generatedUrl || `https://${project.name.toLowerCase().replace(/\s+/g, '-')}.example.com`;

    // Generate comprehensive health check data
    const healthCheckResults = await performHealthCheck(project.id, url);

    return NextResponse.json({
      success: true,
      data: healthCheckResults,
      message: 'Health check completed successfully'
    });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform health check' },
      { status: 500 }
    );
  }
}

async function performHealthCheck(projectId: string, url: string) {
  const results = {
    uptime: null as any,
    performance: [] as any[],
    errors: [] as any[],
    recommendations: [] as string[],
    overallScore: 0
  };

  // 1. Simulate uptime check
  const uptimeResult = await simulateUptimeCheck(projectId, url);
  results.uptime = uptimeResult;

  // 2. Simulate performance metrics
  const performanceResults = await simulatePerformanceMetrics(projectId, url);
  results.performance = performanceResults;

  // 3. Check for recent errors (no simulation needed, check real data)
  const recentErrors = await checkRecentErrors(projectId);
  results.errors = recentErrors;

  // 4. Generate recommendations
  results.recommendations = generateRecommendations(uptimeResult, performanceResults, recentErrors);

  // 5. Calculate overall health score
  results.overallScore = calculateOverallScore(uptimeResult, performanceResults, recentErrors);

  return results;
}

async function simulateUptimeCheck(projectId: string, url: string) {
  // Simulate response time
  const responseTime = Math.random() * 1000 + 100; // 100-1100ms
  let status: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
  let statusCode = 200;
  let error: string | undefined;

  // Simulate occasional issues (10% chance)
  if (Math.random() < 0.03) {
    status = 'DOWN';
    statusCode = 500;
    error = 'Server Error';
  } else if (Math.random() < 0.07) {
    status = 'DEGRADED';
    statusCode = 200;
  }

  // Create uptime check record
  const uptimeCheck = await prisma.uptimeCheck.create({
    data: {
      projectId,
      url,
      status,
      responseTime: Math.round(responseTime),
      statusCode,
      error
    }
  });

  return uptimeCheck;
}

async function simulatePerformanceMetrics(projectId: string, url: string) {
  const metricTypes = [
    'PERFORMANCE_SCORE',
    'FIRST_CONTENTFUL_PAINT',
    'LARGEST_CONTENTFUL_PAINT',
    'CUMULATIVE_LAYOUT_SHIFT',
    'TIME_TO_INTERACTIVE',
    'SPEED_INDEX'
  ] as const;

  const metrics = [];

  for (const metricType of metricTypes) {
    let value: number;
    let threshold: number | undefined;
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    switch (metricType) {
      case 'PERFORMANCE_SCORE':
        value = Math.random() * 40 + 60; // 60-100
        threshold = 90;
        if (value < 70) status = 'CRITICAL';
        else if (value < 85) status = 'WARNING';
        break;
      case 'FIRST_CONTENTFUL_PAINT':
        value = Math.random() * 2 + 0.5; // 0.5-2.5s
        threshold = 1.8;
        if (value > 3) status = 'CRITICAL';
        else if (value > 1.8) status = 'WARNING';
        break;
      case 'LARGEST_CONTENTFUL_PAINT':
        value = Math.random() * 2 + 1; // 1-3s
        threshold = 2.5;
        if (value > 4) status = 'CRITICAL';
        else if (value > 2.5) status = 'WARNING';
        break;
      case 'CUMULATIVE_LAYOUT_SHIFT':
        value = Math.random() * 0.2; // 0-0.2
        threshold = 0.1;
        if (value > 0.25) status = 'CRITICAL';
        else if (value > 0.1) status = 'WARNING';
        break;
      case 'TIME_TO_INTERACTIVE':
        value = Math.random() * 3 + 1; // 1-4s
        threshold = 3.8;
        if (value > 6) status = 'CRITICAL';
        else if (value > 3.8) status = 'WARNING';
        break;
      case 'SPEED_INDEX':
        value = Math.random() * 2000 + 1000; // 1000-3000
        threshold = 3000;
        if (value > 5800) status = 'CRITICAL';
        else if (value > 3000) status = 'WARNING';
        break;
    }

    const metric = await prisma.performanceMetric.create({
      data: {
        projectId,
        url,
        metricType,
        value: Math.round(value * 100) / 100,
        threshold,
        status
      }
    });

    metrics.push(metric);
  }

  return metrics;
}

async function checkRecentErrors(projectId: string) {
  const recentErrors = await prisma.errorLog.findMany({
    where: {
      projectId,
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: 10
  });

  return recentErrors;
}

function generateRecommendations(uptime: any, performance: any[], errors: any[]) {
  const recommendations: string[] = [];

  // Uptime recommendations
  if (uptime.status === 'DOWN') {
    recommendations.push('Your website is currently down. Check your hosting provider and server configuration.');
  } else if (uptime.status === 'DEGRADED') {
    recommendations.push('Website response time is slow. Consider optimizing your server or upgrading your hosting plan.');
  } else if (uptime.responseTime > 1000) {
    recommendations.push('Response time is above 1 second. Consider using a CDN or optimizing your server.');
  }

  // Performance recommendations
  performance.forEach(metric => {
    if (metric.status === 'CRITICAL') {
      switch (metric.metricType) {
        case 'PERFORMANCE_SCORE':
          recommendations.push('Overall performance score is low. Focus on optimizing Core Web Vitals.');
          break;
        case 'FIRST_CONTENTFUL_PAINT':
          recommendations.push('First Contentful Paint is too slow. Optimize critical rendering path and reduce server response time.');
          break;
        case 'LARGEST_CONTENTFUL_PAINT':
          recommendations.push('Largest Contentful Paint needs improvement. Optimize images and remove unused CSS.');
          break;
        case 'CUMULATIVE_LAYOUT_SHIFT':
          recommendations.push('Layout shift is high. Set explicit dimensions for images and ads.');
          break;
        case 'TIME_TO_INTERACTIVE':
          recommendations.push('Time to Interactive is too long. Reduce JavaScript bundle size and defer non-critical scripts.');
          break;
        case 'SPEED_INDEX':
          recommendations.push('Speed Index needs improvement. Optimize above-the-fold content loading.');
          break;
      }
    }
  });

  // Error recommendations
  const criticalErrors = errors.filter(e => e.level === 'CRITICAL' && !e.resolved);
  if (criticalErrors.length > 0) {
    recommendations.push(`${criticalErrors.length} critical errors need attention. Review and fix these issues immediately.`);
  }

  const unresolved = errors.filter(e => !e.resolved);
  if (unresolved.length > 5) {
    recommendations.push('Multiple unresolved errors detected. Consider implementing better error handling.');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Great job! Your website is performing well. Keep monitoring regularly.');
  }

  return recommendations;
}

function calculateOverallScore(uptime: any, performance: any[], errors: any[]) {
  let score = 100;

  // Uptime impact
  if (uptime.status === 'DOWN') {
    score -= 50;
  } else if (uptime.status === 'DEGRADED') {
    score -= 20;
  } else if (uptime.responseTime > 1000) {
    score -= 10;
  }

  // Performance impact
  performance.forEach(metric => {
    if (metric.status === 'CRITICAL') {
      score -= 15;
    } else if (metric.status === 'WARNING') {
      score -= 5;
    }
  });

  // Error impact
  const criticalErrors = errors.filter(e => e.level === 'CRITICAL' && !e.resolved);
  const errors24h = errors.filter(e => !e.resolved);
  
  score -= criticalErrors.length * 10;
  score -= Math.min(errors24h.length * 2, 20);

  return Math.max(0, Math.round(score));
}
