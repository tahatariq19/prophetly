import { test, expect } from '@playwright/test'

test.describe('Privacy Workflows - End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('complete privacy-first data upload workflow', async ({ page }) => {
    // Verify privacy notice is displayed
    await expect(page.locator('.privacy-notice')).toContainText('No data is stored on our servers')
    
    // Navigate to upload page
    await page.click('[data-testid="upload-link"]')
    
    // Verify privacy information on upload page
    await expect(page.locator('.upload-privacy-info')).toContainText('processed entirely in server memory')
    await expect(page.locator('.upload-privacy-info')).toContainText('immediately discarded after processing')
    
    // Upload a test CSV file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,value\n2023-01-01,100\n2023-01-02,110\n2023-01-03,105')
    })
    
    // Verify privacy-focused upload feedback
    await expect(page.locator('.upload-status')).toContainText('Processing in memory only')
    await expect(page.locator('.upload-status')).toContainText('No server storage')
    
    // Wait for processing to complete
    await expect(page.locator('.data-preview')).toBeVisible()
    
    // Verify data preview shows privacy information
    await expect(page.locator('.data-privacy-notice')).toContainText('Data exists only in this session')
    
    // Proceed to configuration
    await page.click('[data-testid="proceed-to-config"]')
    
    // Verify configuration page privacy features
    await expect(page.locator('.config-privacy-info')).toContainText('Settings stored in browser cookies only')
  })

  test('session-based data management workflow', async ({ page }) => {
    // Upload test data
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,value\n2023-01-01,100\n2023-01-02,110')
    })
    
    await expect(page.locator('.data-preview')).toBeVisible()
    
    // Navigate to data management
    await page.click('[data-testid="manage-data-link"]')
    
    // Verify session information
    await expect(page.locator('.session-info')).toContainText('Session ID')
    await expect(page.locator('.session-expiry')).toContainText('expires in')
    
    // Verify privacy-focused data management options
    await expect(page.locator('.data-actions')).toContainText('Download for Backup')
    await expect(page.locator('.data-actions')).toContainText('Clear Session Data')
    
    // Test session data clearing
    await page.click('[data-testid="clear-session"]')
    await expect(page.locator('.confirmation-dialog')).toContainText('This will permanently delete all session data')
    
    await page.click('[data-testid="confirm-clear"]')
    await expect(page.locator('.session-cleared-message')).toContainText('All data has been securely removed')
  })

  test('privacy-compliant forecast generation workflow', async ({ page }) => {
    // Setup: Upload data and configure forecast
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'forecast-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,value\n2023-01-01,100\n2023-01-02,110\n2023-01-03,105\n2023-01-04,115')
    })
    
    await page.click('[data-testid="proceed-to-config"]')
    
    // Configure basic forecast parameters
    await page.fill('[data-testid="horizon-input"]', '7')
    await page.check('[data-testid="yearly-seasonality"]')
    
    // Verify privacy information in configuration
    await expect(page.locator('.config-privacy-notice')).toContainText('Model parameters stored locally only')
    
    // Generate forecast
    await page.click('[data-testid="generate-forecast"]')
    
    // Verify privacy-focused processing feedback
    await expect(page.locator('.processing-status')).toContainText('Processing in secure memory')
    await expect(page.locator('.processing-status')).toContainText('No data persistence')
    
    // Wait for forecast completion
    await expect(page.locator('.forecast-chart')).toBeVisible({ timeout: 30000 })
    
    // Verify results page privacy features
    await expect(page.locator('.results-privacy-info')).toContainText('Results stored temporarily in browser')
    await expect(page.locator('.results-privacy-info')).toContainText('Download to save permanently')
  })

  test('privacy-safe export and sharing workflow', async ({ page }) => {
    // Setup: Generate a forecast (abbreviated)
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'export-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,value\n2023-01-01,100\n2023-01-02,110')
    })
    
    await page.click('[data-testid="proceed-to-config"]')
    await page.click('[data-testid="generate-forecast"]')
    await expect(page.locator('.forecast-chart')).toBeVisible({ timeout: 30000 })
    
    // Navigate to export options
    await page.click('[data-testid="export-results"]')
    
    // Verify privacy-focused export interface
    await expect(page.locator('.export-privacy-info')).toContainText('Client-side processing only')
    await expect(page.locator('.export-privacy-info')).toContainText('No server uploads')
    
    // Test CSV export
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-csv"]')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toMatch(/prophet_forecast_\d{8}_\d{6}\.csv/)
    
    // Verify sharing guidance
    await expect(page.locator('.sharing-guidance')).toContainText('Manual sharing only')
    await expect(page.locator('.sharing-guidance')).toContainText('No automatic cloud uploads')
    
    // Test configuration export for reproducibility
    const configDownloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-config"]')
    const configDownload = await configDownloadPromise
    
    expect(configDownload.suggestedFilename()).toMatch(/prophet_config_\d{8}_\d{6}\.json/)
  })

  test('automatic session cleanup workflow', async ({ page }) => {
    // Upload data to create a session
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'cleanup-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,value\n2023-01-01,100\n2023-01-02,110')
    })
    
    await expect(page.locator('.data-preview')).toBeVisible()
    
    // Navigate away and back to simulate session timeout
    await page.goto('/privacy')
    await page.goto('/upload')
    
    // Verify session cleanup messaging
    await expect(page.locator('.session-status')).toContainText('Previous session data automatically cleared')
    
    // Test manual session cleanup
    await page.goto('/dashboard')
    await page.click('[data-testid="clear-all-data"]')
    
    await expect(page.locator('.cleanup-confirmation')).toContainText('All session data will be permanently deleted')
    await page.click('[data-testid="confirm-cleanup"]')
    
    await expect(page.locator('.cleanup-success')).toContainText('All data securely removed from memory')
  })

  test('privacy policy compliance verification', async ({ page }) => {
    // Navigate to privacy page
    await page.goto('/privacy')
    
    // Verify comprehensive privacy policy
    await expect(page.locator('h1')).toContainText('Privacy Policy')
    await expect(page.locator('.privacy-content')).toContainText('No Data Storage Policy')
    await expect(page.locator('.privacy-content')).toContainText('Memory-Only Processing')
    await expect(page.locator('.privacy-content')).toContainText('Automatic Data Deletion')
    
    // Verify technical implementation details
    await expect(page.locator('.technical-details')).toContainText('Stateless Architecture')
    await expect(page.locator('.technical-details')).toContainText('No Database Connections')
    await expect(page.locator('.technical-details')).toContainText('Volatile Memory Only')
    
    // Verify user rights and controls
    await expect(page.locator('.user-rights')).toContainText('Complete Data Control')
    await expect(page.locator('.user-rights')).toContainText('Manual Export Only')
    await expect(page.locator('.user-rights')).toContainText('Session-Based Processing')
  })

  test('cross-browser privacy consistency', async ({ page, browserName }) => {
    // Test privacy features work consistently across browsers
    await page.goto('/')
    
    // Verify privacy notice displays correctly
    await expect(page.locator('.privacy-notice')).toBeVisible()
    
    // Test cookie-based preferences
    await page.click('[data-testid="accept-privacy"]')
    await page.reload()
    
    // Verify privacy acceptance is remembered via cookies
    await expect(page.locator('.privacy-accepted')).toBeVisible()
    
    // Test localStorage for user preferences (not data)
    await page.goto('/dashboard')
    await page.selectOption('[data-testid="theme-selector"]', 'dark')
    await page.reload()
    
    // Verify theme preference persisted (but not user data)
    await expect(page.locator('body')).toHaveClass(/dark-theme/)
    
    // Verify no sensitive data in browser storage
    const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage))
    const sessionStorage = await page.evaluate(() => JSON.stringify(window.sessionStorage))
    
    expect(localStorage).not.toContain('forecast')
    expect(localStorage).not.toContain('userData')
    expect(sessionStorage).not.toContain('forecast')
    expect(sessionStorage).not.toContain('userData')
  })

  test('mobile privacy workflow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    // Verify mobile privacy interface
    await expect(page.locator('.mobile-privacy-notice')).toBeVisible()
    
    // Test mobile file upload with privacy features
    await page.click('[data-testid="mobile-upload-button"]')
    
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'mobile-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,value\n2023-01-01,100\n2023-01-02,110')
    })
    
    // Verify mobile privacy messaging
    await expect(page.locator('.mobile-upload-privacy')).toContainText('Secure mobile processing')
    await expect(page.locator('.mobile-upload-privacy')).toContainText('No cloud storage')
    
    // Test mobile export functionality
    await page.click('[data-testid="proceed-to-config"]')
    await page.click('[data-testid="generate-forecast"]')
    await expect(page.locator('.forecast-chart')).toBeVisible({ timeout: 30000 })
    
    // Verify mobile export options maintain privacy
    await page.click('[data-testid="mobile-export-menu"]')
    await expect(page.locator('.mobile-export-options')).toContainText('Download to device')
    await expect(page.locator('.mobile-export-options')).toContainText('No automatic sharing')
  })
})