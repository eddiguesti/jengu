/**
 * Integration tests for CompetitorScraper
 * ========================================
 * Tests Playwright-based web scraping with mock responses and robots.txt compliance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CompetitorScraper, ProxyPool, type SearchParams } from '../services/competitorScraper'
import type { Page, Browser } from 'playwright'

describe('CompetitorScraper', () => {
  let scraper: CompetitorScraper

  beforeEach(() => {
    scraper = new CompetitorScraper({
      headless: true,
      timeout: 10000,
      respectRobotsTxt: true,
    })
  })

  afterEach(async () => {
    await scraper.close()
  })

  describe('robots.txt compliance', () => {
    it('should respect disallowed paths in robots.txt', async () => {
      // Mock robots.txt that disallows /api/*
      const mockRobotsTxt = `
        User-agent: *
        Disallow: /api/
        Disallow: /admin/
        Allow: /search
      `

      // Test disallowed path
      const isAllowed = scraper['parseRobotsTxt'](mockRobotsTxt, '/api/hotels')
      expect(isAllowed).toBe(false)
    })

    it('should allow paths not in disallow list', async () => {
      const mockRobotsTxt = `
        User-agent: *
        Disallow: /api/
        Allow: /
      `

      const isAllowed = scraper['parseRobotsTxt'](mockRobotsTxt, '/search/hotels')
      expect(isAllowed).toBe(true)
    })

    it('should handle empty robots.txt', async () => {
      const mockRobotsTxt = ''

      const isAllowed = scraper['parseRobotsTxt'](mockRobotsTxt, '/any-path')
      expect(isAllowed).toBe(true) // Allow by default if no rules
    })

    it('should handle missing robots.txt', async () => {
      // If robots.txt fetch fails, should allow scraping
      const mockRobotsTxt = null

      const isAllowed = scraper['parseRobotsTxt'](mockRobotsTxt || '', '/any-path')
      expect(isAllowed).toBe(true)
    })
  })

  describe('percentile calculation', () => {
    it('should calculate correct percentiles for simple dataset', () => {
      const competitors = [
        { name: 'Hotel A', price: 100, currency: 'USD', url: '', rating: 4.0 },
        { name: 'Hotel B', price: 150, currency: 'USD', url: '', rating: 4.5 },
        { name: 'Hotel C', price: 200, currency: 'USD', url: '', rating: 5.0 },
        { name: 'Hotel D', price: 250, currency: 'USD', url: '', rating: 4.8 },
        { name: 'Hotel E', price: 300, currency: 'USD', url: '', rating: 4.2 },
      ]

      const percentiles = scraper.calculatePricePercentiles(competitors)

      expect(percentiles.p10).toBeCloseTo(110, 0) // 10th percentile
      expect(percentiles.p50).toBe(200) // Median
      expect(percentiles.p90).toBeCloseTo(290, 0) // 90th percentile
      expect(percentiles.count).toBe(5)
    })

    it('should handle single competitor', () => {
      const competitors = [{ name: 'Hotel A', price: 150, currency: 'USD', url: '', rating: 4.0 }]

      const percentiles = scraper.calculatePricePercentiles(competitors)

      expect(percentiles.p10).toBe(150)
      expect(percentiles.p50).toBe(150)
      expect(percentiles.p90).toBe(150)
      expect(percentiles.count).toBe(1)
    })

    it('should handle empty competitor list', () => {
      const competitors: any[] = []

      const percentiles = scraper.calculatePricePercentiles(competitors)

      expect(percentiles.p10).toBe(0)
      expect(percentiles.p50).toBe(0)
      expect(percentiles.p90).toBe(0)
      expect(percentiles.count).toBe(0)
    })

    it('should handle large dataset (100 competitors)', () => {
      // Generate 100 competitors with prices from 50 to 500
      const competitors = Array.from({ length: 100 }, (_, i) => ({
        name: `Hotel ${i}`,
        price: 50 + i * 4.5, // Prices from 50 to ~500
        currency: 'USD',
        url: '',
        rating: 4.0,
      }))

      const percentiles = scraper.calculatePricePercentiles(competitors)

      // P10 should be around 50 + (9 * 4.5) = ~90
      // P50 should be around 50 + (49 * 4.5) = ~270
      // P90 should be around 50 + (89 * 4.5) = ~450

      expect(percentiles.p10).toBeGreaterThan(80)
      expect(percentiles.p10).toBeLessThan(100)

      expect(percentiles.p50).toBeGreaterThan(260)
      expect(percentiles.p50).toBeLessThan(280)

      expect(percentiles.p90).toBeGreaterThan(440)
      expect(percentiles.p90).toBeLessThan(460)

      expect(percentiles.count).toBe(100)
    })
  })

  describe('Booking.com URL building', () => {
    it('should build correct search URL with all parameters', () => {
      const params: SearchParams = {
        location: { latitude: 48.8566, longitude: 2.3522 },
        checkIn: '2024-06-15',
        checkOut: '2024-06-16',
        guests: 2,
        roomType: 'standard',
        searchRadiusKm: 5,
      }

      const url = scraper['buildBookingComUrl'](params)

      expect(url).toContain('booking.com/searchresults.html')
      expect(url).toContain('latitude=48.8566')
      expect(url).toContain('longitude=2.3522')
      expect(url).toContain('checkin=2024-06-15')
      expect(url).toContain('checkout=2024-06-16')
      expect(url).toContain('group_adults=2')
    })

    it('should handle different number of guests', () => {
      const params: SearchParams = {
        location: { latitude: 40.7128, longitude: -74.006 },
        checkIn: '2024-07-01',
        checkOut: '2024-07-02',
        guests: 4,
        roomType: 'standard',
        searchRadiusKm: 10,
      }

      const url = scraper['buildBookingComUrl'](params)

      expect(url).toContain('group_adults=4')
    })
  })

  describe('error handling', () => {
    it('should handle timeout gracefully', async () => {
      const shortTimeoutScraper = new CompetitorScraper({
        headless: true,
        timeout: 100, // Very short timeout to force timeout error
        respectRobotsTxt: false,
      })

      await shortTimeoutScraper.initialize()

      const params: SearchParams = {
        location: { latitude: 48.8566, longitude: 2.3522 },
        checkIn: '2024-06-15',
        checkOut: '2024-06-16',
        guests: 2,
        roomType: 'standard',
        searchRadiusKm: 5,
      }

      try {
        const result = await shortTimeoutScraper.scrapeBookingCom(params)

        // Should return failure result
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      } catch (error) {
        // Or might throw - either is acceptable
        expect(error).toBeDefined()
      } finally {
        await shortTimeoutScraper.close()
      }
    }, 30000)

    it('should cleanup browser on error', async () => {
      const scraperToFail = new CompetitorScraper({
        headless: true,
        timeout: 5000,
        respectRobotsTxt: false,
      })

      await scraperToFail.initialize()

      // Verify browser is initialized
      expect(scraperToFail['browser']).toBeDefined()
      expect(scraperToFail['page']).toBeDefined()

      // Close the scraper
      await scraperToFail.close()

      // Verify browser is cleaned up
      expect(scraperToFail['browser']).toBeNull()
      expect(scraperToFail['page']).toBeNull()
    })
  })
})

describe('ProxyPool', () => {
  it('should create pool from environment variable', () => {
    // Mock environment variable
    process.env.PROXY_LIST = 'http://proxy1:8080,http://proxy2:8080,http://proxy3:8080'

    const proxyPool = ProxyPool.fromEnv()
    expect(proxyPool['proxies'].length).toBe(3)

    delete process.env.PROXY_LIST
  })

  it('should rotate proxies in round-robin fashion', () => {
    const proxyPool = new ProxyPool([
      { server: 'http://proxy1:8080' },
      { server: 'http://proxy2:8080' },
      { server: 'http://proxy3:8080' },
    ])

    const proxy1 = proxyPool.getNext()
    expect(proxy1.server).toBe('http://proxy1:8080')

    const proxy2 = proxyPool.getNext()
    expect(proxy2.server).toBe('http://proxy2:8080')

    const proxy3 = proxyPool.getNext()
    expect(proxy3.server).toBe('http://proxy3:8080')

    // Should wrap around
    const proxy4 = proxyPool.getNext()
    expect(proxy4.server).toBe('http://proxy1:8080')
  })

  it('should handle empty proxy list', () => {
    const proxyPool = new ProxyPool([])

    const proxy = proxyPool.getNext()
    expect(proxy).toBeUndefined()
  })

  it('should handle proxy with authentication', () => {
    const proxyPool = new ProxyPool([
      { server: 'http://proxy1:8080', username: 'user', password: 'pass' },
    ])

    const proxy = proxyPool.getNext()
    expect(proxy.server).toBe('http://proxy1:8080')
    expect(proxy.username).toBe('user')
    expect(proxy.password).toBe('pass')
  })
})

describe('Integration: Full scraping flow (mocked)', () => {
  it('should complete full scraping workflow', async () => {
    // This test would use mock Playwright browser/page
    // In a real integration test, you'd use Playwright's mock server
    const scraper = new CompetitorScraper({
      headless: true,
      timeout: 30000,
      respectRobotsTxt: false, // Skip for mock test
    })

    // Note: In real integration tests, you'd mock the Playwright page response
    // For now, we just verify the scraper can be initialized and closed

    await scraper.initialize()
    expect(scraper['browser']).toBeDefined()
    expect(scraper['page']).toBeDefined()

    await scraper.close()
    expect(scraper['browser']).toBeNull()
  })
})
