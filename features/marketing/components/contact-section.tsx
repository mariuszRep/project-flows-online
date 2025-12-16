import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import Link from 'next/link'

export function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-16 py-16 sm:py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Still have questions?
            </h2>
            <p className="text-lg text-muted-foreground">
              Contact our sales team for custom enterprise solutions
            </p>
          </div>

          <div className="pt-4">
            <Button asChild size="lg">
              <Link href="/contact">
                <Mail className="h-5 w-5" />
                <span>Contact Sales Team</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
