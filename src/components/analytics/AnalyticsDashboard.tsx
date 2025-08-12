'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MousePointer, 
  Globe,
  Calendar,
  Download,
  ExternalLink,
  Refresh
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AnalyticsData {
  totalViews: number
  totalClicks: number
  totalSessions: number
  averageSessionDuration: number
  topPages: Array<{ page: string; views: number }>
  topReferrers: Array<{ referrer: string; visits: number }>
  deviceStats: {
    desktop: number
    mobile: number
    tablet: number
  }
  chartData: Array<{ date: string; views: number; clicks: number }>
}

interface AnalyticsDashboardProps {
  projectId: string
  userId: string
}

export default function AnalyticsDashboard({ projectId, userId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')
  const [error, setError] = useState<string>('')

  const loadAnalytics = async () => {
    setIsLoading(true)
    setError('')

    try {
      const endDate = new Date()
      const startDate = new Date()
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
      }

      const response = await fetch(
        `/api/analytics?projectId=${projectId}&userId=${userId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to load analytics')
      }

      const result = await response.json()
      if (result.success) {
        setAnalytics(result.analytics)
      } else {
        throw new Error(result.error || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('Analytics loading error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [projectId, userId, dateRange])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getDevicePercentage = (deviceCount: number, total: number): string => {
    if (total === 0) return '0%'
    return ((deviceCount / total) * 100).toFixed(1) + '%'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={loadAnalytics} variant="outline">
          <Refresh className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card className="p-6 text-center">
        <div className="text-gray-600">No analytics data available</div>
      </Card>
    )
  }

  const totalDevices = analytics.deviceStats.desktop + analytics.deviceStats.mobile + analytics.deviceStats.tablet

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Monitor your website's performance and engagement</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <Refresh className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalViews)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              {analytics.totalViews > 0 ? '+' : ''}
              {analytics.totalViews} this period
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clicks</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalClicks)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <MousePointer className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              {analytics.totalClicks > 0 ? '+' : ''}
              {analytics.totalClicks} this period
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalSessions)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              {analytics.totalSessions > 0 ? '+' : ''}
              {analytics.totalSessions} unique sessions
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Session</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(analytics.averageSessionDuration)}s
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              Session duration
            </Badge>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
          <div className="space-y-3">
            {analytics.topPages.length > 0 ? (
              analytics.topPages.map((page, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-900 truncate">{page.page}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{page.views}</span>
                    <ExternalLink className="h-3 w-3 text-gray-400" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No page data available</p>
            )}
          </div>
        </Card>

        {/* Top Referrers */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Referrers</h3>
          <div className="space-y-3">
            {analytics.topReferrers.length > 0 ? (
              analytics.topReferrers.map((referrer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-900 truncate">{referrer.referrer}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{referrer.visits}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No referrer data available</p>
            )}
          </div>
        </Card>
      </div>

      {/* Device Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.deviceStats.desktop}</p>
            <p className="text-sm text-gray-600">Desktop</p>
            <p className="text-xs text-gray-500">
              {getDevicePercentage(analytics.deviceStats.desktop, totalDevices)}
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <Globe className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.deviceStats.mobile}</p>
            <p className="text-sm text-gray-600">Mobile</p>
            <p className="text-xs text-gray-500">
              {getDevicePercentage(analytics.deviceStats.mobile, totalDevices)}
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <Globe className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.deviceStats.tablet}</p>
            <p className="text-sm text-gray-600">Tablet</p>
            <p className="text-xs text-gray-500">
              {getDevicePercentage(analytics.deviceStats.tablet, totalDevices)}
            </p>
          </div>
        </div>
      </Card>

      {/* Chart Data */}
      {analytics.chartData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Traffic</h3>
          <div className="space-y-2">
            {analytics.chartData.map((data, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{new Date(data.date).toLocaleDateString()}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-blue-600">{data.views} views</span>
                  <span className="text-green-600">{data.clicks} clicks</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Export Options */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
            <p className="text-gray-600 text-sm">Download your analytics data for further analysis</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
