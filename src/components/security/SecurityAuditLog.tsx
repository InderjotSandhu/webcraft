'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Shield, 
  Key, 
  LogIn, 
  LogOut,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Monitor,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Activity
} from 'lucide-react'

interface AuditLogEntry {
  id: string
  action: string
  success: boolean
  timestamp: string
  ipAddress?: string
  userAgent?: string
  location?: string
  details?: Record<string, any>
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
  limit: number
}

export function SecurityAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [filters, setFilters] = useState({
    action: '',
    success: '',
    days: '30'
  })

  useEffect(() => {
    fetchAuditLogs()
  }, [filters])

  const fetchAuditLogs = async (page = 1) => {
    setLoading(true)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        days: filters.days
      })
      
      if (filters.action) params.append('action', filters.action)
      if (filters.success) params.append('success', filters.success)

      const response = await fetch(`/api/security/audit?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data.logs)
        setPagination(data.data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
      case 'LOGIN_ATTEMPT':
        return <LogIn className="h-4 w-4" />
      case 'LOGIN_FAILED':
        return <LogIn className="h-4 w-4 text-red-500" />
      case 'LOGOUT':
        return <LogOut className="h-4 w-4" />
      case 'TWO_FACTOR_ENABLE':
      case 'TWO_FACTOR_DISABLE':
      case 'TWO_FACTOR_VERIFY':
      case 'TWO_FACTOR_BACKUP_USED':
        return <Key className="h-4 w-4" />
      case 'SESSION_CREATED':
      case 'SESSION_TERMINATED':
        return <Monitor className="h-4 w-4" />
      case 'SUSPICIOUS_ACTIVITY':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'ACCOUNT_LOCKED':
      case 'ACCOUNT_UNLOCKED':
        return <Shield className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActionColor = (action: string, success: boolean) => {
    if (!success) return 'text-red-600 bg-red-50 border-red-200'
    
    switch (action) {
      case 'LOGIN_SUCCESS':
      case 'TWO_FACTOR_ENABLE':
      case 'ACCOUNT_UNLOCKED':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'LOGIN_FAILED':
      case 'ACCOUNT_LOCKED':
      case 'SUSPICIOUS_ACTIVITY':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'TWO_FACTOR_DISABLE':
      case 'SESSION_TERMINATED':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    let timeAgo = ''
    if (minutes < 60) timeAgo = `${minutes}m ago`
    else if (hours < 24) timeAgo = `${hours}h ago`
    else timeAgo = `${days}d ago`

    return {
      absolute: date.toLocaleString(),
      relative: timeAgo
    }
  }

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Success', 'Location', 'IP Address', 'Details'].join(','),
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.action,
        log.success ? 'Yes' : 'No',
        log.location || '',
        log.ipAddress || '',
        log.details ? JSON.stringify(log.details) : ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `security-audit-log-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select
                value={filters.days}
                onValueChange={(value) => setFilters(prev => ({ ...prev, days: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Action Type</label>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
                  <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
                  <SelectItem value="TWO_FACTOR_ENABLE">2FA Enabled</SelectItem>
                  <SelectItem value="TWO_FACTOR_DISABLE">2FA Disabled</SelectItem>
                  <SelectItem value="SESSION_TERMINATED">Session Terminated</SelectItem>
                  <SelectItem value="SUSPICIOUS_ACTIVITY">Suspicious Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.success}
                onValueChange={(value) => setFilters(prev => ({ ...prev, success: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={exportLogs} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Activity Log</CardTitle>
              <CardDescription>
                {pagination && `${pagination.totalCount} events found`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAuditLogs(pagination?.currentPage || 1)}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-muted-foreground mb-2">No Activity Found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters to see more activity
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const time = formatTimestamp(log.timestamp)
                
                return (
                  <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{formatAction(log.action)}</h4>
                        <Badge 
                          variant="outline" 
                          className={getActionColor(log.action, log.success)}
                        >
                          {log.success ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Success
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Failed
                            </>
                          )}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span title={time.absolute}>{time.relative}</span>
                        </div>
                        
                        {log.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{log.location}</span>
                          </div>
                        )}
                        
                        {log.ipAddress && (
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            <span className="font-mono text-xs">{log.ipAddress}</span>
                          </div>
                        )}
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <details className="cursor-pointer">
                            <summary className="hover:text-foreground">View details</summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAuditLogs(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAuditLogs(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
