'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Slide data ───────────────────────────────────────────────────────────────

const slides = [
  {
    emoji: '🔍',
    title: 'Discover Local Businesses',
    description: 'Find restaurants, cafes, hospitals and more near you',
  },
  {
    emoji: '🗺️',
    title: 'Navigate with Ease',
    description: 'Get directions and contact businesses instantly',
  },
  {
    emoji: '❤️',
    title: 'Save Your Favourites',
    description: 'Create collections of your favourite places',
  },
] as const

// ─── Animation variants ───────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

const transition = {
  duration: 0.35,
  ease: 'easeInOut' as const,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [mounted, setMounted] = useState(false)

  // Check localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('onboarding_seen')
      if (seen === 'true') {
        router.replace('/login')
      }
    }
  }, [router])

  const completeOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_seen', 'true')
    }
    router.push('/login')
  }

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setDirection(1)
      setCurrentIndex((prev) => prev + 1)
    } else {
      completeOnboarding()
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  const handleDotClick = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
  }

  const isLastSlide = currentIndex === slides.length - 1

  // Don't render until mounted to avoid flash before redirect
  if (!mounted) return null

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      {/* Skip link — top right */}
      <div className="absolute right-4 top-4 z-10">
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm font-medium text-muted hover:text-dark transition-colors"
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      </div>

      {/* Slide area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="flex w-full flex-col items-center gap-6 text-center"
          >
            {/* Emoji illustration */}
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full bg-orange-50 text-6xl"
              aria-hidden="true"
            >
              {slides[currentIndex].emoji}
            </div>

            {/* Text content */}
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-dark">
                {slides[currentIndex].title}
              </h2>
              <p className="text-base text-muted leading-relaxed">
                {slides[currentIndex].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col items-center gap-6 px-6 pb-10">
        {/* Dot indicators */}
        <div className="flex items-center gap-2" role="tablist" aria-label="Slide indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => handleDotClick(index)}
              className={[
                'h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-6 bg-primary'
                  : 'w-2 bg-gray-300 hover:bg-gray-400',
              ].join(' ')}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          type="button"
          onClick={handleNext}
          className={[
            'w-full max-w-sm rounded-xl py-3 text-base font-semibold text-white',
            'bg-primary transition-opacity hover:opacity-90 active:opacity-80',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          ].join(' ')}
        >
          {isLastSlide ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  )
}
