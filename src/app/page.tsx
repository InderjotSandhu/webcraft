import { HeroSection } from "@/components/layout/HeroSection";

export default function Home() {
  return (
    <div>
      <HeroSection />
      
      {/* Additional sections will be added here */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
              Get your professional website live in just 3 simple steps
            </p>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Choose Template</h3>
                <p className="text-muted-foreground">
                  Browse our collection of professional templates and pick the one that fits your needs
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Customize Content</h3>
                <p className="text-muted-foreground">
                  Fill out a simple form with your information, upload your images, and personalize your site
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Deploy & Go Live</h3>
                <p className="text-muted-foreground">
                  Your website is generated instantly and can be deployed with a single click
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
