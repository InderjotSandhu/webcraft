'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Globe, 
  Loader2, 
  TrendingUp, 
  Zap,
  AlertCircle,
  BarChart3,
  Timer,
  Cpu
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface PerformanceMetric {
  id: string;
  url: string;
  metricType: 'PERFORMANCE_SCORE' | 'FIRST_CONTENTFUL_PAINT' | 'LARGEST_CONTENTFUL_PAINT' | 'CUMULATIVE_LAYOUT_SHIFT' | 'TIME_TO_INTERACTIVE' | 'SPEED_INDEX';
  value: number;
  threshold?: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  metadata?: any;
}

interface UptimeCheck {
  id: string;
  url: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  responseTime: number;
  statusCode: number;
  timestamp: string;
  error?: string;
}

interface ErrorLog {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  url?: string;
  timestamp: string;
  resolved: boolean;
  stack?: string;
  userAgent?: string;
}

interface Project {
  id: string;
  name: string;
  generatedUrl: string;
  status: string;
}

export default function MonitoringPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [uptimeChecks, setUptimeChecks] = useState<UptimeCheck[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  const { user } = useAppStore();

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      fetchMonitoringData();
    }
  }, [selectedProject, timeRange]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects.filter((p: Project) => p.status === 'DEPLOYED'));
        if (data.projects.length > 0) {
          setSelectedProject(data.projects[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      const [metricsRes, uptimeRes, errorsRes] = await Promise.all([
        fetch(`/api/monitoring/performance?projectId=${selectedProject}&timeRange=${timeRange}`),
        fetch(`/api/monitoring/uptime?projectId=${selectedProject}&timeRange=${timeRange}`),
        fetch(`/api/monitoring/errors?projectId=${selectedProject}&timeRange=${timeRange}`)
      ]);

      const [metricsData, uptimeData, errorsData] = await Promise.all([
        metricsRes.json(),
        uptimeRes.json(),
        errorsRes.json()
      ]);

      setMetrics(metricsData.metrics || []);
      setUptimeChecks(uptimeData.checks || []);
      setErrorLogs(errorsData.errors || []);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    if (!selectedProject || selectedProject === 'all') return;

    try {
      const response = await fetch('/api/monitoring/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject })
      });

      if (response.ok) {
        fetchMonitoringData();
        alert('Health check initiated successfully!');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      alert('Health check failed. Please try again.');
    }
  };

  const getHealthScore = () => {
    if (metrics.length === 0) return 0;

    const healthyCount = metrics.filter(m => m.status === 'HEALTHY').length;
    const warningCount = metrics.filter(m => m.status === 'WARNING').length;
    const criticalCount = metrics.filter(m => m.status === 'CRITICAL').length;

    const score = (healthyCount * 100 + warningCount * 60 + criticalCount * 20) / metrics.length;
    return Math.round(score);
  };

  const getUptimePercentage = () => {
    if (uptimeChecks.length === 0) return 100;
    const upCount = uptimeChecks.filter(check => check.status === 'UP').length;
    return Math.round((upCount / uptimeChecks.length) * 100);
  };

  const getAverageResponseTime = () => {
    if (uptimeChecks.length === 0) return 0;
    const totalTime = uptimeChecks.reduce((sum, check) => sum + (check.responseTime || 0), 0);
    return Math.round(totalTime / uptimeChecks.length);
  };

  const getCriticalErrors = () => {
    return errorLogs.filter(log => log.level === 'CRITICAL' && !log.resolved).length;
  };

  const getMetricDisplay = (metricType: string) => {
    const typeMap: Record<string, { label: string; icon: any; unit: string }> = {
      PERFORMANCE_SCORE: { label: 'Performance Score', icon: Zap, unit: '' },
      FIRST_CONTENTFUL_PAINT: { label: 'First Contentful Paint', icon: Timer, unit: 's' },
      LARGEST_CONTENTFUL_PAINT: { label: 'Largest Contentful Paint', icon: Activity, unit: 's' },
      CUMULATIVE_LAYOUT_SHIFT: { label: 'Layout Shift', icon: BarChart3, unit: '' },
      TIME_TO_INTERACTIVE: { label: 'Time to Interactive', icon: Clock, unit: 's' },
      SPEED_INDEX: { label: 'Speed Index', icon: TrendingUp, unit: '' }
    };
    return typeMap[metricType] || { label: metricType, icon: Cpu, unit: '' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'UP':
        return 'bg-green-100 text-green-800';
      case 'WARNING':
      case 'DEGRADED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CRITICAL':
      case 'DOWN':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getErrorLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'ERROR':
        return 'bg-orange-100 text-orange-800';
      case 'WARN':
        return 'bg-yellow-100 text-yellow-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Please login to access performance monitoring.</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0 && !loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Deployed Projects</h3>
          <p className="text-gray-500 mb-4">Deploy a project to start monitoring its performance.</p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Performance Monitoring</h1>
          <p className="text-gray-600">Monitor your websites' performance, uptime, and health</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runHealthCheck} disabled={selectedProject === 'all'}>
            <Activity className="h-4 w-4 mr-2" />
            Run Check
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading monitoring data...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getHealthScore()}/100</div>
                <p className="text-xs text-muted-foreground">
                  Overall system health
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getUptimePercentage()}%</div>
                <p className="text-xs text-muted-foreground">
                  Last {timeRange}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                <Timer className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getAverageResponseTime()}ms</div>
                <p className="text-xs text-muted-foreground">
                  Average response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getCriticalErrors()}</div>
                <p className="text-xs text-muted-foreground">
                  Unresolved issues
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Core Web Vitals and performance scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.map((metric) => {
                  const display = getMetricDisplay(metric.metricType);
                  const Icon = display.icon;
                  return (
                    <div key={metric.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{display.label}</span>
                        </div>
                        <Badge className={getStatusColor(metric.status)}>
                          {metric.status.toLowerCase()}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">
                        {metric.value.toFixed(2)}{display.unit}
                      </div>
                      {metric.threshold && (
                        <div className="text-xs text-gray-500 mt-1">
                          Threshold: {metric.threshold}{display.unit}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(metric.timestamp).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
              {metrics.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No performance metrics available. Run a health check to generate data.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Uptime Status */}
          <Card>
            <CardHeader>
              <CardTitle>Uptime Status</CardTitle>
              <CardDescription>
                Recent uptime checks and response times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {uptimeChecks.slice(0, 10).map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(check.status)}>
                        {check.status.toLowerCase()}
                      </Badge>
                      <span className="text-sm font-medium">{check.url}</span>
                      <span className="text-xs text-gray-500">
                        {check.statusCode}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {check.responseTime}ms
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(check.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {uptimeChecks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No uptime data available. Uptime monitoring will start automatically.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                Recent errors and system issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {errorLogs.slice(0, 10).map((error) => (
                  <div key={error.id} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getErrorLevelColor(error.level)}>
                          {error.level.toLowerCase()}
                        </Badge>
                        {error.resolved ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm font-medium mb-1">{error.message}</div>
                    {error.url && (
                      <div className="text-xs text-gray-500 mb-1">URL: {error.url}</div>
                    )}
                    {error.userAgent && (
                      <div className="text-xs text-gray-500">User Agent: {error.userAgent}</div>
                    )}
                  </div>
                ))}
              </div>
              {errorLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No errors logged recently. Your system is running smoothly!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
