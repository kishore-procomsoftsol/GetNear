/**
 * E2E Test: Add Business Submission Flow
 * Tests the multi-step business creation form.
 */
import { test, expect } from '@playwright/test'

test.describe('Add Business Flow', () => {
  test('add business page shows step 1 form', async ({ page }) => {
    // Note: requires authenticated business user
    await page.goto('/add-business')
    await expect(page.getByText('Add Your Business')).toBeVisible()
    await expect(page.getByText('Step 1 of 5')).toBeVisible()
    await expect(page.getByLabel(/business name/i)).toBeVisible()
  })

  test('validates required fields before submission', async ({ page }) => {
    await page.goto('/add-business')
    await page.getByRole('button', { name: /submit business/i }).click()
    await expect(page.getByText(/business name is required/i)).toBeVisible()
  })

  test('category dropdown shows options', async ({ page }) => {
    await page.goto('/add-business')
    const select = page.locator('select')
    await expect(select).toBeVisible()
    const options = await select.locator('option').count()
    expect(options).toBeGreaterThan(1) // At least "Select a category" + real options
  })

  test('business type selector works', async ({ page }) => {
    await page.goto('/add-business')
    const serviceButton = page.getByRole('button', { name: /service/i })
    await serviceButton.click()
    await expect(serviceButton).toHaveClass(/border-primary/)
  })
})
