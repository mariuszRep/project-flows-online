'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useIsMobile } from '@/hooks/use-mobile'
import { createClient } from '@/lib/supabase/client'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuContent,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

export function MarketingNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const isMobile = useIsMobile()
  const [activeSection, setActiveSection] = React.useState<string>('hero')

  React.useEffect(() => {
    // Only track sections when on the homepage
    if (pathname !== '/') {
      setActiveSection('')
      return
    }

    const sections = ['hero', 'features', 'plans', 'contact']

    const updateActiveSection = () => {
      // Get all section elements and their positions
      const sectionElements = sections
        .map((id) => {
          const element = document.getElementById(id)
          if (!element) return null
          const rect = element.getBoundingClientRect()
          return { id, element, top: rect.top, bottom: rect.bottom, height: rect.height }
        })
        .filter(Boolean) as Array<{
          id: string
          element: HTMLElement
          top: number
          bottom: number
          height: number
        }>

      // Find which section is most visible in viewport
      // Priority: section that has its top most in the upper half of viewport
      const viewportCenter = window.innerHeight / 2

      let activeId = 'hero'
      let closestDistance = Infinity

      for (const section of sectionElements) {
        // Check if section is in viewport
        if (section.bottom > 0 && section.top < window.innerHeight) {
          // Calculate distance from section top to viewport top
          // Sections with top closer to viewport top (but below it) are preferred
          const distanceFromTop = Math.abs(section.top)

          // If section top is above viewport but section is still visible, use a penalty
          const distance = section.top < 100 && section.top > -100 ? distanceFromTop : distanceFromTop + 1000

          if (distance < closestDistance) {
            closestDistance = distance
            activeId = section.id
          }
        }
      }

      // Special case: if scrolled to very bottom, show contact
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10
      if (scrolledToBottom) {
        activeId = 'contact'
      }

      setActiveSection(activeId)
    }

    // Initial check
    updateActiveSection()

    // Update on scroll with passive listener for better performance
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveSection()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', updateActiveSection)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [pathname])

  const handleNavigationClick = (href: string, hash?: string) => {
    if (pathname === '/' && hash) {
      // On homepage, use smooth scroll to section
      const element = document.getElementById(hash)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // On other pages, navigate to homepage with hash or to dedicated page
      if (hash === 'contact') {
        router.push('/contact')
      } else if (hash === 'plans') {
        router.push('/plans')
      } else {
        router.push(href)
      }
    }
  }

  const resources: { title: string; href: string; description: string }[] = [
    {
      title: "About Us",
      href: "/about",
      description: "Learn about our mission, vision, and the team behind our platform",
    },
  ]

  function ListItem({
    title,
    children,
    href,
    ...props
  }: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
    return (
      <li {...props}>
        <NavigationMenuLink asChild>
          <Link
            href={href}
            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          </Link>
        </NavigationMenuLink>
      </li>
    )
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-lg font-bold">SaaS Template</span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <NavigationMenu viewport={isMobile} className="hidden md:flex">
          <NavigationMenuList className="flex-wrap">
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(
                  navigationMenuTriggerStyle(),
                  pathname === '/' && activeSection === 'hero' && 'bg-accent text-accent-foreground'
                )}
                onClick={() => handleNavigationClick('/', 'hero')}
              >
                <span className="cursor-pointer">Home</span>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(
                  navigationMenuTriggerStyle(),
                  pathname === '/' && activeSection === 'features' && 'bg-accent text-accent-foreground'
                )}
                onClick={() => handleNavigationClick('/', 'features')}
              >
                <span className="cursor-pointer">Features</span>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(
                  navigationMenuTriggerStyle(),
                  (pathname === '/plans' || (pathname === '/' && activeSection === 'plans')) && 'bg-accent text-accent-foreground'
                )}
                onClick={() => handleNavigationClick('/plans', 'plans')}
              >
                <span className="cursor-pointer">Plans</span>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(
                  navigationMenuTriggerStyle(),
                  pathname === '/contact' && 'bg-accent text-accent-foreground'
                )}
                onClick={() => handleNavigationClick('/contact', 'contact')}
              >
                <span className="cursor-pointer">Contact</span>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-2 sm:w-[400px] md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                  {resources.map((resource) => (
                    <ListItem
                      key={resource.title}
                      title={resource.title}
                      href={resource.href}
                    >
                      {resource.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right: Auth Buttons + Theme Toggle */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <>
              <Button asChild>
                <Link href="/organizations">
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
                <span>Sign out</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button onClick={() => handleNavigationClick('/plans', 'plans')}>
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
