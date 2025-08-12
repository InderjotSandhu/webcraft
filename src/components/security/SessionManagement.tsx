'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  MapPin, 
  Clock, 
  AlertTriangle,
  Shield,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { SessionInfo } from '@/types'

interface SessionManagementProps {
  sessions: SessionInfo[]
  onSessionsUpdate: () => void
}

export function SessionManagement({ sessions, onSessionsUpdate }: SessionManagementProps) {
  const [loading, setLoading] = useState(false)
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null)

  const getDeviceIcon = (device?: string) => {
    if (!device) return <Monitor className="h-4 w-4 text-muted-foreground" />
    
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4 text-muted-foreground" />
      case 'tablet':
        return <Tablet className="h-4 w-4 text-muted-foreground" />
      default:
        return <Monitor className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatLastActive = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 5) return 'Active now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const terminateSession = async (sessionId: string) => {
    setTerminatingSession(sessionId)
    
    try {
      const response = await fetch('/api/security/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'terminate',
          sessionId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Session terminated successfully')
        onSessionsUpdate()
      } else {
        toast.error(data.error || 'Failed to terminate session')
      }
    } catch (error) {
      toast.error('Network error occurred')
    } finally {
      setTerminatingSession(null)
    }
  }

  const terminateAllSessions = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/security/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'terminate-all'
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('All other sessions terminated')
        onSessionsUpdate()
      } else {
        toast.error(data.error || 'Failed to terminate sessions')
      }
    } catch (error) {
      toast.error('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const currentSession = sessions.find(session => session.current)
  const otherSessions = sessions.filter(session => !session.current)

  return (
    <div className="space-y-6">
      {/* Current Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Session</span>
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
              Active Now
            </Badge>
          </CardTitle>
          <CardDescription>
            This is the session you're currently using
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentSession ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg bg-green-50 border-green-200">
                {getDeviceIcon(currentSession.device)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-green-900">
                      {currentSession.browser || 'Unknown Browser'}
                    </h4>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Current
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm text-green-700">
                    {currentSession.os && (
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3 w-3" />
                        <span>{currentSession.os}</span>
                      </div>
                    )}
                    
                    {currentSession.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{currentSession.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatLastActive(currentSession.lastActive)}</span>
                    </div>

                    {currentSession.ipAddress && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        <span className="font-mono text-xs">{currentSession.ipAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Current session information is not available
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Other Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Other Sessions</CardTitle>
              <CardDescription>
                Manage sessions on other devices and browsers
              </CardDescription>
            </div>
            {otherSessions.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={terminateAllSessions}
                disabled={loading}
              >
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Terminate All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {otherSessions.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-muted-foreground mb-2">No Other Sessions</h3>
              <p className="text-sm text-muted-foreground">
                You're only signed in on this device
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {otherSessions.map((session) => (
                <div key={session.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  {getDeviceIcon(session.device)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">
                        {session.browser || 'Unknown Browser'}
                      </h4>
                      {session.terminated && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                          Terminated
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {session.os && (
                        <div className="flex items-center gap-2">
                          <Monitor className="h-3 w-3" />
                          <span>{session.os}</span>
                        </div>
                      )}
                      
                      {session.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{session.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{formatLastActive(session.lastActive)}</span>
                      </div>

                      {session.ipAddress && (
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3" />
                          <span className="font-mono text-xs">{session.ipAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => terminateSession(session.id)}
                    disabled={terminatingSession === session.id || session.terminated}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {terminatingSession === session.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="text-sm">
                  <strong>Review regularly:</strong> Check your active sessions monthly and terminate any you don't recognize.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="text-sm">
                  <strong>Secure networks:</strong> Avoid signing in on public or untrusted networks.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="text-sm">
                  <strong>Sign out:</strong> Always sign out when using shared or public devices.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
