import { test, expect } from '@playwright/test'

test.describe('Comprehensive Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('WCAG 2.1 AA compliance - keyboard navigation', async ({ page }) => {
    // Test complete keyboard navigation workflow
    
    // Start from top of page
    await page.keyboard.press('Tab')
    let focusedElement = page.locator(':focus')
    await expect(focusedElement).toHaveAttribute('data-testid', 'skip-nav')
    
    // Skip to main content
    await page.keyboard.press('Enter')
    focusedElement = page.locator(':focus')
    await expect(focusedElement).toHaveAttribute('id', 'main-content')
    
    // Navigate through main interface
    await page.keyboard.press('Tab')
    focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Test all interactive elements are keyboard accessible
    const interactiveElements = await page.locator('button, a, input, select, textarea, [tabindex="0"]').all()
    
    for (const element of interactiveElements) {
      await element.focus()
      await expect(element).toBeFocused()
      
      // Verify focus indicator is visible
      const focusIndicator = await element.evaluate(el => {
        const styles = window.getComputedStyle(el, ':focus')
        return styles.outline !== 'none' || styles.boxShadow !== 'none'
      })
      expect(focusIndicator).toBe(true)
    }
  })

  test('WCAG 2.1 AA compliance - screen reader support', async ({ page }) => {
    // Test semantic HTML structure
    const landmarks = await page.locator('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], header, nav, main, footer').all()
    expect(landmarks.length).toBeGreaterThan(0)
    
    // Test heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    let previousLevel = 0
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
      const currentLevel = parseInt(tagName.charAt(1))
      
      // Verify heading hierarchy doesn't skip levels
      expect(currentLevel).toBeLessThanOrEqual(previousLevel + 1)
      previousLevel = currentLevel
    }
    
    // Test ARIA labels and descriptions
    const ariaElements = await page.locator('[aria-label], [aria-labelledby], [aria-describedby]').all()
    
    for (const element of ariaElements) {
      const ariaLabel = await element.getAttribute('aria-label')
      const ariaLabelledby = await element.getAttribute('aria-labelledby')
      const ariaDescribedby = await element.getAttribute('aria-describedby')
      
      if (ariaLabelledby) {
        const labelElement = page.locator(`#${ariaLabelledby}`)
        await expect(labelElement).toBeVisible()
      }
      
      if (ariaDescribedby) {
        const descElement = page.locator(`#${ariaDescribedby}`)
        await expect(descElement).toBeVisible()
      }
      
      if (ariaLabel) {
        expect(ariaLabel.trim().length).toBeGreaterThan(0)
      }
    }
  })

  test('WCAG 2.1 AA compliance - color contrast and visual design', async ({ page }) => {
    // Test color contrast ratios
    const textElements = await page.locator('p, span, div, button, a, label, h1, h2, h3, h4, h5, h6').all()
    
    for (const element of textElements.slice(0, 20)) { // Test sample of elements
      const isVisible = await element.isVisible()
      if (!isVisible) continue
      
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize
        }
      })
      
      // Verify text is not invisible (same color as background)
      expect(styles.color).not.toBe(styles.backgroundColor)
    }
    
    // Test focus indicators
    const focusableElements = await page.locator('button, a, input, select, textarea, [tabindex="0"]').all()
    
    for (const element of focusableElements.slice(0, 10)) { // Test sample
      await element.focus()
      
      const focusStyles = await element.evaluate(el => {
        const styles = window.getComputedStyle(el, ':focus')
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          borderColor: styles.borderColor
        }
      })
      
      // Verify focus indicator exists
      const hasFocusIndicator = focusStyles.outline !== 'none' || 
                               focusStyles.boxShadow !== 'none' || 
                               focusStyles.borderColor !== 'transparent'
      expect(hasFocusIndicator).toBe(true)
    }
  })

  test('WCAG 2.1 AA compliance - form accessibility', async ({ page }) => {
    await page.goto('/upload')
    
    // Test form labels
    const inputs = await page.locator('input, select, textarea').all()
    
    for (const input of inputs) {
      const inputId = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledby = await input.getAttribute('aria-labelledby')
      
      // Each input should have a label
      const hasLabel = inputId && await page.locator(`label[for="${inputId}"]`).count() > 0
      const hasAriaLabel = ariaLabel && ariaLabel.trim().length > 0
      const hasAriaLabelledby = ariaLabelledby && await page.locator(`#${ariaLabelledby}`).count() > 0
      
      expect(hasLabel || hasAriaLabel || hasAriaLabelledby).toBe(true)
    }
    
    // Test form validation
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('aria-describedby')
    
    const descriptionId = await fileInput.getAttribute('aria-describedby')
    const description = page.locator(`#${descriptionId}`)
    await expect(description).toBeVisible()
    await expect(description).toContainText('CSV files only')
  })

  test('WCAG 2.1 AA compliance - error handling and feedback', async ({ page }) => {
    // Test error message accessibility
    await page.goto('/upload')
    
    // Trigger validation error
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid content')
    })
    
    // Verify error message is accessible
    const errorMessage = page.locator('[role="alert"], .error-message')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toHaveAttribute('aria-live', 'assertive')
    
    // Test error association with form field
    const errorId = await errorMessage.getAttribute('id')
    if (errorId) {
      await expect(fileInput).toHaveAttribute('aria-describedby', new RegExp(errorId))
    }
  })

  test('WCAG 2.1 AA compliance - dynamic content and live regions', async ({ page }) => {
    await page.goto('/upload')
    
    // Upload file to trigger dynamic content
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,value\n2023-01-01,100\n2023-01-02,110')
    })
    
    // Verify live regions for status updates
    const liveRegions = await page.locator('[aria-live]').all()
    expect(liveRegions.length).toBeGreaterThan(0)
    
    for (const region of liveRegions) {
      const ariaLive = await region.getAttribute('aria-live')
      expect(['polite', 'assertive', 'off']).toContain(ariaLive)
    }
    
    // Test progress indicator accessibility
    const progressIndicator = page.locator('[role="progressbar"], .progress')
    if (await progressIndicator.count() > 0) {
      await expect(progressIndicator).toHaveAttribute('aria-label')
      
      const hasValueNow = await progressIndicator.getAttribute('aria-valuenow')
      const hasValueMax = await progressIndicator.getAttribute('aria-valuemax')
      
      if (hasValueNow) {
        expect(hasValueMax).toBeTruthy()
      }
    }
  })

  test('WCAG 2.1 AA compliance - charts and data visualization', async ({ page }) => {
    // Generate forecast to test chart accessibility
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'chart-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,value\n2023-01-01,100\n2023-01-02,110\n2023-01-03,105')
    })
    
    await page.click('[data-testid="proceed-to-config"]')
    await page.click('[data-testid="generate-forecast"]')
    await expect(page.locator('.forecast-chart')).toBeVisible({ timeout: 30000 })
    
    // Test chart accessibility
    const chartContainer = page.locator('.chart-container')
    await expect(chartContainer).toHaveAttribute('role', 'img')
    await expect(chartContainer).toHaveAttribute('aria-label')
    
    // Test chart description
    const chartDescription = page.locator('#chart-description, [aria-describedby]')
    await expect(chartDescription).toBeVisible()
    
    // Test data table alternative
    const dataTable = page.locator('.sr-only table, .visually-hidden table')
    if (await dataTable.count() > 0) {
      await expect(dataTable).toHaveAttribute('role', 'table')
      
      const tableHeaders = await dataTable.locator('th').all()
      for (const header of tableHeaders) {
        await expect(header).toHaveAttribute('scope')
      }
    }
    
    // Test chart keyboard navigation
    await chartContainer.focus()
    await page.keyboard.press('ArrowRight')
    
    // Verify keyboard interaction feedback
    const focusedDataPoint = page.locator('.focused-data-point, [aria-live="assertive"]')
    if (await focusedDataPoint.count() > 0) {
      await expect(focusedDataPoint).toBeVisible()
    }
  })

  test('WCAG 2.1 AA compliance - mobile accessibility', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    // Test mobile navigation accessibility
    const mobileMenuButton = page.locator('.menu-toggle, [aria-expanded]')
    if (await mobileMenuButton.count() > 0) {
      await expect(mobileMenuButton).toHaveAttribute('aria-expanded')
      await expect(mobileMenuButton).toHaveAttribute('aria-controls')
      
      // Test menu toggle
      await mobileMenuButton.click()
      await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true')
      
      // Test menu keyboard navigation
      await page.keyboard.press('Escape')
      await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false')
    }
    
    // Test touch target sizes (minimum 44px)
    const touchTargets = await page.locator('button, a, input[type="checkbox"], input[type="radio"]').all()
    
    for (const target of touchTargets.slice(0, 10)) { // Test sample
      const isVisible = await target.isVisible()
      if (!isVisible) continue
      
      const boundingBox = await target.boundingBox()
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44)
        expect(boundingBox.height).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('WCAG 2.1 AA compliance - reduced motion support', async ({ page }) => {
    // Test reduced motion preferences
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    
    // Verify animations are disabled or reduced
    const animatedElements = await page.locator('[class*="animate"], [class*="transition"]').all()
    
    for (const element of animatedElements.slice(0, 5)) { // Test sample
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return {
          animationDuration: computed.animationDuration,
          transitionDuration: computed.transitionDuration
        }
      })
      
      // Animations should be disabled or very short
      const animationDisabled = styles.animationDuration === '0s' || 
                               styles.animationDuration === 'none' ||
                               parseFloat(styles.animationDuration) <= 0.01
      
      const transitionDisabled = styles.transitionDuration === '0s' || 
                                styles.transitionDuration === 'none' ||
                                parseFloat(styles.transitionDuration) <= 0.01
      
      expect(animationDisabled || transitionDisabled).toBe(true)
    }
  })

  test('WCAG 2.1 AA compliance - high contrast mode', async ({ page }) => {
    // Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' })
    await page.goto('/')
    
    // Verify high contrast styles are applied
    const bodyElement = page.locator('body')
    const bodyStyles = await bodyElement.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color
      }
    })
    
    // Colors should be high contrast
    expect(bodyStyles.backgroundColor).not.toBe(bodyStyles.color)
    
    // Test button contrast in high contrast mode
    const buttons = await page.locator('button').all()
    
    for (const button of buttons.slice(0, 5)) { // Test sample
      const isVisible = await button.isVisible()
      if (!isVisible) continue
      
      const buttonStyles = await button.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          borderColor: computed.borderColor
        }
      })
      
      // Button should have visible borders or background contrast
      const hasContrast = buttonStyles.backgroundColor !== 'transparent' || 
                         buttonStyles.borderColor !== 'transparent'
      expect(hasContrast).toBe(true)
    }
  })

  test('WCAG 2.1 AA compliance - language and internationalization', async ({ page }) => {
    await page.goto('/')
    
    // Test language attributes
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveAttribute('lang')
    
    const lang = await htmlElement.getAttribute('lang')
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/) // Valid language code format
    
    // Test text direction support
    const textElements = await page.locator('p, div, span').all()
    
    for (const element of textElements.slice(0, 10)) { // Test sample
      const dir = await element.getAttribute('dir')
      if (dir) {
        expect(['ltr', 'rtl', 'auto']).toContain(dir)
      }
    }
  })

  test('WCAG 2.1 AA compliance - timeout and session management', async ({ page }) => {
    await page.goto('/upload')
    
    // Upload file to start session
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'timeout-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,value\n2023-01-01,100')
    })
    
    // Test timeout warnings are accessible
    const timeoutWarning = page.locator('.timeout-warning, [role="alert"]')
    if (await timeoutWarning.count() > 0) {
      await expect(timeoutWarning).toHaveAttribute('role', 'alert')
      await expect(timeoutWarning).toHaveAttribute('aria-live', 'assertive')
    }
    
    // Test session extension options
    const extendButton = page.locator('[data-testid="extend-session"]')
    if (await extendButton.count() > 0) {
      await expect(extendButton).toBeVisible()
      await expect(extendButton).toHaveAttribute('aria-label')
    }
  })
})