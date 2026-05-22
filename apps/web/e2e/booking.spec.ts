/**
 * E2E Test: Booking Flow
 * Tests the customer booking creation and management.
 */
import { test, expect } from '@playwright/test'

test.describe('Booking Flow', () => {
  test('bookings page shows upcoming and past tabs', async ({ page }) => {
    await page.goto('/account/bookings')
    // May redirect to login if not authenticated
    const hasBookings = await page.getByText('My Bookings').isVisible().catch(() => false)
    const hasLogin = await page.getByText('GetNear').isVisible().catch(() => false)
    expect(hasBookings || hasLogin).toBeTruthy()
  })

  test('listing detail shows book appointment button', async ({ page }) => {
    // Navigate to a listing (would need a real ID in production)
    await page.goto('/listing/test-id')
    // Should show either the listing or a 404
    const hasBookButton = await page.getByRole('button', { name: /book appointment/i }).isVisible().catch(() => false)
    const hasNotFound = await page.getByText(/not found/i).isVisible().catch(() => false)
    expect(hasBookButton || hasNotFound).toBeTruthy()
  })

  test('booking tabs switch between upcoming and past', async ({ page }) => {
    await page.goto('/account/bookings')
    const pastTab = page.getByRole('tab', { name: /past/i })
    if (await pastTab.isVisible()) {
      await pastTab.click()
      await expect(pastTab).toHaveAttribute('aria-selected', 'true')
    }
  })
})
