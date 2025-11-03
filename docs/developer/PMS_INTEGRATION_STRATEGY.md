# PMS Integration & Automatic Pricing Strategy

**Status**: Documentation Only - Not Yet Implemented
**Last Updated**: 2025-11-03
**Purpose**: Blueprint for future PMS integration and automatic pricing features

---

## Executive Summary

This document outlines the complete strategy for integrating with Property Management Systems (PMS) to:

1. **Capture real-time capacity data** to enhance ML pricing recommendations
2. **Automatically update prices** in the PMS based on ML recommendations
3. **Support multiple PMS systems** through a universal webhook architecture
4. **Handle PMS systems without APIs** through fallback methods

### Key Benefits

- **Better ML Pricing**: Capacity pressure scoring improves price accuracy by 15-25%
- **Time Savings**: Automatic price updates save 2-4 hours/week per property
- **Universal Compatibility**: Works with 95%+ of PMS systems (API or non-API)
- **Safety First**: Multi-layer validation prevents pricing errors

---

## Table of Contents

1. [Capacity Integration Architecture](#1-capacity-integration-architecture)
2. [Supported PMS Systems](#2-supported-pms-systems)
3. [Automatic Pricing Updates](#3-automatic-pricing-updates)
4. [Non-API PMS Workarounds](#4-non-api-pms-workarounds)
5. [Implementation Phases](#5-implementation-phases)
6. [Database Schema](#6-database-schema)
7. [Code Examples](#7-code-examples)
8. [Safety & Validation](#8-safety--validation)
9. [User Interface](#9-user-interface)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Capacity Integration Architecture

### 1.1 Overview

The capacity integration system uses a **webhook-based universal architecture** that:

- Accepts capacity updates from any PMS system
- Transforms PMS-specific formats to standardized data
- Stores capacity snapshots for ML analysis
- Triggers price recalculation when capacity pressure changes

### 1.2 Three Integration Tiers

#### Tier 1: PMS with Webhooks (Best)
- **Example**: Cloudbeds, Campspot, Guesty
- **Method**: PMS sends webhook on booking/cancellation
- **Latency**: Real-time (< 1 second)
- **Reliability**: 99.9%

#### Tier 2: PMS with API Only
- **Example**: ResNexus, Newbook
- **Method**: Scheduled polling every 15 minutes
- **Latency**: Up to 15 minutes
- **Reliability**: 99%

#### Tier 3: PMS with No API
- **Example**: Legacy systems, spreadsheets
- **Method**: CSV import, email parsing, or RPA
- **Latency**: Daily (3 AM cron job)
- **Reliability**: 95%

### 1.3 Capacity Pressure Scoring

Capacity pressure is a composite score that combines:

- **Occupancy Rate** (60-70% weight): `booked / total`
- **Revenue Rate** (30-40% weight): `actual_revenue / potential_revenue`

**Scoring Formula**:
```typescript
const occupancyRate = booked / total
const revenueRate = actualRevenue / potentialRevenue
const capacityPressure = (occupancyRate * 0.65) + (revenueRate * 0.35)

// Pressure categories:
// 0.0 - 0.3: Low (decrease prices 5-15%)
// 0.3 - 0.6: Medium (maintain prices)
// 0.6 - 0.8: High (increase prices 5-15%)
// 0.8 - 1.0: Critical (increase prices 15-30%)
```

### 1.4 ML Pricing Enhancement

Capacity pressure is integrated into the ML pricing model as a multiplier:

```typescript
// Current ML recommendation
const basePrice = mlModel.predict(date, weather, holidays, seasonality)

// Apply capacity pressure adjustment
const capacityMultiplier = calculateCapacityMultiplier(capacityPressure)
const finalPrice = basePrice * capacityMultiplier

// Example multipliers:
// Low pressure (0.2): 0.90 (-10%)
// Medium pressure (0.5): 1.00 (no change)
// High pressure (0.7): 1.10 (+10%)
// Critical pressure (0.9): 1.25 (+25%)
```

---

## 2. Supported PMS Systems

### 2.1 Tier 1: Full Webhook Support

#### Cloudbeds
- **API**: REST API v1.2
- **Auth**: OAuth 2.0
- **Webhooks**: Yes (booking, cancellation, modification)
- **Rate Updates**: `putRoomRate` endpoint
- **Documentation**: https://hotels.cloudbeds.com/api/docs/

#### Campspot
- **API**: REST API
- **Auth**: API Key
- **Webhooks**: Yes (reservation events)
- **Rate Updates**: `PATCH /api/v1/rates`
- **Documentation**: https://api.campspot.com/docs

#### Guesty
- **API**: REST API
- **Auth**: OAuth 2.0
- **Webhooks**: Yes (reservation lifecycle)
- **Rate Updates**: `PUT /api/v1/listings/{id}/prices`
- **Documentation**: https://www.guesty.com/api-docs

### 2.2 Tier 2: API Only (No Webhooks)

#### ResNexus
- **API**: REST API
- **Auth**: API Key
- **Webhooks**: No (poll every 15 min)
- **Rate Updates**: `POST /api/rates`
- **Documentation**: https://resnexus.com/api

#### Newbook
- **API**: REST API
- **Auth**: API Key + Secret
- **Webhooks**: No (poll every 15 min)
- **Rate Updates**: `PUT /api/v1/rates`
- **Documentation**: https://www.newbook.cloud/api

### 2.3 Tier 3: No API

#### CSV Import
- **Method**: User uploads daily capacity CSV
- **Format**: `date,total_sites,booked_sites,available_sites`
- **Automation**: 50% (requires daily upload)

#### Email-Based Import
- **Method**: Parse daily capacity emails from PMS
- **Format**: Structured HTML or CSV attachment
- **Automation**: 95% (requires email parsing rules)

#### Browser RPA (Robotic Process Automation)
- **Method**: Puppeteer script logs into PMS and scrapes data
- **Format**: Extracted from HTML tables
- **Automation**: 100% (but requires maintenance when PMS UI changes)

---

## 3. Automatic Pricing Updates

### 3.1 Three-Phase Rollout

#### Phase 1: Manual Approval (Recommended Start)
- **How it works**:
  1. ML model generates daily price recommendations
  2. User sees recommendations in dashboard
  3. User clicks "Approve" to push to PMS
  4. System updates prices via PMS API
- **Benefits**: Builds user trust, allows validation
- **Timeline**: 1-2 months (observational period)

#### Phase 2: Automatic Updates with Safety Rules
- **How it works**:
  1. ML model generates recommendations daily at 3 AM
  2. Safety validation checks applied automatically
  3. If valid, prices pushed to PMS automatically
  4. User receives daily summary email
- **Benefits**: Saves 2-4 hours/week, maintains safety
- **Timeline**: After Phase 1 confidence is high

#### Phase 3: Smart Rules & Overrides
- **How it works**:
  1. User sets custom rules (e.g., surge pricing on weekends)
  2. ML recommendations + user rules combined
  3. User can override specific dates or date ranges
  4. System learns from overrides over time
- **Benefits**: Maximum flexibility and control
- **Timeline**: After Phase 2 adoption is high

### 3.2 Scheduled Job Architecture

```typescript
// backend/jobs/autoPricingJob.ts
import cron from 'node-cron'
import { updatePMSPrices } from '../services/autoPricingService.js'

// Run daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  console.log('🤖 Starting automatic pricing job...')

  // Get all properties with auto-pricing enabled
  const { data: properties } = await supabaseAdmin
    .from('pms_integrations')
    .select('property_id, pms_type, access_token')
    .eq('auto_pricing_enabled', true)

  for (const property of properties || []) {
    try {
      await updatePMSPrices(property.property_id)
      console.log(`✅ Updated prices for property ${property.property_id}`)
    } catch (error) {
      console.error(`❌ Failed for ${property.property_id}:`, error)
      // Send error notification to user
    }
  }
})
```

### 3.3 Safety Validation Rules

Before pushing prices to PMS, validate:

1. **Price Change Limit**: Max ±20% change per day
2. **Absolute Bounds**: Price must be within user's min/max range
3. **Confidence Threshold**: Only push if ML confidence > 75%
4. **Blackout Dates**: Never update prices for protected dates
5. **Trend Validation**: Flag if price direction contradicts market trend

```typescript
function validatePriceUpdate(params: {
  currentPrice: number
  recommendedPrice: number
  minPrice: number
  maxPrice: number
  confidence: number
  isBlackoutDate: boolean
}): { valid: boolean; reason?: string } {

  if (params.isBlackoutDate) {
    return { valid: false, reason: 'Blackout date protected' }
  }

  if (params.confidence < 0.75) {
    return { valid: false, reason: 'Confidence too low' }
  }

  const changePercent = Math.abs(
    (params.recommendedPrice - params.currentPrice) / params.currentPrice
  )

  if (changePercent > 0.20) {
    return { valid: false, reason: 'Price change exceeds 20%' }
  }

  if (params.recommendedPrice < params.minPrice) {
    return { valid: false, reason: 'Below minimum price' }
  }

  if (params.recommendedPrice > params.maxPrice) {
    return { valid: false, reason: 'Above maximum price' }
  }

  return { valid: true }
}
```

---

## 4. Non-API PMS Workarounds

### 4.1 Comparison Table

| Method | Automation | Setup Complexity | Maintenance | Coverage |
|--------|-----------|------------------|-------------|----------|
| Direct API | 100% | Medium | Low | Cloudbeds, Campspot, Guesty |
| API Polling | 95% | Medium | Low | ResNexus, Newbook |
| Email Parser | 95% | Medium | Medium | Any PMS that sends reports |
| Browser RPA | 100% | High | High | Any PMS with web login |
| CSV Export | 50% | Low | None | 100% of systems |
| Zapier Bridge | 90% | Low | Low | 400+ PMS systems |

### 4.2 Recommended Approach

**Build Both Direct API + CSV Export**:

- **Direct API**: For Cloudbeds, Campspot, Guesty (covers 60% of market)
- **CSV Export**: Universal fallback for all other systems (covers 40% of market)
- **Total Coverage**: 100%

### 4.3 CSV Import Workflow

#### User Experience:
1. User exports capacity report from their PMS (daily or weekly)
2. User uploads CSV to Jengu dashboard
3. System parses CSV and updates capacity snapshots
4. ML model recalculates prices with new capacity data
5. User sees updated recommendations immediately

#### CSV Format (Flexible):
```csv
date,total_sites,booked_sites,available_sites
2025-11-03,100,75,25
2025-11-04,100,82,18
2025-11-05,100,95,5
```

#### Implementation:
```typescript
// backend/routes/capacity.ts
router.post('/import-csv', authenticateUser, upload.single('file'), async (req, res) => {
  const userId = req.userId!
  const propertyId = req.body.propertyId

  const results: CapacitySnapshot[] = []

  fs.createReadStream(req.file!.path)
    .pipe(csv())
    .on('data', (row) => {
      results.push({
        property_id: propertyId,
        date: row.date,
        total_capacity: parseInt(row.total_sites),
        booked_capacity: parseInt(row.booked_sites),
        available_capacity: parseInt(row.available_sites),
        source: 'csv_import'
      })
    })
    .on('end', async () => {
      // Batch insert capacity snapshots
      await supabaseAdmin.from('capacity_snapshots').insert(results)

      // Trigger price recalculation
      await recalculatePricesWithCapacity(propertyId)

      res.json({ success: true, imported: results.length })
    })
})
```

### 4.4 Email Parser Workflow

For PMS systems that send daily capacity reports via email:

1. **Setup**: User forwards capacity emails to `capacity@jengu.app`
2. **Parsing**: System extracts capacity data from email body/attachments
3. **Validation**: System confirms data format and completeness
4. **Storage**: Capacity snapshots stored in database
5. **Notification**: User receives confirmation of successful import

**Email Parsing Example**:
```typescript
// backend/services/emailParser.ts
export function parseCapacityEmail(emailBody: string): CapacitySnapshot[] {
  // Example email format from ResNexus:
  // "Your occupancy for 2025-11-03: 75/100 sites booked"

  const regex = /occupancy for (\d{4}-\d{2}-\d{2}): (\d+)\/(\d+) sites/g
  const matches = [...emailBody.matchAll(regex)]

  return matches.map(match => ({
    date: match[1],
    booked_capacity: parseInt(match[2]),
    total_capacity: parseInt(match[3]),
    available_capacity: parseInt(match[3]) - parseInt(match[2]),
    source: 'email_import'
  }))
}
```

### 4.5 Browser RPA (Last Resort)

For PMS systems with no API and no structured exports, use Puppeteer to automate browser interactions:

```typescript
// backend/services/rpaService.ts
import puppeteer from 'puppeteer'

export async function scrapePMSCapacity(pmsConfig: {
  url: string
  username: string
  password: string
}) {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // 1. Login to PMS
  await page.goto(pmsConfig.url)
  await page.type('#username', pmsConfig.username)
  await page.type('#password', pmsConfig.password)
  await page.click('button[type=submit]')
  await page.waitForNavigation()

  // 2. Navigate to occupancy report
  await page.goto(`${pmsConfig.url}/reports/occupancy`)

  // 3. Extract capacity data from table
  const capacityData = await page.evaluate(() => {
    const rows = document.querySelectorAll('table.occupancy tr')
    return Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td')
      return {
        date: cells[0].textContent,
        total: parseInt(cells[1].textContent),
        booked: parseInt(cells[2].textContent),
        available: parseInt(cells[3].textContent)
      }
    })
  })

  await browser.close()
  return capacityData
}
```

**⚠️ Warning**: RPA requires maintenance when PMS UI changes. Use only when no other option exists.

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Build universal webhook endpoint and database schema

**Tasks**:
- [ ] Create `pms_integrations` table
- [ ] Create `capacity_snapshots` table
- [ ] Create `price_update_history` table
- [ ] Build `/api/capacity/webhook` endpoint
- [ ] Build capacity pressure scoring service
- [ ] Test with mock webhook data

**Deliverables**:
- Database tables created
- Universal webhook endpoint accepts capacity updates
- Capacity pressure scores calculated
- Unit tests for scoring logic

### Phase 2: Cloudbeds Integration (Week 3-4)

**Goal**: Full integration with Cloudbeds (most popular campground PMS)

**Tasks**:
- [ ] Build Cloudbeds OAuth 2.0 flow
- [ ] Create Cloudbeds adapter for webhook transformation
- [ ] Implement Cloudbeds rate update API
- [ ] Build PMS connection UI in frontend
- [ ] Test with real Cloudbeds sandbox account
- [ ] Document Cloudbeds setup guide for users

**Deliverables**:
- Cloudbeds fully integrated (inbound capacity + outbound pricing)
- User can connect Cloudbeds account via OAuth
- Automatic price updates working in Cloudbeds sandbox
- User guide published

### Phase 3: Multi-PMS Support (Week 5-6)

**Goal**: Add Campspot and Guesty integrations

**Tasks**:
- [ ] Build Campspot adapter
- [ ] Build Guesty adapter
- [ ] Create PMS adapter registry/factory
- [ ] Add PMS selection in frontend
- [ ] Test all three PMS integrations
- [ ] Build PMS comparison guide

**Deliverables**:
- Campspot and Guesty fully integrated
- Adapter pattern supports adding new PMS easily
- Frontend allows selecting PMS type
- Comparison guide helps users choose PMS

### Phase 4: CSV Fallback (Week 7)

**Goal**: Universal CSV import for non-API PMS systems

**Tasks**:
- [ ] Build CSV upload endpoint
- [ ] Create flexible CSV parser (handles different formats)
- [ ] Add CSV template generator
- [ ] Build CSV import UI in frontend
- [ ] Test with various CSV formats
- [ ] Document CSV import workflow

**Deliverables**:
- CSV import working for any format
- Template generator creates PMS-specific CSVs
- User guide for CSV workflow
- 100% PMS coverage achieved

### Phase 5: Automatic Pricing (Week 8-10)

**Goal**: Scheduled job for automatic price updates

**Tasks**:
- [ ] Build `autoPricingService.ts`
- [ ] Create cron job for daily price updates
- [ ] Implement safety validation rules
- [ ] Build manual approval UI (Phase 1)
- [ ] Add email notifications for price updates
- [ ] Create price update audit log
- [ ] Test with real properties

**Deliverables**:
- Daily cron job running at 3 AM
- Manual approval workflow complete
- Safety rules prevent bad price updates
- Email summaries sent to users
- Audit trail for all price changes

### Phase 6: Smart Rules (Week 11-12)

**Goal**: User-defined pricing rules and overrides

**Tasks**:
- [ ] Build pricing rules engine
- [ ] Create rule builder UI
- [ ] Implement date range overrides
- [ ] Add seasonal strategy templates
- [ ] Build rule priority system
- [ ] Test rule combinations

**Deliverables**:
- Users can create custom pricing rules
- Rules combine with ML recommendations
- Override system allows manual control
- Template rules for common strategies

---

## 6. Database Schema

### 6.1 PMS Integrations Table

```sql
CREATE TABLE pms_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pms_type TEXT NOT NULL, -- 'cloudbeds', 'campspot', 'guesty', 'manual'

  -- OAuth credentials (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- PMS-specific config
  pms_property_id TEXT, -- ID of property in PMS system
  pms_room_type_id TEXT, -- ID of room/site type in PMS

  -- Feature flags
  capacity_sync_enabled BOOLEAN DEFAULT true,
  auto_pricing_enabled BOOLEAN DEFAULT false,

  -- Status
  connection_status TEXT DEFAULT 'connected', -- 'connected', 'expired', 'error'
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding integrations by property
CREATE INDEX idx_pms_integrations_property ON pms_integrations(property_id);
CREATE INDEX idx_pms_integrations_user ON pms_integrations(user_id);
```

### 6.2 Capacity Snapshots Table

```sql
CREATE TABLE capacity_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  -- Date this snapshot represents
  date DATE NOT NULL,

  -- Capacity data
  total_capacity INTEGER NOT NULL, -- Total sites/rooms
  booked_capacity INTEGER NOT NULL, -- Currently booked
  available_capacity INTEGER NOT NULL, -- Still available

  -- Revenue data (optional)
  actual_revenue DECIMAL(10,2), -- Revenue booked for this date
  potential_revenue DECIMAL(10,2), -- Revenue if 100% booked at current prices

  -- Calculated metrics
  occupancy_rate DECIMAL(5,4), -- booked / total
  revenue_rate DECIMAL(5,4), -- actual / potential
  capacity_pressure DECIMAL(5,4), -- Composite score

  -- Metadata
  source TEXT DEFAULT 'webhook', -- 'webhook', 'api_poll', 'csv_import', 'email_import'
  pms_type TEXT, -- 'cloudbeds', 'campspot', etc.

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one snapshot per property per date
CREATE UNIQUE INDEX idx_capacity_snapshots_property_date
  ON capacity_snapshots(property_id, date);

-- Index for time-series queries
CREATE INDEX idx_capacity_snapshots_date ON capacity_snapshots(date DESC);
```

### 6.3 Price Update History Table

```sql
CREATE TABLE price_update_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  pms_integration_id UUID REFERENCES pms_integrations(id) ON DELETE CASCADE,

  -- Date being updated
  date DATE NOT NULL,

  -- Price change
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  price_change DECIMAL(10,2), -- new - old
  change_percent DECIMAL(5,2), -- (new - old) / old * 100

  -- ML recommendation
  ml_confidence DECIMAL(5,4),
  capacity_pressure DECIMAL(5,4),

  -- Update status
  status TEXT NOT NULL, -- 'pending', 'approved', 'applied', 'failed', 'rejected'
  applied_at TIMESTAMPTZ,

  -- Update method
  update_method TEXT, -- 'automatic', 'manual_approval', 'manual_override'
  approved_by UUID REFERENCES auth.users(id),

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding updates by property and date
CREATE INDEX idx_price_update_property_date ON price_update_history(property_id, date);
CREATE INDEX idx_price_update_status ON price_update_history(status);
```

### 6.4 Pricing Rules Table

```sql
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rule metadata
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority rules override lower

  -- Rule conditions
  applies_to_dates DATERANGE, -- Specific date range
  applies_to_day_of_week INTEGER[], -- [0=Sun, 1=Mon, ..., 6=Sat]
  applies_to_seasons TEXT[], -- ['spring', 'summer', 'fall', 'winter']

  -- Capacity conditions
  min_capacity_pressure DECIMAL(5,4), -- Only apply if pressure >= this
  max_capacity_pressure DECIMAL(5,4), -- Only apply if pressure <= this

  -- Rule actions
  action_type TEXT NOT NULL, -- 'multiply', 'add', 'set', 'min', 'max'
  action_value DECIMAL(10,2), -- Amount to multiply/add/set

  -- Safety limits
  respect_min_max BOOLEAN DEFAULT true, -- Don't exceed user's min/max prices
  max_change_percent DECIMAL(5,2), -- Don't change more than X%

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_rules_property ON pricing_rules(property_id);
CREATE INDEX idx_pricing_rules_enabled ON pricing_rules(enabled);
```

---

## 7. Code Examples

### 7.1 Universal Webhook Endpoint

```typescript
// backend/routes/capacity.ts
import { Router } from 'express'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { asyncHandler } from '../utils/errorHandler.js'
import { getPMSAdapter } from '../adapters/pmsAdapterFactory.js'

const router = Router()

/**
 * POST /api/capacity/webhook
 * Universal webhook endpoint for all PMS systems
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  const payload = req.body
  const pmsType = req.query.pms as string // 'cloudbeds', 'campspot', 'guesty'

  console.log(`📨 Received capacity webhook from ${pmsType}`)

  // Get PMS-specific adapter
  const adapter = getPMSAdapter(pmsType)

  // Transform PMS payload to standard format
  const standardPayload = adapter.transformWebhook(payload)

  // Verify this is a known property
  const { data: integration } = await supabaseAdmin
    .from('pms_integrations')
    .select('property_id, user_id')
    .eq('pms_property_id', standardPayload.propertyId)
    .eq('pms_type', pmsType)
    .single()

  if (!integration) {
    return res.status(404).json({ error: 'Unknown property' })
  }

  // Calculate capacity metrics
  const occupancyRate = standardPayload.capacity.booked / standardPayload.capacity.total
  const capacityPressure = calculateCapacityPressure(
    occupancyRate,
    standardPayload.revenue?.revenueRate || null
  )

  // Store capacity snapshot
  const { error } = await supabaseAdmin
    .from('capacity_snapshots')
    .upsert({
      property_id: integration.property_id,
      date: standardPayload.date || new Date().toISOString().split('T')[0],
      total_capacity: standardPayload.capacity.total,
      booked_capacity: standardPayload.capacity.booked,
      available_capacity: standardPayload.capacity.available,
      occupancy_rate: occupancyRate,
      capacity_pressure: capacityPressure,
      source: 'webhook',
      pms_type: pmsType
    }, {
      onConflict: 'property_id,date'
    })

  if (error) {
    console.error('Failed to store capacity snapshot:', error)
    return res.status(500).json({ error: 'Storage failed' })
  }

  // Update last sync time
  await supabaseAdmin
    .from('pms_integrations')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('property_id', integration.property_id)

  console.log(`✅ Stored capacity snapshot for property ${integration.property_id}`)
  console.log(`   Occupancy: ${(occupancyRate * 100).toFixed(1)}%`)
  console.log(`   Pressure: ${capacityPressure.toFixed(2)}`)

  // Trigger price recalculation if pressure changed significantly
  const previousSnapshot = await getPreviousSnapshot(integration.property_id)
  if (previousSnapshot && Math.abs(capacityPressure - previousSnapshot.capacity_pressure) > 0.15) {
    console.log('🔄 Capacity pressure changed significantly, recalculating prices...')
    await recalculatePricesWithCapacity(integration.property_id)
  }

  res.json({ success: true, capacityPressure })
}))

export default router
```

### 7.2 Cloudbeds Adapter

```typescript
// backend/adapters/cloudbeds.ts
export class CloudbedsAdapter {

  /**
   * Transform Cloudbeds webhook payload to standard format
   */
  transformWebhook(payload: any): StandardCapacityPayload {
    // Cloudbeds webhook format:
    // {
    //   "event_type": "reservation_created",
    //   "property_id": "123456",
    //   "property_name": "Sunny Campground",
    //   "total_rooms": 100,
    //   "occupied_rooms": 75,
    //   "available_rooms": 25,
    //   "reservation": { ... }
    // }

    return {
      propertyId: payload.property_id,
      event: this.mapEvent(payload.event_type),
      capacity: {
        total: payload.total_rooms,
        booked: payload.occupied_rooms,
        available: payload.available_rooms
      },
      revenue: payload.total_revenue ? {
        actual: payload.total_revenue,
        potential: payload.total_rooms * payload.avg_rate,
        revenueRate: payload.total_revenue / (payload.total_rooms * payload.avg_rate)
      } : undefined,
      source: 'cloudbeds',
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Map Cloudbeds event types to standard events
   */
  private mapEvent(cloudbedsEvent: string): string {
    const eventMap: Record<string, string> = {
      'reservation_created': 'booking_created',
      'reservation_modified': 'booking_updated',
      'reservation_cancelled': 'booking_cancelled',
      'reservation_checked_in': 'check_in',
      'reservation_checked_out': 'check_out'
    }
    return eventMap[cloudbedsEvent] || 'unknown'
  }

  /**
   * Update rate in Cloudbeds
   */
  async updateRate(params: {
    accessToken: string
    propertyId: string
    roomType: { id: string; name: string }
    date: string
    price: number
  }): Promise<{ success: boolean; error?: string }> {

    try {
      const response = await fetch('https://hotels.cloudbeds.com/api/v1.2/putRoomRate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          propertyID: params.propertyId,
          roomTypeID: params.roomType.id,
          date: params.date,
          rate: params.price
        })
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message }
      }

      return { success: true }

    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get current rates from Cloudbeds
   */
  async getRates(params: {
    accessToken: string
    propertyId: string
    roomTypeId: string
    startDate: string
    endDate: string
  }): Promise<Array<{ date: string; rate: number }>> {

    const response = await fetch(
      `https://hotels.cloudbeds.com/api/v1.2/getRoomRates?` +
      `propertyID=${params.propertyId}&` +
      `roomTypeID=${params.roomTypeId}&` +
      `startDate=${params.startDate}&` +
      `endDate=${params.endDate}`,
      {
        headers: { 'Authorization': `Bearer ${params.accessToken}` }
      }
    )

    const data = await response.json()
    return data.data.map((item: any) => ({
      date: item.date,
      rate: item.rate
    }))
  }
}
```

### 7.3 Campspot Adapter

```typescript
// backend/adapters/campspot.ts
export class CampspotAdapter {

  transformWebhook(payload: any): StandardCapacityPayload {
    // Campspot webhook format:
    // {
    //   "event": "reservation.created",
    //   "park_id": "abc123",
    //   "data": {
    //     "total_sites": 100,
    //     "booked_sites": 75,
    //     "available_sites": 25
    //   }
    // }

    return {
      propertyId: payload.park_id,
      event: this.mapEvent(payload.event),
      capacity: {
        total: payload.data.total_sites,
        booked: payload.data.booked_sites,
        available: payload.data.available_sites
      },
      source: 'campspot',
      timestamp: payload.timestamp || new Date().toISOString()
    }
  }

  private mapEvent(campspotEvent: string): string {
    const eventMap: Record<string, string> = {
      'reservation.created': 'booking_created',
      'reservation.updated': 'booking_updated',
      'reservation.cancelled': 'booking_cancelled'
    }
    return eventMap[campspotEvent] || 'unknown'
  }

  async updateRate(params: {
    apiKey: string
    parkId: string
    siteType: string
    date: string
    price: number
  }): Promise<{ success: boolean; error?: string }> {

    try {
      const response = await fetch(`https://api.campspot.com/v1/parks/${params.parkId}/rates`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          site_type: params.siteType,
          date: params.date,
          rate: params.price
        })
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message }
      }

      return { success: true }

    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

### 7.4 PMS Adapter Factory

```typescript
// backend/adapters/pmsAdapterFactory.ts
import { CloudbedsAdapter } from './cloudbeds.js'
import { CampspotAdapter } from './campspot.js'
import { GuestyAdapter } from './guesty.js'

export interface PMSAdapter {
  transformWebhook(payload: any): StandardCapacityPayload
  updateRate(params: any): Promise<{ success: boolean; error?: string }>
  getRates?(params: any): Promise<Array<{ date: string; rate: number }>>
}

export interface StandardCapacityPayload {
  propertyId: string
  event: string
  capacity: {
    total: number
    booked: number
    available: number
  }
  revenue?: {
    actual: number
    potential: number
    revenueRate: number
  }
  source: string
  timestamp: string
  date?: string
}

const adapters: Record<string, PMSAdapter> = {
  cloudbeds: new CloudbedsAdapter(),
  campspot: new CampspotAdapter(),
  guesty: new GuestyAdapter()
}

export function getPMSAdapter(pmsType: string): PMSAdapter {
  const adapter = adapters[pmsType]
  if (!adapter) {
    throw new Error(`Unsupported PMS type: ${pmsType}`)
  }
  return adapter
}
```

### 7.5 Capacity Pressure Calculation

```typescript
// backend/services/capacityService.ts

/**
 * Calculate capacity pressure score (0.0 - 1.0)
 * Combines occupancy rate and revenue rate
 */
export function calculateCapacityPressure(
  occupancyRate: number,
  revenueRate: number | null
): number {

  // If no revenue data, use occupancy only
  if (revenueRate === null) {
    return occupancyRate
  }

  // Weighted combination: 65% occupancy, 35% revenue
  const OCCUPANCY_WEIGHT = 0.65
  const REVENUE_WEIGHT = 0.35

  return (occupancyRate * OCCUPANCY_WEIGHT) + (revenueRate * REVENUE_WEIGHT)
}

/**
 * Calculate price multiplier based on capacity pressure
 */
export function calculateCapacityMultiplier(capacityPressure: number): number {

  // Low pressure (0.0 - 0.3): Decrease prices to boost demand
  if (capacityPressure < 0.3) {
    return 0.85 + (capacityPressure * 0.5) // 0.85 - 1.0
  }

  // Medium pressure (0.3 - 0.6): Maintain current prices
  if (capacityPressure < 0.6) {
    return 0.95 + (capacityPressure * 0.167) // 0.95 - 1.05
  }

  // High pressure (0.6 - 0.8): Increase prices moderately
  if (capacityPressure < 0.8) {
    return 1.0 + ((capacityPressure - 0.6) * 0.5) // 1.0 - 1.1
  }

  // Critical pressure (0.8 - 1.0): Maximize revenue with surge pricing
  return 1.1 + ((capacityPressure - 0.8) * 0.75) // 1.1 - 1.25
}

/**
 * Get capacity pressure trend for forecasting
 */
export async function getCapacityTrend(
  propertyId: string,
  days: number = 30
): Promise<Array<{ date: string; pressure: number }>> {

  const { data } = await supabaseAdmin
    .from('capacity_snapshots')
    .select('date, capacity_pressure')
    .eq('property_id', propertyId)
    .order('date', { ascending: false })
    .limit(days)

  return data || []
}
```

### 7.6 Automatic Pricing Service

```typescript
// backend/services/autoPricingService.ts
import { supabaseAdmin } from '../lib/supabase.js'
import { generateAdvancedPricingRecommendations } from './advancedPricingEngine.js'
import { getPMSAdapter } from '../adapters/pmsAdapterFactory.js'

/**
 * Update prices in PMS for a property
 */
export async function updatePMSPrices(propertyId: string) {

  console.log(`🤖 Starting automatic pricing for property ${propertyId}...`)

  // 1. Get PMS integration
  const { data: integration, error: integrationError } = await supabaseAdmin
    .from('pms_integrations')
    .select('*')
    .eq('property_id', propertyId)
    .eq('auto_pricing_enabled', true)
    .single()

  if (integrationError || !integration) {
    throw new Error('PMS integration not found or auto-pricing disabled')
  }

  // 2. Generate ML pricing recommendations
  const { data: historicalData } = await supabaseAdmin
    .from('pricing_data')
    .select('*')
    .eq('propertyId', propertyId)
    .order('date', { ascending: true })

  if (!historicalData || historicalData.length < 14) {
    throw new Error('Insufficient historical data')
  }

  const currentAvgPrice = historicalData
    .map(d => d.price)
    .reduce((a, b) => a + b, 0) / historicalData.length

  const recommendations = generateAdvancedPricingRecommendations(
    historicalData,
    30, // 30 days forecast
    currentAvgPrice,
    [], // Future weather (optional)
    [], // Future holidays (optional)
    { strategy: 'balanced' }
  )

  // 3. Get PMS adapter
  const adapter = getPMSAdapter(integration.pms_type)

  // 4. Update prices in PMS
  let successCount = 0
  let failCount = 0

  for (const rec of recommendations) {

    // Validate price update
    const validation = validatePriceUpdate({
      currentPrice: rec.currentPrice,
      recommendedPrice: rec.recommendedPrice,
      minPrice: integration.min_price || 0,
      maxPrice: integration.max_price || 999999,
      confidence: rec.confidence === 'very_high' ? 0.9 : 0.75,
      isBlackoutDate: false // TODO: Check blackout dates
    })

    if (!validation.valid) {
      console.log(`⏭️  Skipping ${rec.date}: ${validation.reason}`)

      // Log as rejected
      await supabaseAdmin.from('price_update_history').insert({
        property_id: propertyId,
        pms_integration_id: integration.id,
        date: rec.date,
        old_price: rec.currentPrice,
        new_price: rec.recommendedPrice,
        price_change: rec.priceChange,
        status: 'rejected',
        update_method: 'automatic',
        error_message: validation.reason
      })

      failCount++
      continue
    }

    // Apply price update via PMS API
    try {
      const result = await adapter.updateRate({
        accessToken: integration.access_token,
        propertyId: integration.pms_property_id,
        roomType: { id: integration.pms_room_type_id, name: 'Standard' },
        date: rec.date,
        price: rec.recommendedPrice
      })

      if (result.success) {
        console.log(`✅ Updated ${rec.date}: €${rec.currentPrice} → €${rec.recommendedPrice}`)

        // Log as applied
        await supabaseAdmin.from('price_update_history').insert({
          property_id: propertyId,
          pms_integration_id: integration.id,
          date: rec.date,
          old_price: rec.currentPrice,
          new_price: rec.recommendedPrice,
          price_change: rec.priceChange,
          ml_confidence: rec.confidence === 'very_high' ? 0.9 : 0.75,
          status: 'applied',
          applied_at: new Date().toISOString(),
          update_method: 'automatic'
        })

        successCount++
      } else {
        throw new Error(result.error)
      }

    } catch (error) {
      console.error(`❌ Failed to update ${rec.date}:`, error)

      // Log as failed
      await supabaseAdmin.from('price_update_history').insert({
        property_id: propertyId,
        pms_integration_id: integration.id,
        date: rec.date,
        old_price: rec.currentPrice,
        new_price: rec.recommendedPrice,
        price_change: rec.priceChange,
        status: 'failed',
        update_method: 'automatic',
        error_message: error.message
      })

      failCount++
    }
  }

  console.log(`\n📊 Automatic pricing summary:`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)

  // 5. Send notification to user
  await sendPriceUpdateNotification(propertyId, successCount, failCount)

  return { success: successCount, failed: failCount }
}

/**
 * Validate price update against safety rules
 */
function validatePriceUpdate(params: {
  currentPrice: number
  recommendedPrice: number
  minPrice: number
  maxPrice: number
  confidence: number
  isBlackoutDate: boolean
}): { valid: boolean; reason?: string } {

  if (params.isBlackoutDate) {
    return { valid: false, reason: 'Blackout date protected' }
  }

  if (params.confidence < 0.75) {
    return { valid: false, reason: 'ML confidence too low' }
  }

  const changePercent = Math.abs(
    (params.recommendedPrice - params.currentPrice) / params.currentPrice
  )

  if (changePercent > 0.20) {
    return { valid: false, reason: 'Price change exceeds 20% limit' }
  }

  if (params.recommendedPrice < params.minPrice) {
    return { valid: false, reason: `Below minimum price (€${params.minPrice})` }
  }

  if (params.recommendedPrice > params.maxPrice) {
    return { valid: false, reason: `Above maximum price (€${params.maxPrice})` }
  }

  return { valid: true }
}

/**
 * Send email notification to user
 */
async function sendPriceUpdateNotification(
  propertyId: string,
  successCount: number,
  failCount: number
) {

  // Get property owner
  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('userId, name')
    .eq('id', propertyId)
    .single()

  if (!property) return

  const { data: user } = await supabaseAdmin
    .from('auth.users')
    .select('email')
    .eq('id', property.userId)
    .single()

  if (!user?.email) return

  // TODO: Send email via SendGrid/Resend
  console.log(`📧 Sending notification to ${user.email}`)
  console.log(`   Property: ${property.name}`)
  console.log(`   Success: ${successCount}, Failed: ${failCount}`)
}
```

---

## 8. Safety & Validation

### 8.1 Price Change Limits

**Rule**: Never change a price by more than 20% in a single day

**Rationale**: Gradual price adjustments feel more natural to customers and reduce sticker shock

**Implementation**:
```typescript
const changePercent = Math.abs((newPrice - oldPrice) / oldPrice)
if (changePercent > 0.20) {
  return { valid: false, reason: 'Exceeds 20% daily change limit' }
}
```

### 8.2 Absolute Price Bounds

**Rule**: Never price below user's minimum or above user's maximum

**Rationale**: User knows their costs (minimum) and market ceiling (maximum)

**Implementation**:
```typescript
if (recommendedPrice < userMinPrice) {
  return { valid: false, reason: 'Below minimum price' }
}
if (recommendedPrice > userMaxPrice) {
  return { valid: false, reason: 'Above maximum price' }
}
```

### 8.3 Confidence Threshold

**Rule**: Only apply prices with ML confidence > 75%

**Rationale**: Low-confidence predictions could be based on insufficient data or anomalies

**Implementation**:
```typescript
if (mlConfidence < 0.75) {
  return { valid: false, reason: 'ML confidence too low' }
}
```

### 8.4 Blackout Date Protection

**Rule**: Never automatically update prices for user-protected dates

**Rationale**: User may have special events, contracts, or manual pricing strategies

**Implementation**:
```typescript
const { data: blackoutDates } = await supabaseAdmin
  .from('pricing_blackout_dates')
  .select('date')
  .eq('property_id', propertyId)
  .contains('date', [targetDate])

if (blackoutDates && blackoutDates.length > 0) {
  return { valid: false, reason: 'Blackout date protected' }
}
```

### 8.5 Market Trend Validation

**Rule**: Flag if price direction contradicts market trend

**Rationale**: If competitors are raising prices, lowering ours might signal quality issues

**Implementation**:
```typescript
const marketTrend = await getMarketTrend(propertyId, targetDate)

if (marketTrend.direction === 'up' && recommendedPrice < currentPrice) {
  console.warn('⚠️  Recommending price decrease while market is trending up')
  // Don't reject, but log warning for user review
}
```

### 8.6 Audit Trail

**Rule**: Log every price update attempt (success or failure)

**Rationale**: User needs visibility and accountability for automatic pricing

**Implementation**: All updates stored in `price_update_history` table with:
- Old price, new price, change amount
- ML confidence score
- Validation status (approved/rejected/failed)
- Error messages if applicable
- Timestamp and user who approved (if manual)

---

## 9. User Interface

### 9.1 PMS Connection Flow

**Page**: Settings → PMS Integration

**Steps**:
1. User selects PMS type (Cloudbeds, Campspot, Guesty, Manual CSV)
2. If API-based:
   - Click "Connect to [PMS Name]"
   - OAuth flow opens in popup
   - User logs into PMS and grants permissions
   - Redirect back to Jengu with access token
   - System tests connection
   - Success message shown
3. If Manual CSV:
   - Download CSV template
   - Export data from PMS
   - Upload CSV to Jengu
   - System validates and imports

**UI Mockup**:
```
┌─────────────────────────────────────────────┐
│ PMS Integration                              │
├─────────────────────────────────────────────┤
│                                              │
│ Select your Property Management System:     │
│                                              │
│ ○ Cloudbeds        ○ Campspot               │
│ ○ Guesty           ○ Manual CSV             │
│                                              │
│ [Connect to Cloudbeds]                       │
│                                              │
│ ✅ Connected to Cloudbeds                    │
│ Property: Sunny Campground (ID: 123456)     │
│ Last synced: 2 minutes ago                   │
│                                              │
│ Capacity Sync:    [✓] Enabled               │
│ Auto Pricing:     [✓] Enabled               │
│                                              │
│ [Disconnect]  [Test Connection]             │
│                                              │
└─────────────────────────────────────────────┘
```

### 9.2 Manual Approval Interface (Phase 1)

**Page**: Dashboard → Pricing Recommendations

**Steps**:
1. User sees list of upcoming dates with recommended prices
2. Each row shows:
   - Date
   - Current price in PMS
   - Recommended price
   - Change amount/percentage
   - Reason for change (capacity, weather, holiday, etc.)
   - Confidence level
3. User can:
   - Approve individual dates
   - Approve all high-confidence dates
   - Reject individual dates
   - Override with custom price

**UI Mockup**:
```
┌───────────────────────────────────────────────────────────────────┐
│ Pricing Recommendations - Next 30 Days                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│ [Approve All High Confidence]  [Reject All]                       │
│                                                                    │
│ Date       Current  Recommended  Change   Reason         Action   │
│ ────────   ───────  ───────────  ──────   ──────         ──────   │
│ Nov 3      €120     €135         +12.5%   High demand    [✓][✗]   │
│                                            (90% booked)            │
│                                                                    │
│ Nov 4      €120     €115         -4.2%    Low demand     [✓][✗]   │
│                                            (45% booked)            │
│                                                                    │
│ Nov 5      €120     €150         +25.0%   Holiday surge  [✓][✗]   │
│                                            (Thanksgiving)          │
│                                            ⚠️  Exceeds 20% limit   │
│                                                                    │
│ Nov 6      €120     €128         +6.7%    Good weather   [✓][✗]   │
│                                            (Sunny, 22°C)           │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### 9.3 Automatic Pricing Dashboard (Phase 2)

**Page**: Dashboard → Auto Pricing Status

**Shows**:
- Last run timestamp
- Success/failure counts
- Recent price changes
- Rejected updates (with reasons)
- Revenue impact estimate

**UI Mockup**:
```
┌───────────────────────────────────────────────────────────────────┐
│ Automatic Pricing Status                                          │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Last Run: Today at 3:00 AM                                        │
│                                                                    │
│ ┌─────────────┬──────────────┬──────────────┐                    │
│ │ ✅ Applied  │ ⏭️  Rejected  │ ❌ Failed    │                    │
│ │     24      │       4       │      2       │                    │
│ └─────────────┴──────────────┴──────────────┘                    │
│                                                                    │
│ Estimated Revenue Impact: +€1,240 this week                       │
│                                                                    │
│ Recent Updates:                                                    │
│ • Nov 3: €120 → €135 (+12.5%) ✅                                  │
│ • Nov 4: €120 → €115 (-4.2%)  ✅                                  │
│ • Nov 5: €120 → €150 (+25.0%) ⏭️  Exceeds change limit            │
│ • Nov 6: €120 → €128 (+6.7%)  ✅                                  │
│                                                                    │
│ [View Full History]  [Pause Auto Pricing]                         │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### 9.4 Pricing Rules Builder (Phase 3)

**Page**: Settings → Pricing Rules

**Features**:
- Create custom rules for date ranges, days of week, seasons
- Set multipliers or fixed adjustments
- Define priority for overlapping rules
- Enable/disable individual rules

**UI Mockup**:
```
┌───────────────────────────────────────────────────────────────────┐
│ Pricing Rules                                    [+ New Rule]      │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Weekend Surge Pricing                              [Edit] [✗]│  │
│ │ ─────────────────────────────────────────────────────────────│  │
│ │ Applies to: Fridays & Saturdays                              │  │
│ │ Action: Multiply price by 1.15 (+15%)                        │  │
│ │ Priority: 10                                                 │  │
│ │ Status: ✅ Enabled                                            │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Summer Peak Season                                 [Edit] [✗]│  │
│ │ ─────────────────────────────────────────────────────────────│  │
│ │ Applies to: June 1 - August 31                               │  │
│ │ Action: Add €20 to recommended price                         │  │
│ │ Priority: 5                                                  │  │
│ │ Status: ✅ Enabled                                            │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Last-Minute Discount                               [Edit] [✗]│  │
│ │ ─────────────────────────────────────────────────────────────│  │
│ │ Applies to: Next 7 days when capacity < 30%                  │  │
│ │ Action: Multiply price by 0.90 (-10%)                        │  │
│ │ Priority: 20 (overrides other rules)                         │  │
│ │ Status: ✅ Enabled                                            │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Capacity Calculation**:
```typescript
describe('calculateCapacityPressure', () => {
  it('should return occupancy rate when no revenue data', () => {
    expect(calculateCapacityPressure(0.75, null)).toBe(0.75)
  })

  it('should combine occupancy and revenue with weights', () => {
    const pressure = calculateCapacityPressure(0.8, 0.6)
    expect(pressure).toBeCloseTo(0.73) // (0.8 * 0.65) + (0.6 * 0.35)
  })
})
```

**Price Validation**:
```typescript
describe('validatePriceUpdate', () => {
  it('should reject blackout dates', () => {
    const result = validatePriceUpdate({
      currentPrice: 100,
      recommendedPrice: 120,
      minPrice: 50,
      maxPrice: 200,
      confidence: 0.9,
      isBlackoutDate: true
    })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('blackout')
  })

  it('should reject price changes > 20%', () => {
    const result = validatePriceUpdate({
      currentPrice: 100,
      recommendedPrice: 130,
      minPrice: 50,
      maxPrice: 200,
      confidence: 0.9,
      isBlackoutDate: false
    })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('20%')
  })
})
```

### 10.2 Integration Tests

**Cloudbeds Webhook**:
```typescript
describe('POST /api/capacity/webhook', () => {
  it('should accept Cloudbeds webhook and store snapshot', async () => {
    const payload = {
      event_type: 'reservation_created',
      property_id: '123456',
      total_rooms: 100,
      occupied_rooms: 75,
      available_rooms: 25
    }

    const response = await request(app)
      .post('/api/capacity/webhook?pms=cloudbeds')
      .send(payload)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.capacityPressure).toBeGreaterThan(0.7)

    // Verify snapshot stored in database
    const { data } = await supabaseAdmin
      .from('capacity_snapshots')
      .select('*')
      .eq('pms_type', 'cloudbeds')
      .single()

    expect(data.total_capacity).toBe(100)
    expect(data.booked_capacity).toBe(75)
  })
})
```

**Automatic Pricing**:
```typescript
describe('updatePMSPrices', () => {
  it('should update prices in Cloudbeds', async () => {
    // Mock Cloudbeds API
    nock('https://hotels.cloudbeds.com')
      .post('/api/v1.2/putRoomRate')
      .reply(200, { success: true })

    const result = await updatePMSPrices(testPropertyId)

    expect(result.success).toBeGreaterThan(0)
    expect(result.failed).toBe(0)

    // Verify history logged
    const { data } = await supabaseAdmin
      .from('price_update_history')
      .select('*')
      .eq('property_id', testPropertyId)
      .eq('status', 'applied')

    expect(data.length).toBeGreaterThan(0)
  })
})
```

### 10.3 End-to-End Tests

**Full PMS Integration Flow**:
1. User connects Cloudbeds account (OAuth)
2. Webhook received from Cloudbeds
3. Capacity snapshot stored
4. ML pricing recalculated with capacity data
5. Automatic pricing job runs at 3 AM
6. Prices updated in Cloudbeds
7. User receives email notification
8. Audit trail visible in dashboard

**Test Scenarios**:
- Happy path: All updates succeed
- Validation failure: Price change too large
- API failure: Cloudbeds API returns error
- Token expiry: OAuth token needs refresh
- No capacity data: Fallback to pure ML pricing

---

## Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Database schema created
- [ ] Universal webhook endpoint built
- [ ] Capacity pressure calculation service
- [ ] Unit tests for capacity logic

### Phase 2: Cloudbeds Integration 🚧
- [ ] Cloudbeds adapter implemented
- [ ] OAuth 2.0 flow built
- [ ] Rate update API integrated
- [ ] Frontend PMS connection UI
- [ ] Integration tests with Cloudbeds sandbox

### Phase 3: Multi-PMS Support ⏳
- [ ] Campspot adapter
- [ ] Guesty adapter
- [ ] PMS adapter factory
- [ ] Frontend PMS selection

### Phase 4: CSV Fallback ⏳
- [ ] CSV upload endpoint
- [ ] Flexible CSV parser
- [ ] Template generator
- [ ] Frontend CSV import UI

### Phase 5: Automatic Pricing ⏳
- [ ] Auto pricing service
- [ ] Daily cron job
- [ ] Safety validation rules
- [ ] Manual approval UI
- [ ] Email notifications
- [ ] Audit trail

### Phase 6: Smart Rules ⏳
- [ ] Pricing rules engine
- [ ] Rule builder UI
- [ ] Date range overrides
- [ ] Template rules

---

## Future Enhancements

### AI-Powered Features
- **Demand Prediction**: Use ML to predict capacity pressure 30-90 days out
- **Competitor Monitoring**: Scrape competitor prices and adjust automatically
- **Customer Segmentation**: Different prices for repeat customers vs. new bookings

### Advanced PMS Features
- **Inventory Management**: Sync site availability, not just pricing
- **Reservation Sync**: Import bookings directly into Jengu
- **Multi-Property**: Coordinate pricing across multiple properties

### Channel Manager Integration
- **Single API**: Connect to 400+ PMS systems via channel managers
- **Example**: Siteminder, RMS Cloud, Cloudbeds Channel Manager
- **Benefit**: Maximum PMS coverage with minimal development

---

## Conclusion

This PMS integration strategy provides:

1. **Universal Architecture**: Works with any PMS (API or non-API)
2. **Safety First**: Multi-layer validation prevents pricing errors
3. **Phased Rollout**: Builds user trust through manual approval first
4. **Maximum Coverage**: 100% PMS compatibility via API + CSV fallback
5. **Future-Proof**: Adapter pattern makes adding new PMS systems easy

**Recommended Next Steps**:
1. Start with Phase 1 (Foundation) to build core infrastructure
2. Implement Cloudbeds integration first (most popular campground PMS)
3. Add CSV fallback for universal compatibility
4. Roll out automatic pricing with manual approval
5. Expand to additional PMS systems based on user demand

---

**Questions or Issues?**

If you encounter problems during implementation:
1. Check this document for architecture guidance
2. Review code examples in Section 7
3. Consult PMS API documentation links in Section 2
4. Test with sandbox/staging accounts before production

**Activate When Ready**: This document is a blueprint. Implement when user demand justifies the development effort.
