'use client'

import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function SettingsBreadcrumbs() {
  const pathname = usePathname()

  // Parse the pathname to extract breadcrumb info
  const getBreadcrumbs = () => {
    if (!pathname) return []

    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: { label: string; href: string | null }[] = [
      { label: 'Organizations', href: '/organizations' }
    ]

    // Check if we're in settings
    const settingsIndex = segments.indexOf('settings')
    if (settingsIndex === -1) return breadcrumbs

    breadcrumbs.push({ label: 'Settings', href: null })

    // Get the section and subsection after 'settings'
    const section = segments[settingsIndex + 1]
    const subsection = segments[settingsIndex + 2]

    if (section) {
      const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1)

      if (subsection) {
        // Has subsection, make section a link
        breadcrumbs.push({ label: sectionLabel, href: null })
        const subsectionLabel = subsection.charAt(0).toUpperCase() + subsection.slice(1)
        breadcrumbs.push({ label: subsectionLabel, href: null })
      } else {
        // No subsection, section is the final page
        breadcrumbs.push({ label: sectionLabel, href: null })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1
          return (
            <div key={crumb.label} className="flex items-center gap-2">
              {index > 0 && <BreadcrumbSeparator className={index === 1 ? "hidden md:block" : ""} />}
              <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                {isLast || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
