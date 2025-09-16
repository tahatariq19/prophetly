import { test, expect } from '@playwright/test'

test.describe('Privacy Features', () => {
  test('displays privacy notice on dashboard', async ({ page }) => {
    await page.goto('/')
    
    // Check for privacy notice
    await expect(page.locator('.alert-info')).toContainText('Privacy Notice')
    await expect(page.locator('.alert-info')).toContainText('No data is stored on our servers')
  })

  test('shows privacy-first branding', async ({ page }) => {
    await page.goto('/')
    
    // Check navbar privacy message
    await expect(page.locator('.navbar')).toContainText('Privacy-First Forecasting')
    
    // Check main title
    await expect(page.locator('h1')).toContainText('Prophet Web Interface')
  })
})