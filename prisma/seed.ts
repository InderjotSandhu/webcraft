import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data
  await prisma.project.deleteMany()
  await prisma.template.deleteMany()
  await prisma.user.deleteMany()

  // Create sample templates
  const portfolioTemplate = await prisma.template.create({
    data: {
      name: 'Modern Portfolio',
      category: 'portfolio',
      previewImage: '/templates/modern-portfolio/preview.jpg',
      metadata: {
        id: 'modern-portfolio',
        name: 'Modern Portfolio',
        category: 'portfolio',
        tags: ['modern', 'minimalist', 'responsive', 'portfolio'],
        preview_image: '/templates/modern-portfolio/preview.jpg',
        fields: [
          {
            name: 'full_name',
            label: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'John Doe'
          },
          {
            name: 'tagline',
            label: 'Professional Tagline',
            type: 'text',
            required: true,
            placeholder: 'Full Stack Developer & Designer'
          },
          {
            name: 'profile_image',
            label: 'Profile Photo',
            type: 'image',
            required: false,
            max_size: '5MB'
          },
          {
            name: 'bio',
            label: 'About Me',
            type: 'textarea',
            required: true,
            placeholder: 'Tell visitors about yourself...'
          },
          {
            name: 'skills',
            label: 'Skills',
            type: 'array',
            required: true,
            max_items: 15
          },
          {
            name: 'projects',
            label: 'Featured Projects',
            type: 'array',
            required: false,
            max_items: 6
          },
          {
            name: 'email',
            label: 'Email Address',
            type: 'text',
            required: true,
            placeholder: 'john@example.com'
          },
          {
            name: 'github_url',
            label: 'GitHub URL',
            type: 'text',
            required: false,
            placeholder: 'https://github.com/johndoe'
          },
          {
            name: 'linkedin_url',
            label: 'LinkedIn URL',
            type: 'text',
            required: false,
            placeholder: 'https://linkedin.com/in/johndoe'
          }
        ],
        assets: {
          html: '/templates/modern-portfolio/index.html',
          css: '/templates/modern-portfolio/styles.css',
          js: '/templates/modern-portfolio/script.js'
        }
      }
    }
  })

  const businessTemplate = await prisma.template.create({
    data: {
      name: 'Professional Business',
      category: 'business',
      previewImage: '/templates/professional-business/preview.jpg',
      metadata: {
        id: 'professional-business',
        name: 'Professional Business',
        category: 'business',
        tags: ['business', 'corporate', 'professional', 'landing-page'],
        preview_image: '/templates/professional-business/preview.jpg',
        fields: [
          {
            name: 'business_name',
            label: 'Business Name',
            type: 'text',
            required: true,
            placeholder: 'Your Company Name'
          },
          {
            name: 'tagline',
            label: 'Business Tagline',
            type: 'text',
            required: true,
            placeholder: 'We help businesses grow'
          },
          {
            name: 'logo',
            label: 'Company Logo',
            type: 'image',
            required: false,
            max_size: '2MB'
          },
          {
            name: 'hero_image',
            label: 'Hero Background Image',
            type: 'image',
            required: false,
            max_size: '5MB'
          },
          {
            name: 'description',
            label: 'Business Description',
            type: 'textarea',
            required: true,
            placeholder: 'Describe what your business does...'
          },
          {
            name: 'services',
            label: 'Services/Products',
            type: 'array',
            required: true,
            max_items: 8
          },
          {
            name: 'contact_email',
            label: 'Contact Email',
            type: 'text',
            required: true,
            placeholder: 'info@company.com'
          },
          {
            name: 'phone',
            label: 'Phone Number',
            type: 'text',
            required: false,
            placeholder: '+1 (555) 123-4567'
          },
          {
            name: 'address',
            label: 'Business Address',
            type: 'text',
            required: false,
            placeholder: '123 Main St, City, State 12345'
          }
        ],
        assets: {
          html: '/templates/professional-business/index.html',
          css: '/templates/professional-business/styles.css'
        }
      }
    }
  })

  const eventTemplate = await prisma.template.create({
    data: {
      name: 'Event Landing Page',
      category: 'events',
      previewImage: '/templates/event-landing/preview.jpg',
      metadata: {
        id: 'event-landing',
        name: 'Event Landing Page',
        category: 'events',
        tags: ['event', 'conference', 'workshop', 'landing-page'],
        preview_image: '/templates/event-landing/preview.jpg',
        fields: [
          {
            name: 'event_name',
            label: 'Event Name',
            type: 'text',
            required: true,
            placeholder: 'Annual Tech Conference 2024'
          },
          {
            name: 'event_date',
            label: 'Event Date',
            type: 'text',
            required: true,
            placeholder: 'March 15-17, 2024'
          },
          {
            name: 'event_location',
            label: 'Event Location',
            type: 'text',
            required: true,
            placeholder: 'San Francisco, CA'
          },
          {
            name: 'event_image',
            label: 'Event Hero Image',
            type: 'image',
            required: false,
            max_size: '5MB'
          },
          {
            name: 'description',
            label: 'Event Description',
            type: 'textarea',
            required: true,
            placeholder: 'Describe your event...'
          },
          {
            name: 'speakers',
            label: 'Featured Speakers',
            type: 'array',
            required: false,
            max_items: 10
          },
          {
            name: 'schedule',
            label: 'Event Schedule',
            type: 'array',
            required: false,
            max_items: 20
          },
          {
            name: 'ticket_price',
            label: 'Ticket Price',
            type: 'text',
            required: false,
            placeholder: '$299'
          },
          {
            name: 'registration_url',
            label: 'Registration URL',
            type: 'text',
            required: false,
            placeholder: 'https://eventbrite.com/your-event'
          }
        ],
        assets: {
          html: '/templates/event-landing/index.html',
          css: '/templates/event-landing/styles.css'
        }
      }
    }
  })

  const contactTemplate = await prisma.template.create({
    data: {
      name: 'Simple Contact Page',
      category: 'contact',
      previewImage: '/templates/simple-contact/preview.jpg',
      metadata: {
        id: 'simple-contact',
        name: 'Simple Contact Page',
        category: 'contact',
        tags: ['contact', 'simple', 'minimal', 'form'],
        preview_image: '/templates/simple-contact/preview.jpg',
        fields: [
          {
            name: 'page_title',
            label: 'Page Title',
            type: 'text',
            required: true,
            placeholder: 'Get In Touch'
          },
          {
            name: 'subtitle',
            label: 'Subtitle',
            type: 'text',
            required: false,
            placeholder: 'We\'d love to hear from you'
          },
          {
            name: 'contact_email',
            label: 'Contact Email',
            type: 'text',
            required: true,
            placeholder: 'hello@example.com'
          },
          {
            name: 'phone',
            label: 'Phone Number',
            type: 'text',
            required: false,
            placeholder: '+1 (555) 123-4567'
          },
          {
            name: 'address',
            label: 'Address',
            type: 'textarea',
            required: false,
            placeholder: '123 Main Street\\nCity, State 12345'
          },
          {
            name: 'business_hours',
            label: 'Business Hours',
            type: 'textarea',
            required: false,
            placeholder: 'Monday - Friday: 9:00 AM - 6:00 PM\\nSaturday: 10:00 AM - 4:00 PM'
          }
        ],
        assets: {
          html: '/templates/simple-contact/index.html',
          css: '/templates/simple-contact/styles.css'
        }
      }
    }
  })

  // Create a test user
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null
    }
  })

  // Create a sample project
  await prisma.project.create({
    data: {
      name: 'My Portfolio Website',
      userId: testUser.id,
      templateId: portfolioTemplate.id,
      data: {
        full_name: 'John Doe',
        tagline: 'Full Stack Developer',
        email: 'john@example.com',
        bio: 'Passionate developer with 5 years of experience building web applications.',
        skills: ['JavaScript', 'React', 'Node.js', 'Python', 'PostgreSQL']
      },
      status: 'DRAFT'
    }
  })

  console.log('✅ Database seeded successfully!')
  console.log(`Created ${await prisma.template.count()} templates`)
  console.log(`Created ${await prisma.user.count()} users`)
  console.log(`Created ${await prisma.project.count()} projects`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
