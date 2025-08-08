import Link from 'next/link'
import { Palette, Github, Twitter, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <Palette className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">WebCraft</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create beautiful websites in minutes with our professional templates and easy-to-use customization tools.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Product</h3>
            <div className="space-y-2 text-sm">
              <Link href="/gallery" className="block text-muted-foreground hover:text-primary transition-colors">
                Templates
              </Link>
              <Link href="/features" className="block text-muted-foreground hover:text-primary transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="block text-muted-foreground hover:text-primary transition-colors">
                Pricing
              </Link>
              <Link href="/examples" className="block text-muted-foreground hover:text-primary transition-colors">
                Examples
              </Link>
            </div>
          </div>

          {/* Support Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Support</h3>
            <div className="space-y-2 text-sm">
              <Link href="/help" className="block text-muted-foreground hover:text-primary transition-colors">
                Help Center
              </Link>
              <Link href="/docs" className="block text-muted-foreground hover:text-primary transition-colors">
                Documentation
              </Link>
              <Link href="/contact" className="block text-muted-foreground hover:text-primary transition-colors">
                Contact Us
              </Link>
              <Link href="/status" className="block text-muted-foreground hover:text-primary transition-colors">
                Status
              </Link>
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Legal</h3>
            <div className="space-y-2 text-sm">
              <Link href="/privacy" className="block text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link href="/cookies" className="block text-muted-foreground hover:text-primary transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © 2024 WebCraft. All rights reserved.
          </p>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <Link 
              href="https://github.com/yourusername/webcraft" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
            <Link 
              href="https://twitter.com/webcraft" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link 
              href="mailto:support@webcraft.com" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-5 w-5" />
              <span className="sr-only">Email</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
