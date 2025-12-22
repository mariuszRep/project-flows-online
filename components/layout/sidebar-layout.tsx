'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface SidebarLayoutProps {
    sidebar: React.ReactNode
    header?: React.ReactNode
    children: React.ReactNode
    defaultOpen?: boolean
}

function SidebarHeader({ children }: { children: React.ReactNode }) {
    const { state, isMobile } = useSidebar()
    const shouldShrink = !isMobile && state === "collapsed"

    return (
        <header
            className={cn(
                "flex shrink-0 items-center gap-2 transition-[width,height] ease-linear",
                shouldShrink ? "h-12" : "h-16"
            )}
        >
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                {children}
            </div>
        </header>
    )
}

export function SidebarLayout({
    sidebar,
    header,
    children,
    defaultOpen = true
}: SidebarLayoutProps) {
    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            {sidebar}
            <SidebarInset>
                {header && (
                    <SidebarHeader>
                        {header}
                    </SidebarHeader>
                )}
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}
