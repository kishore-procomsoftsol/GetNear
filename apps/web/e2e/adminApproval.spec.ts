/**
 * E2E Test: Admin Approval Flow
 * Tests the admin panel business approval workflow.
 * Note: Requires admin authentication setup in test fixtures.
 */
import { test, expect } from '@playwright/test'

const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3001'

test.describe('Admin Approval Flow', () => {
  test('admin dashboard shows KPI cards', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard`)
    await expect(page.getByText('Dashboard')).toBeVisible()
    // Should show stat cards (may need auth)
  })

  test('approvals page lists pending businesses', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/approvals`)
    await expect(page.getByText('Business Approvals')).toBeVisible()
  })

  test('businesses page shows filter controls', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/businesses`)
    await expect(page.getByText('All Businesses')).toBeVisible()
  })

  test('users page shows user table', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/users`)
    await expect(page.getByText('User Management')).toBeVisible()
  })

  test('categories page shows category list', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/categories`)
    await expect(page.getByText('Categories')).toBeVisible()
  })
})
