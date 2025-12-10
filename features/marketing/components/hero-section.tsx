'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const { left, top } = containerRef.current.getBoundingClientRect()
      const x = e.clientX - left
      const y = e.clientY - top

      containerRef.current.style.setProperty('--mouse-x', `${x}px`)
      containerRef.current.style.setProperty('--mouse-y', `${y}px`)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section id="hero" className="relative flex min-h-screen items-center justify-center overflow-hidden py-16">
      {/* Spotlight Gradient Background */}
      <div
        ref={containerRef}
        className="absolute inset-0 -z-10"
        style={
          {
            '--mouse-x': '50%',
            '--mouse-y': '50%',
          } as React.CSSProperties
        }
      >
        {/* Base dark background */}
        <div className="absolute inset-0 bg-background" />

        {/* Gradient Reveal Track - Visible spotlight effect */}
        <div
          className="absolute inset-0 opacity-8 blur-xl"
          style={{
            background:
              'radial-gradient(circle 250px at var(--mouse-x) var(--mouse-y), var(--primary), var(--accent), transparent)',
          }}
        />

        {/* Ambient Diffusion - Soft glow around cursor */}
        <div
          className="pointer-events-none absolute left-0 top-0 h-[500px] w-[500px] rounded-full opacity-12 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, var(--primary) 0%, var(--accent) 50%, transparent 100%)',
            transform:
              'translate(calc(var(--mouse-x) - 250px), calc(var(--mouse-y) - 250px))',
          }}
        />

        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.02] mix-blend-soft-light">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>
      </div>

      <div className="container relative z-10 mx-auto px-4 max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Build Your SaaS Faster with Next.js, Supabase & Stripe
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
          A complete multi-tenant SaaS platform with authentication, subscriptions,
          and modern UI. Launch your product in days, not months.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <a href="#plans">Get Started</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#plans">View Plans</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
