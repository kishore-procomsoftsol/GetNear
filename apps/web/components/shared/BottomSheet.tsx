'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  className,
}: BottomSheetProps) {
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)

  // Focus the close button when the sheet opens for keyboard accessibility
  React.useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation to start before focusing
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet panel */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Bottom sheet'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-xl',
              'max-h-[90vh] flex flex-col',
              className
            )}
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-3 pb-1 flex-shrink-0"
              aria-hidden="true"
            >
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
              {title ? (
                <h2 className="text-base font-semibold text-dark">{title}</h2>
              ) : (
                <span />
              )}
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className={cn(
                  'rounded-md p-1.5 text-muted hover:text-dark hover:bg-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                  'transition-colors'
                )}
                aria-label="Close"
                autoFocus
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-4 pb-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
