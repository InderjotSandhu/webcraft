import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Zap, Globe } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-background via-background to-background/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-black/[0.02] bg-[size:20px_20px]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-8">
            <Sparkles className="w-4 h-4 mr-2" />
            Launch your website in minutes, not days
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Create{' '}
            <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
              Beautiful Websites
            </span>{' '}
            Without Code
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Choose from our library of professional templates, customize with your content, 
            and deploy instantly. No technical skills required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button size="lg" className="text-lg px-8 py-4 h-auto" asChild>
              <Link href="/gallery">
                Browse Templates
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 h-auto" asChild>
              <Link href="/demo">
                Watch Demo
              </Link>
            </Button>
          </div>

          {/* Features grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center p-6 rounded-2xl bg-card border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground text-center">
                Generate your website in seconds with our optimized templates
              </p>
            </div>

            <div className="flex flex-col items-center p-6 rounded-2xl bg-card border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Deploy Anywhere</h3>
              <p className="text-sm text-muted-foreground text-center">
                One-click deployment to popular hosting platforms
              </p>
            </div>

            <div className="flex flex-col items-center p-6 rounded-2xl bg-card border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Professional Design</h3>
              <p className="text-sm text-muted-foreground text-center">
                Crafted by designers, optimized for all devices
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
