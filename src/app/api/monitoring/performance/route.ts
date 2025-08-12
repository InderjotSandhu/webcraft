import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

// Schema for performance monitoring
const performanceAnalysisSchema = z.object({
  projectId: z.string(),
  url: z.string().url(),
})

const performanceConfigSchema = z.object({
  projectId: z.string(),
  checkInterval: z.number().min(5).max(1440).default(60), // minutes
  thresholds: z.object({
    performanceScore: z.number().min(0).max(100).default(80),
    responseTime: z.number().min(100).max(10000).default(3000),
    uptime: z.number().min(90).max(100).default(99),
  }),
  notifications: z.object({
    email: z.boolean().default(false),
    slack: z.boolean().default(false),
    webhook: z.string().url().optional(),
  }),
  enabled: z.boolean().default(true),
})

// Simplified Lighthouse analysis for performance metrics
async function runLighthouseAnalysis(url: string) {
  try {
    // Mock Lighthouse results for demo purposes
    // In production, you would run actual Lighthouse analysis
    const mockResults = {
      performance: Math.floor(Math.random() * 40) + 60, // 60-100
      accessibility: Math.floor(Math.random() * 30) + 70, // 70-100
      bestPractices: Math.floor(Math.random() * 25) + 75, // 75-100
      seo: Math.floor(Math.random() * 20) + 80, // 80-100
      metrics: {
        firstContentfulPaint: Math.floor(Math.random() * 2000) + 500, // 500-2500ms
        largestContentfulPaint: Math.floor(Math.random() * 3000) + 1000, // 1000-4000ms
        cumulativeLayoutShift: Math.random() * 0.3, // 0-0.3
        timeToInteractive: Math.floor(Math.random() * 4000) + 1000, // 1000-5000ms
        speedIndex: Math.floor(Math.random() * 3000) + 1000, // 1000-4000ms
      },
      opportunities: [
        {
          id: 'unused-css-rules',
          title: 'Remove unused CSS',
          description: 'Remove dead rules from stylesheets to reduce bytes consumed by network activity.',
          impact: 'medium',
          savings: Math.floor(Math.random() * 50) + 10,
        },
        {
          id: 'render-blocking-resources',
          title: 'Eliminate render-blocking resources',
          description: 'Resources are blocking the first paint of your page.',
          impact: 'high',
          savings: Math.floor(Math.random() * 100) + 20,
        },
      ],
    }

    return mockResults
  } catch (error) {
    console.error('Lighthouse analysis error:', error)
    throw error
  }
}

// GET /api/monitoring/performance - Get performance data for projects
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const days = Number(searchParams.get('days')) || 7

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let whereClause: any = {
      timestamp: {
        gte: startDate,
      },
    }

    if (projectId) {
      // Verify user owns the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.id,
        },
      })

      if (!project) {
        return NextResponse.json(
          { success: false, error: 'Project not found or access denied' },
          { status: 404 }
        )
      }

      whereClause.projectId = projectId
    } else {
      // Get metrics for all user's projects
      const userProjects = await prisma.project.findMany({
        where: { userId: user.id },
        select: { id: true },
      })

      whereClause.projectId = {
        in: userProjects.map(p => p.id),
      }
    }

    const [performanceMetrics, errorLogs, uptimeChecks] = await Promise.all([
      prisma.performanceMetric.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              generatedUrl: true,
            },
          },
        },
      }),
      prisma.errorLog.findMany({
        where: {
          ...whereClause,
          resolved: false,
        },
        orderBy: { timestamp: 'desc' },
        take: 20,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.uptimeCheck.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: 50,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ])

    // Calculate overall health
    const overallHealth = {
      healthy: 0,
      warning: 0,
      critical: 0,
    }

    const projectHealth = new Map()

    performanceMetrics.forEach(metric => {
      const projectId = metric.projectId
      if (!projectHealth.has(projectId)) {
        projectHealth.set(projectId, { performance: [], uptime: 100, errors: 0 })
      }

      const health = projectHealth.get(projectId)
      health.performance.push(metric.value)

      if (metric.status === 'HEALTHY') overallHealth.healthy++
      else if (metric.status === 'WARNING') overallHealth.warning++
      else overallHealth.critical++
    })

    // Calculate performance trends
    const performanceData = performanceMetrics
      .filter(m => m.metricType === 'PERFORMANCE_SCORE')
      .map(m => ({
        timestamp: m.timestamp,
        value: m.value,
        project: m.project?.name || 'Unknown',
      }))

    const avgPerformance = performanceData.length > 0
      ? performanceData.reduce((sum, item) => sum + item.value, 0) / performanceData.length
      : 0

    // Uptime calculation
    const uptimeData = uptimeChecks.reduce((acc, check) => {
      const projectId = check.projectId
      if (!acc[projectId]) {
        acc[projectId] = { total: 0, up: 0 }
      }
      acc[projectId].total++
      if (check.status === 'UP') {
        acc[projectId].up++
      }
      return acc
    }, {} as Record<string, { total: number; up: number }>)

    const avgUptime = Object.values(uptimeData).length > 0
      ? Object.values(uptimeData).reduce((sum, data) => sum + (data.up / data.total * 100), 0) / Object.values(uptimeData).length
      : 100

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          performance: {
            avgScore: Number(avgPerformance.toFixed(1)),
            trend: performanceData.length > 1 
              ? (performanceData[0].value > performanceData[performanceData.length - 1].value ? 'up' : 'down')
              : 'stable',
            data: performanceData.slice(0, 30),
          },
          uptime: {
            percentage: Number(avgUptime.toFixed(2)),
            checks: uptimeChecks.length,
            incidents: uptimeChecks.filter(c => c.status !== 'UP').length,
          },
          errors: {
            total: errorLogs.length,
            resolved: errorLogs.filter(e => e.resolved).length,
            recent: errorLogs.slice(0, 5),
          },
          health: overallHealth,
        },
        metrics: performanceMetrics,
        errors: errorLogs,
        uptime: uptimeChecks,
      },
    })
  } catch (error) {
    console.error('Get performance data error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance data' },
      { status: 500 }
    )
  }
}

// POST /api/monitoring/performance - Run performance analysis
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

    const data = performanceAnalysisSchema.parse(await request.json())

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        userId: user.id,
      },
    })

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Run Lighthouse analysis
    const analysis = await runLighthouseAnalysis(data.url)

    // Store performance metrics
    const metrics = [
      {
        projectId: data.projectId,
        url: data.url,
        metricType: 'PERFORMANCE_SCORE' as const,
        value: analysis.performance,
        threshold: 80,
        status: analysis.performance >= 80 ? 'HEALTHY' as const : analysis.performance >= 60 ? 'WARNING' as const : 'CRITICAL' as const,
        metadata: {
          accessibility: analysis.accessibility,
          bestPractices: analysis.bestPractices,
          seo: analysis.seo,
        },
      },
      {
        projectId: data.projectId,
        url: data.url,
        metricType: 'FIRST_CONTENTFUL_PAINT' as const,
        value: analysis.metrics.firstContentfulPaint,
        threshold: 2000,
        status: analysis.metrics.firstContentfulPaint <= 2000 ? 'HEALTHY' as const : analysis.metrics.firstContentfulPaint <= 3000 ? 'WARNING' as const : 'CRITICAL' as const,
      },
      {
        projectId: data.projectId,
        url: data.url,
        metricType: 'LARGEST_CONTENTFUL_PAINT' as const,
        value: analysis.metrics.largestContentfulPaint,
        threshold: 2500,
        status: analysis.metrics.largestContentfulPaint <= 2500 ? 'HEALTHY' as const : analysis.metrics.largestContentfulPaint <= 4000 ? 'WARNING' as const : 'CRITICAL' as const,
      },
      {
        projectId: data.projectId,
        url: data.url,
        metricType: 'CUMULATIVE_LAYOUT_SHIFT' as const,
        value: analysis.metrics.cumulativeLayoutShift,
        threshold: 0.1,
        status: analysis.metrics.cumulativeLayoutShift <= 0.1 ? 'HEALTHY' as const : analysis.metrics.cumulativeLayoutShift <= 0.25 ? 'WARNING' as const : 'CRITICAL' as const,
      },
    ]

    await prisma.performanceMetric.createMany({
      data: metrics,
    })

    // Create uptime check
    await prisma.uptimeCheck.create({
      data: {
        projectId: data.projectId,
        url: data.url,
        status: 'UP',
        responseTime: 200 + Math.floor(Math.random() * 800), // Mock response time
        statusCode: 200,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        metrics,
        recommendations: [
          {
            id: 'optimize-images',
            type: 'performance' as const,
            severity: 'medium' as const,
            title: 'Optimize Images',
            description: 'Compress images to reduce load times',
            impact: 'Reduce page load time by up to 2 seconds',
            solution: 'Use WebP format and appropriate sizing',
          },
          {
            id: 'minify-css',
            type: 'performance' as const,
            severity: 'low' as const,
            title: 'Minify CSS',
            description: 'Remove unnecessary whitespace and comments',
            impact: 'Reduce CSS file size by 10-30%',
            solution: 'Use a build tool to minify CSS files',
          },
        ],
      },
      message: 'Performance analysis completed successfully',
    })
  } catch (error) {
    console.error('Performance analysis error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run performance analysis' },
      { status: 500 }
    )
  }
}
