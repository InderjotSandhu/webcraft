import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { headers } from 'next/headers'

// Serve generated website files
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path || []
    
    // Construct the full file path
    const fullPath = path.join(process.cwd(), 'generated', ...filePath)
    
    // Security check - ensure we're not serving files outside the generated directory
    const resolvedPath = path.resolve(fullPath)
    const generatedDir = path.resolve(path.join(process.cwd(), 'generated'))
    
    if (!resolvedPath.startsWith(generatedDir)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if file exists
    try {
      await fs.access(resolvedPath)
    } catch {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Get file stats
    const stats = await fs.stat(resolvedPath)
    
    // If it's a directory, look for index.html
    let targetFile = resolvedPath
    if (stats.isDirectory()) {
      targetFile = path.join(resolvedPath, 'index.html')
      try {
        await fs.access(targetFile)
      } catch {
        return new NextResponse('Index file not found', { status: 404 })
      }
    }

    // Read the file
    const fileBuffer = await fs.readFile(targetFile)
    
    // Determine content type based on file extension
    const ext = path.extname(targetFile).toLowerCase()
    let contentType = 'text/plain'
    
    switch (ext) {
      case '.html':
        contentType = 'text/html; charset=utf-8'
        break
      case '.css':
        contentType = 'text/css; charset=utf-8'
        break
      case '.js':
        contentType = 'application/javascript; charset=utf-8'
        break
      case '.json':
        contentType = 'application/json; charset=utf-8'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.svg':
        contentType = 'image/svg+xml'
        break
      case '.ico':
        contentType = 'image/x-icon'
        break
    }

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Generated-By': 'WebCraft'
      }
    })

  } catch (error) {
    console.error('Error serving generated file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// Handle POST requests (not allowed)
export async function POST() {
  return new NextResponse('Method Not Allowed', { status: 405 })
}

// Handle other methods
export async function PUT() {
  return new NextResponse('Method Not Allowed', { status: 405 })
}

export async function DELETE() {
  return new NextResponse('Method Not Allowed', { status: 405 })
}
