import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { TemplateEngine, TemplateConfig } from '@/lib/template-engine'

// Validation schema for generation request
const generateSchema = z.object({
  templateId: z.string().min(1),
  projectName: z.string().min(1).max(100),
  formData: z.record(z.string()),
  userId: z.string().min(1, 'User ID is required')
})

type GenerateRequest = z.infer<typeof generateSchema>

// Mock template data - this would come from database in production
const getTemplateById = (id: string) => {
  const templates: Record<string, any> = {
    'modern-portfolio': {
      id: 'modern-portfolio',
      name: 'Modern Portfolio',
      category: 'portfolio',
      htmlTemplate: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{full_name}} - Portfolio</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 2rem 0;
            text-align: center;
            box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
        }
        
        .profile-img {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            margin: 0 auto 1rem;
            object-fit: cover;
            border: 4px solid #667eea;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
        }
        
        .name {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .tagline {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 1rem;
        }
        
        .contact-info {
            display: flex;
            justify-content: center;
            gap: 2rem;
            flex-wrap: wrap;
            margin-top: 1rem;
        }
        
        .contact-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #555;
            text-decoration: none;
            padding: 0.5rem 1rem;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 25px;
            transition: all 0.3s ease;
        }
        
        .contact-item:hover {
            background: rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
        }
        
        main {
            padding: 4rem 0;
        }
        
        .section {
            background: white;
            margin: 2rem 0;
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 10px 50px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }
        
        .section h2 {
            font-size: 2rem;
            margin-bottom: 1.5rem;
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 0.5rem;
            display: inline-block;
        }
        
        .bio {
            font-size: 1.1rem;
            line-height: 1.8;
            color: #555;
        }
        
        .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .skill {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 25px;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            transform: translateY(0);
            transition: transform 0.3s ease;
        }
        
        .skill:hover {
            transform: translateY(-3px);
        }
        
        footer {
            background: rgba(0, 0, 0, 0.9);
            color: white;
            text-align: center;
            padding: 2rem 0;
            margin-top: 3rem;
        }
        
        @media (max-width: 768px) {
            .name {
                font-size: 2rem;
            }
            
            .contact-info {
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            
            .section {
                padding: 2rem;
                margin: 1rem 0;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            {{#if profile_image}}
            <img src="{{profile_image}}" alt="{{full_name}}" class="profile-img">
            {{else}}
            <div class="profile-img" style="background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem; font-weight: bold;">
                {{full_name_initial}}
            </div>
            {{/if}}
            <h1 class="name">{{full_name}}</h1>
            <p class="tagline">{{tagline}}</p>
            
            <div class="contact-info">
                {{#if email}}
                <a href="mailto:{{email}}" class="contact-item">
                    📧 {{email}}
                </a>
                {{/if}}
                {{#if phone}}
                <a href="tel:{{phone}}" class="contact-item">
                    📞 {{phone}}
                </a>
                {{/if}}
            </div>
        </div>
    </header>
    
    <main>
        <div class="container">
            {{#if bio}}
            <section class="section">
                <h2>About Me</h2>
                <p class="bio">{{bio}}</p>
            </section>
            {{/if}}
            
            {{#if skills}}
            <section class="section">
                <h2>Skills</h2>
                <div class="skills">
                    {{#each skills}}
                    <span class="skill">{{this}}</span>
                    {{/each}}
                </div>
            </section>
            {{/if}}
        </div>
    </main>
    
    <footer>
        <div class="container">
            <p>&copy; 2025 {{full_name}}. Built with WebCraft.</p>
        </div>
    </footer>
</body>
</html>`,
      fields: [
        { name: 'full_name', type: 'text', required: true },
        { name: 'tagline', type: 'text', required: true },
        { name: 'bio', type: 'textarea', required: true },
        { name: 'email', type: 'text', required: true },
        { name: 'phone', type: 'text', required: false },
        { name: 'skills', type: 'text', required: false },
        { name: 'profile_image', type: 'image', required: false }
      ]
    }
  }
  
  return templates[id] || null
}

// Simple template engine for replacing placeholders
const processTemplate = (template: string, data: Record<string, string>): string => {
  let processed = template

  // Handle conditional blocks {{#if field}}...{{/if}}
  processed = processed.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, field, content) => {
    return data[field] && data[field].trim() ? content : ''
  })

  // Handle each loops {{#each field}}...{{/each}} for comma-separated values
  processed = processed.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, field, itemTemplate) => {
    if (!data[field] || !data[field].trim()) return ''
    
    const items = data[field].split(',').map(item => item.trim()).filter(Boolean)
    return items.map(item => itemTemplate.replace(/\{\{this\}\}/g, item)).join('')
  })

  // Handle simple replacements {{field}}
  processed = processed.replace(/\{\{(\w+)\}\}/g, (match, field) => {
    if (field === 'full_name_initial' && data.full_name) {
      return data.full_name.charAt(0).toUpperCase()
    }
    return data[field] || ''
  })

  return processed
}

// Generate unique project ID
const generateProjectId = (): string => {
  return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Simulate file system operations (in production, this would use cloud storage)
const saveGeneratedSite = async (projectId: string, html: string): Promise<string> => {
  const outputDir = path.join(process.cwd(), 'generated', projectId)
  
  try {
    // Create directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true })
    
    // Write HTML file
    await fs.writeFile(path.join(outputDir, 'index.html'), html, 'utf8')
    
    // In production, this would return a CDN URL
    return `/generated/${projectId}/index.html`
  } catch (error) {
    console.error('Error saving generated site:', error)
    throw new Error('Failed to save generated website')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validationResult = generateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { templateId, projectName, formData, userId } = validationResult.data

    // Get template
    const template = getTemplateById(templateId)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Validate that all required fields are present
    const missingFields = template.fields
      .filter((field: any) => field.required && !formData[field.name])
      .map((field: any) => field.name)

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          missingFields 
        },
        { status: 400 }
      )
    }

    // Generate project ID
    const projectId = generateProjectId()

    // Convert template to new format
    const templateConfig: TemplateConfig = {
      id: template.id,
      name: template.name,
      category: template.category,
      assets: {
        html: template.htmlTemplate
      },
      fields: template.fields
    }

    // Use enhanced template engine
    const engine = new TemplateEngine(projectId)
    const siteUrl = await engine.processTemplate(templateConfig, formData)

    // Save project to database
    const project = await prisma.project.create({
      data: {
        userId: userId,
        templateId: templateId,
        name: projectName,
        data: formData,
        generatedUrl: siteUrl,
        status: 'COMPLETED'
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            previewImage: true
          }
        }
      }
    })

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      project: project,
      message: 'Website generated successfully!'
    })

  } catch (error) {
    console.error('Generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'website-generation-api',
    timestamp: new Date().toISOString()
  })
}
