import * as React from 'react'
import { cn } from '@/lib/utils'

interface ContentWrapperProps {
    children: React.ReactNode
    variant?: 'full' | 'narrow'
    className?: string
}

/**
 * ContentWrapper - A layout component that provides width constraints for page content
 * 
 * @param variant - Layout variant:
 *   - 'full': Full width, no max-width constraint (for tables, data views)
 *   - 'narrow': Constrained width with max-w-4xl for better readability (for forms, settings)
 * @param className - Additional CSS classes to apply
 */
export function ContentWrapper({
    children,
    variant = 'full',
    className,
}: ContentWrapperProps) {
    return (
        <div
            className={cn(
                'w-full flex flex-col p-4 pt-0',
                variant === 'narrow' && 'max-w-4xl mx-auto',
                className
            )}
        >
            {children}
        </div>
    )
}
