'use client'

import Image, { type ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

/**
 * A tiny 1x1 gray gradient used as a blur placeholder.
 * Keeps the page visually stable while images load.
 */
const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F/PQAJhAN4kGk5RAAAAABJRU5ErkJggg=='

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder' | 'blurDataURL'> {
  /** Override the default blur placeholder */
  customBlurDataURL?: string
}

/**
 * Wrapper around next/image that adds:
 * - A blurDataURL placeholder (tiny base64 gray gradient)
 * - placeholder="blur" prop
 * - Proper sizes attribute defaults
 * - loading="lazy" by default
 */
export function OptimizedImage({
  customBlurDataURL,
  loading = 'lazy',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <Image
      placeholder="blur"
      blurDataURL={customBlurDataURL ?? BLUR_DATA_URL}
      loading={loading}
      sizes={sizes}
      className={cn('object-cover', className)}
      {...props}
    />
  )
}
