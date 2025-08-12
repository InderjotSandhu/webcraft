import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

const trackingEventSchema = z.object({
  projectId: z.string().min(1),
  event: z.enum(['page_view', 'click', 'form_submit', 'download', 'custom']),
  data: z.object({
    page: z.string().optional(),
    element: z.string().optional(),
    value: z.string().optional(),
    userAgent: z.string().optional(),
    referrer: z.string().optional(),
    sessionId: z.string().optional(),
    userId: z.string().optional(),
  }).optional()
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, event, data } = trackingEventSchema.parse(body)

    // Create analytics record
    const analyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      projectId,
      event,
      data,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    // Save to analytics directory
    const analyticsDir = path.join(process.cwd(), 'analytics', projectId)
    await fs.mkdir(analyticsDir, { recursive: true })
    
    // Organize by date for easier querying
    const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const dateFile = path.join(analyticsDir, `${dateStr}.json`)
    
    let events = []
    try {
      const existingData = await fs.readFile(dateFile, 'utf-8')
      events = JSON.parse(existingData)
    } catch {
      // File doesn't exist yet
    }
    
    events.push(analyticsEvent)
    await fs.writeFile(dateFile, JSON.stringify(events, null, 2))

    return NextResponse.json({
      success: true,
      eventId: analyticsEvent.id
    })

  } catch (error) {
    console.error('Analytics tracking error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid tracking data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')

    if (!projectId || !userId) {
      return NextResponse.json(
        { error: 'Missing projectId or userId' },
        { status: 400 }
      )
    }

    // Verify project ownership
    // In a real app, you'd query the database here
    const analyticsDir = path.join(process.cwd(), 'analytics', projectId)
    
    try {
      await fs.access(analyticsDir)
    } catch {
      return NextResponse.json({
        success: true,
        analytics: {
          totalViews: 0,
          totalClicks: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          topPages: [],
          topReferrers: [],
          deviceStats: {},
          chartData: []
        }
      })
    }

    // Calculate date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const end = endDate ? new Date(endDate) : new Date()

    // Load analytics data
    const allEvents = []
    const files = await fs.readdir(analyticsDir)
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const fileDate = new Date(file.replace('.json', ''))
        if (fileDate >= start && fileDate <= end) {
          const fileData = JSON.parse(await fs.readFile(path.join(analyticsDir, file), 'utf-8'))
          allEvents.push(...fileData)
        }
      }
    }

    // Process analytics data
    const analytics = processAnalyticsData(allEvents)

    return NextResponse.json({
      success: true,
      analytics,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    })

  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

function processAnalyticsData(events: any[]) {
  const analytics = {
    totalViews: 0,
    totalClicks: 0,
    totalSessions: 0,
    averageSessionDuration: 0,
    topPages: [] as Array<{ page: string; views: number }>,
    topReferrers: [] as Array<{ referrer: string; visits: number }>,
    deviceStats: {
      desktop: 0,
      mobile: 0,
      tablet: 0
    },
    chartData: [] as Array<{ date: string; views: number; clicks: number }>
  }

  // Count events
  const pageViews = events.filter(e => e.event === 'page_view')
  const clicks = events.filter(e => e.event === 'click')
  
  analytics.totalViews = pageViews.length
  analytics.totalClicks = clicks.length

  // Calculate unique sessions
  const sessionIds = new Set(events.map(e => e.data?.sessionId).filter(Boolean))
  analytics.totalSessions = sessionIds.size

  // Top pages
  const pageStats = pageViews.reduce((acc, event) => {
    const page = event.data?.page || '/'
    acc[page] = (acc[page] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  analytics.topPages = Object.entries(pageStats)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  // Top referrers
  const referrerStats = pageViews.reduce((acc, event) => {
    const referrer = event.data?.referrer || 'Direct'
    acc[referrer] = (acc[referrer] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  analytics.topReferrers = Object.entries(referrerStats)
    .map(([referrer, visits]) => ({ referrer, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10)

  // Device stats
  events.forEach(event => {
    const userAgent = event.userAgent || event.data?.userAgent || ''
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      if (/iPad/.test(userAgent)) {
        analytics.deviceStats.tablet++
      } else {
        analytics.deviceStats.mobile++
      }
    } else {
      analytics.deviceStats.desktop++
    }
  })

  // Chart data (daily views and clicks)
  const dailyStats = events.reduce((acc, event) => {
    const date = event.timestamp.split('T')[0]
    if (!acc[date]) {
      acc[date] = { views: 0, clicks: 0 }
    }
    if (event.event === 'page_view') {
      acc[date].views++
    } else if (event.event === 'click') {
      acc[date].clicks++
    }
    return acc
  }, {} as Record<string, { views: number; clicks: number }>)

  analytics.chartData = Object.entries(dailyStats)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return analytics
}
