/**
 * E2E Test: Customer Authentication Flow
 * Tests the login page OTP flow and Google OAuth redirect.
 */
import { test, expect } from '@playwright/test'

test.describe('Customer Authentication', () => {
  test('displays login page with phone input and Google button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('GetNear')).toBeVisible()
    await expect(page.getByPlaceholder('9876543210')).toBeVisible()
    await expect(page.getByRole('button', { name: /send otp/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  })

  test('validates phone number format', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /send otp/i }).click()
    await expect(page.getByText(/phone number is required/i)).toBeVisible()
  })

  test('shows OTP step after valid phone submission', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('9876543210').fill('9876543210')
    // Note: actual OTP sending requires Twilio — this tests the UI transition
    await page.getByRole('button', { name: /send otp/i }).click()
    // Should show loading state or transition to OTP step
    await expect(page.getByRole('button', { name: /sending/i })).toBeVisible()
  })

  test('onboarding redirects to login after completion', async ({ page }) => {
    // Clear localStorage to show onboarding
    await page.goto('/onboarding')
    await expect(page.getByText('Discover Local Businesses')).toBeVisible()
    await page.getByRole('button', { name: /skip/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/account')
    await expect(page).toHaveURL(/\/login/)
  })
})
