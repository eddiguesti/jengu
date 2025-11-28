/**
 * School Holiday Service Tests
 *
 * Run with: npx tsx backend/services/__tests__/schoolHolidayService.test.ts
 *
 * Verifies French school holiday detection for:
 * - Winter holidays (zone-specific)
 * - Summer holidays (all zones)
 * - Non-holiday dates
 */

import {
  isSchoolHoliday,
  getSchoolHolidayInfo,
  getSchoolHolidayZoneString,
  getAllSchoolHolidays,
} from '../schoolHolidayService.js'

// Simple test utilities
let passCount = 0
let failCount = 0

function test(name: string, fn: () => void): void {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passCount++
  } catch (error) {
    console.log(`  ❌ ${name}`)
    console.log(`     Error: ${(error as Error).message}`)
    failCount++
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`)
      }
    },
    toContain(item: unknown) {
      if (!Array.isArray(actual) || !actual.includes(item)) {
        throw new Error(`Expected array to contain ${item}`)
      }
    },
    not: {
      toContain(item: unknown) {
        if (Array.isArray(actual) && actual.includes(item)) {
          throw new Error(`Expected array NOT to contain ${item}`)
        }
      },
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`)
      }
    },
    toHaveLength(length: number) {
      if (!Array.isArray(actual) || actual.length !== length) {
        throw new Error(
          `Expected length ${length}, got ${Array.isArray(actual) ? actual.length : 'not an array'}`
        )
      }
    },
    toBeGreaterThan(value: number) {
      if (typeof actual !== 'number' || actual <= value) {
        throw new Error(`Expected ${actual} to be greater than ${value}`)
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error('Expected value to be defined')
      }
    },
    toMatch(regex: RegExp) {
      if (typeof actual !== 'string' || !regex.test(actual)) {
        throw new Error(`Expected "${actual}" to match ${regex}`)
      }
    },
  }
}

console.log('\n🏫 School Holiday Service Tests\n')

// Test Suite 1: isSchoolHoliday
console.log('📅 isSchoolHoliday()')

test('Feb 15, 2025 - Zone C should be on holiday', () => {
  const date = new Date('2025-02-15')
  expect(isSchoolHoliday(date, 'C')).toBe(true)
})

test('Feb 15, 2025 - Zone A should NOT be on holiday', () => {
  const date = new Date('2025-02-15')
  expect(isSchoolHoliday(date, 'A')).toBe(false)
})

test('Feb 15, 2025 - Zone B should be on holiday', () => {
  const date = new Date('2025-02-15')
  expect(isSchoolHoliday(date, 'B')).toBe(true)
})

test('Feb 15, 2025 - Any zone check returns true', () => {
  const date = new Date('2025-02-15')
  expect(isSchoolHoliday(date)).toBe(true)
})

test('Aug 1, 2025 - Zone A should be on holiday (summer)', () => {
  const date = new Date('2025-08-01')
  expect(isSchoolHoliday(date, 'A')).toBe(true)
})

test('Aug 1, 2025 - Zone B should be on holiday (summer)', () => {
  const date = new Date('2025-08-01')
  expect(isSchoolHoliday(date, 'B')).toBe(true)
})

test('Aug 1, 2025 - Zone C should be on holiday (summer)', () => {
  const date = new Date('2025-08-01')
  expect(isSchoolHoliday(date, 'C')).toBe(true)
})

test('Oct 1, 2025 - NOT a school holiday for any zone', () => {
  const date = new Date('2025-10-01')
  expect(isSchoolHoliday(date, 'A')).toBe(false)
  expect(isSchoolHoliday(date, 'B')).toBe(false)
  expect(isSchoolHoliday(date, 'C')).toBe(false)
  expect(isSchoolHoliday(date)).toBe(false)
})

test('Christmas 2024 should be holiday for all zones', () => {
  const date = new Date('2024-12-25')
  expect(isSchoolHoliday(date)).toBe(true)
})

// Test Suite 2: getSchoolHolidayInfo
console.log('\n📋 getSchoolHolidayInfo()')

test('Summer 2025 returns all zones', () => {
  const date = new Date('2025-08-01')
  const info = getSchoolHolidayInfo(date)
  expect(info.isHoliday).toBe(true)
  expect(info.zones).toContain('A')
  expect(info.zones).toContain('B')
  expect(info.zones).toContain('C')
})

test('Feb 15, 2025 returns B and C zones only', () => {
  const date = new Date('2025-02-15')
  const info = getSchoolHolidayInfo(date)
  expect(info.isHoliday).toBe(true)
  expect(info.zones).toContain('B')
  expect(info.zones).toContain('C')
  expect(info.zones).not.toContain('A')
})

test('Oct 1, 2025 returns no zones', () => {
  const date = new Date('2025-10-01')
  const info = getSchoolHolidayInfo(date)
  expect(info.isHoliday).toBe(false)
  expect(info.zones).toHaveLength(0)
  expect(info.holidayName).toBeNull()
})

// Test Suite 3: getSchoolHolidayZoneString
console.log('\n🏷️  getSchoolHolidayZoneString()')

test('Summer 2025 returns "ALL"', () => {
  const date = new Date('2025-08-01')
  expect(getSchoolHolidayZoneString(date)).toBe('ALL')
})

test('Feb 15, 2025 returns "B,C"', () => {
  const date = new Date('2025-02-15')
  expect(getSchoolHolidayZoneString(date)).toBe('B,C')
})

test('Oct 1, 2025 returns null', () => {
  const date = new Date('2025-10-01')
  expect(getSchoolHolidayZoneString(date)).toBeNull()
})

// Test Suite 4: getAllSchoolHolidays
console.log('\n📆 getAllSchoolHolidays()')

test('Returns non-empty array', () => {
  const holidays = getAllSchoolHolidays()
  expect(holidays.length).toBeGreaterThan(0)
})

test('Includes both 2024-2025 and 2025-2026 academic years', () => {
  const holidays = getAllSchoolHolidays()
  const has2024 = holidays.some(h => h.start.startsWith('2024-'))
  const has2026 = holidays.some(h => h.end.startsWith('2026-'))
  expect(has2024).toBe(true)
  expect(has2026).toBe(true)
})

// Summary
console.log('\n' + '='.repeat(50))
console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed\n`)

if (failCount > 0) {
  process.exit(1)
}
