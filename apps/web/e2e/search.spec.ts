/**
 * E2E Test: Search and Listing Detail Flow
 * Tests search functionality and listing detail page.
 */
import { test, expect } from '@playwright/test'

test.describe('Search and Listing Detail', () => {
  test('home page displays search bar and categories', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /search for businesses/i })).toBeVisible()
    await expect(page.getByText('Categories')).toBeVisible()
  })

  test('search page shows input and filter chips', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByPlaceholder(/search businesses/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /open now/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /top rated/i })).toBeVisible()
  })

  test('search with query shows results or empty state', async ({ page }) => {
    await page.goto('/search?q=restaurant')
    // Should show either results or "No results found"
    await page.waitForTimeout(2000)
    const hasResults = await page.locator('article[role="button"]').count()
    const hasEmpty = await page.getByText(/no results found/i).isVisible().catch(() => false)
    expect(hasResults > 0 || hasEmpty).toBeTruthy()
  })

  test('clicking a category navigates to search with filter', async ({ page }) => {
    await page.goto('/')
    const foodButton = page.getByRole('button', { name: /browse food/i })
    if (await foodButton.isVisible()) {
      await foodButton.click()
      await expect(page).toHaveURL(/\/search/)
    }
  })

  test('map/list toggle switches view mode', async ({ page }) => {
    await page.goto('/search')
    const toggleButton = page.getByRole('button', { name: /switch to map view/i })
    if (await toggleButton.isVisible()) {
      await toggleButton.click()
      await expect(page.getByText(/map view coming soon/i)).toBeVisible()
    }
  })
})
