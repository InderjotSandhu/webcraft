import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

const deploySchema = z.object({
  projectId: z.string().min(1),
  target: z.enum(['netlify', 'vercel', 'github-pages', 'custom']),
  config: z.object({
    siteName: z.string().optional(),
    customDomain: z.string().optional(),
    environmentVariables: z.record(z.string()).optional(),
    buildCommand: z.string().optional(),
    publishDirectory: z.string().optional(),
  }).optional(),
  userId: z.string().min(1)
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, target, config, userId } = deploySchema.parse(body)

    // Verify project exists and belongs to user
    const projectPath = path.join(process.cwd(), 'generated', projectId)
    try {
      await fs.access(projectPath)
    } catch {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Load project metadata
    const metadataPath = path.join(projectPath, 'metadata.json')
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'))

    if (metadata.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Create deployment record
    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const deployment = {
      id: deploymentId,
      projectId,
      target,
      config,
      status: 'pending',
      createdAt: new Date().toISOString(),
      deployUrl: null,
      logs: []
    }

    // Save deployment record
    const deploymentsDir = path.join(process.cwd(), 'deployments')
    await fs.mkdir(deploymentsDir, { recursive: true })
    await fs.writeFile(
      path.join(deploymentsDir, `${deploymentId}.json`),
      JSON.stringify(deployment, null, 2)
    )

    // Start deployment process
    processDeployment(deployment, projectPath)

    return NextResponse.json({
      success: true,
      deployment: {
        id: deploymentId,
        status: 'pending',
        target,
        createdAt: deployment.createdAt
      }
    })

  } catch (error) {
    console.error('Deployment error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to start deployment' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')

    if (!projectId || !userId) {
      return NextResponse.json(
        { error: 'Missing projectId or userId' },
        { status: 400 }
      )
    }

    // Load all deployments for the project
    const deploymentsDir = path.join(process.cwd(), 'deployments')
    try {
      const files = await fs.readdir(deploymentsDir)
      const deployments = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          const deploymentData = JSON.parse(
            await fs.readFile(path.join(deploymentsDir, file), 'utf-8')
          )
          
          if (deploymentData.projectId === projectId) {
            deployments.push({
              id: deploymentData.id,
              target: deploymentData.target,
              status: deploymentData.status,
              deployUrl: deploymentData.deployUrl,
              createdAt: deploymentData.createdAt,
              config: deploymentData.config
            })
          }
        }
      }

      // Sort by creation date (newest first)
      deployments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return NextResponse.json({
        success: true,
        deployments
      })
    } catch {
      return NextResponse.json({
        success: true,
        deployments: []
      })
    }

  } catch (error) {
    console.error('Failed to fetch deployments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deployments' },
      { status: 500 }
    )
  }
}

// Simulated deployment process
async function processDeployment(deployment: any, projectPath: string) {
  const deploymentsDir = path.join(process.cwd(), 'deployments')
  const deploymentFile = path.join(deploymentsDir, `${deployment.id}.json`)

  try {
    // Update status to building
    deployment.status = 'building'
    deployment.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Starting deployment process...'
    })
    await fs.writeFile(deploymentFile, JSON.stringify(deployment, null, 2))

    // Simulate build process
    await new Promise(resolve => setTimeout(resolve, 2000))

    deployment.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Building for ${deployment.target}...`
    })
    await fs.writeFile(deploymentFile, JSON.stringify(deployment, null, 2))

    // Simulate deployment to target
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Generate mock deploy URL
    const siteName = deployment.config?.siteName || `site-${deployment.id}`
    let deployUrl: string

    switch (deployment.target) {
      case 'netlify':
        deployUrl = `https://${siteName}.netlify.app`
        break
      case 'vercel':
        deployUrl = `https://${siteName}.vercel.app`
        break
      case 'github-pages':
        deployUrl = `https://username.github.io/${siteName}`
        break
      case 'custom':
        deployUrl = deployment.config?.customDomain || `https://${siteName}.example.com`
        break
      default:
        deployUrl = `https://${siteName}.webcraft.dev`
    }

    // Update with success
    deployment.status = 'success'
    deployment.deployUrl = deployUrl
    deployment.logs.push({
      timestamp: new Date().toISOString(),
      level: 'success',
      message: `Deployment successful! Site available at ${deployUrl}`
    })
    deployment.completedAt = new Date().toISOString()

    await fs.writeFile(deploymentFile, JSON.stringify(deployment, null, 2))

  } catch (error) {
    // Handle deployment failure
    deployment.status = 'failed'
    deployment.logs.push({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
    deployment.failedAt = new Date().toISOString()

    await fs.writeFile(deploymentFile, JSON.stringify(deployment, null, 2))
  }
}
