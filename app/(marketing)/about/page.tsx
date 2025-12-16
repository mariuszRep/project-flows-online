import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'About Us - [Company Name]',
  description: 'Learn about our mission, vision, and the team behind [Company Name]',
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            About [Company Name]
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're building the future of [industry/field] by empowering teams with 
            powerful, intuitive tools that drive innovation and growth.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-lg leading-relaxed">
                To democratize [specific capability] by providing accessible, powerful, 
                and user-friendly solutions that enable teams of all sizes to achieve 
                their goals efficiently and effectively.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-lg leading-relaxed">
                To become the global leader in [industry/field], setting new standards 
                for innovation, user experience, and customer success while fostering 
                a community of passionate users and contributors.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Our Story */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Our Story</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-lg leading-relaxed">
              [Company Name] was founded in [year] by [founder names] who experienced firsthand 
              the challenges of [specific problem]. After years of working in [relevant industry], 
              they recognized a critical gap in the market for a solution that was both powerful 
              and accessible.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              What started as a side project quickly grew into a passion-driven mission to 
              revolutionize how teams [specific activity]. Today, we're proud to serve thousands 
              of customers worldwide, helping them achieve remarkable results with our platform.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Our journey has been marked by continuous innovation, customer-centric development, 
              and an unwavering commitment to excellence. Every feature we build, every decision 
              we make, is guided by our core belief that great software should empower people, 
              not complicate their lives.
            </p>
          </CardContent>
        </Card>

        {/* Core Values */}
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Our Values</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The principles that guide everything we do, from product development to customer support
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Customer First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We obsess over our customers' success and build products that solve real problems. 
                  Every decision starts with "How does this help our customers?"
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We challenge the status quo and embrace new ideas. Innovation isn't just about 
                  technology—it's about finding better ways to solve problems.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Transparency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We believe in open communication and honesty with our customers, team members, 
                  and stakeholders. Trust is built through transparency.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We pursue excellence in everything we do, from code quality to customer support. 
                  Good enough is never good enough for our customers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Great things happen when diverse minds work together. We foster collaboration 
                  within our team and with our customers to achieve extraordinary results.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Continuous Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We're curious by nature and committed to growing personally and professionally. 
                  Every challenge is an opportunity to learn and improve.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Section */}
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Meet Our Team</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The talented individuals behind [Company Name] who work tirelessly to bring you the best possible experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground">
                    [Photo]
                  </span>
                </div>
                <h3 className="font-semibold text-lg">[Founder Name]</h3>
                <p className="text-muted-foreground text-sm mb-2">CEO & Founder</p>
                <p className="text-muted-foreground text-sm">
                  [Brief bio about founder's background and expertise]
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground">
                    [Photo]
                  </span>
                </div>
                <h3 className="font-semibold text-lg">[Team Member Name]</h3>
                <p className="text-muted-foreground text-sm mb-2">CTO</p>
                <p className="text-muted-foreground text-sm">
                  [Brief bio about technical leadership and experience]
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground">
                    [Photo]
                  </span>
                </div>
                <h3 className="font-semibold text-lg">[Team Member Name]</h3>
                <p className="text-muted-foreground text-sm mb-2">Head of Product</p>
                <p className="text-muted-foreground text-sm">
                  [Brief bio about product management background]
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground">
                    [Photo]
                  </span>
                </div>
                <h3 className="font-semibold text-lg">[Team Member Name]</h3>
                <p className="text-muted-foreground text-sm mb-2">Head of Design</p>
                <p className="text-muted-foreground text-sm">
                  [Brief bio about design experience and philosophy]
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Our Journey</CardTitle>
            <CardDescription>
              Key milestones in our growth and development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-20 text-right">
                  <span className="font-semibold text-muted-foreground">[Year]</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Company Founded</h4>
                  <p className="text-muted-foreground">
                    Started with a simple idea and a small team of passionate founders
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-20 text-right">
                  <span className="font-semibold text-muted-foreground">[Year]</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">First Product Launch</h4>
                  <p className="text-muted-foreground">
                    Released our initial version to the public with [number] beta users
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-20 text-right">
                  <span className="font-semibold text-muted-foreground">[Year]</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Series A Funding</h4>
                  <p className="text-muted-foreground">
                    Raised $[amount] to accelerate product development and expand the team
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-20 text-right">
                  <span className="font-semibold text-muted-foreground">[Year]</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Major Feature Release</h4>
                  <p className="text-muted-foreground">
                    Launched [key feature] that transformed how customers use our platform
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-20 text-right">
                  <span className="font-semibold text-muted-foreground">[Year]</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Global Expansion</h4>
                  <p className="text-muted-foreground">
                    Reached [number] customers across [number] countries worldwide
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Proof */}
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Trusted by Thousands</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join the companies and teams already using [Company Name] to achieve their goals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">[Number]K+</div>
                <p className="text-muted-foreground">Active Users</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">[Number]+</div>
                <p className="text-muted-foreground">Companies</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">[Number]%</div>
                <p className="text-muted-foreground">Customer Satisfaction</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <Card className="bg-primary/5">
          <CardContent className="pt-6 text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join thousands of teams already using [Company Name] to achieve remarkable results. 
              Start your free trial today and see the difference for yourself.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="/plans">Start Free Trial</a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/contact">Contact Sales</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
