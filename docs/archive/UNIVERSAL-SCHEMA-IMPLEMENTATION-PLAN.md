# UNIVERSAL CAMPSITE SCHEMA - IMPLEMENTATION PLAN

**Created**: October 25, 2025
**Status**: Ready for Implementation
**Estimated Time**: 6-8 hours

---

## 🎯 WHAT THIS ACHIEVES

### **Universal Flexibility**
✅ Works for ANY campsite with ANY data structure
✅ Supports mobile homes, pitches, glamping, chalets, rooms, etc.
✅ Handles ANY pricing model (per-night, per-week, per-person)
✅ Adapts to ANY CSV format
✅ True multi-tenant SaaS ready

### **Proper Data Correlation**
✅ ONE enrichment record per date/location (no duplication!)
✅ Weather data properly linked to pricing dates
✅ Multiple properties share enrichment data (efficient!)
✅ Easy to query: "Show bookings on rainy days"

### **Future-Proof**
✅ Easy to add new features
✅ Supports competitor monitoring
✅ Supports multiple properties per user
✅ API-ready architecture

---

## 📊 NEW SCHEMA OVERVIEW

```
USERS (Supabase Auth)
  └── properties (campsites)
        ├── accommodation_types (user-defined: "Luxury Mobile Home", "Premium Pitch")
        ├── seasonal_periods (user-defined: "Peak", "High", "Shoulder", "Off")
        └── daily_pricing
              ├── Flexible JSONB for ANY pricing structure
              ├── Flexible JSONB for ANY booking details
              ├── Flexible JSONB for ANY custom CSV columns
              └── Links to → enrichment_data (by date)

enrichment_data (SHARED across properties!)
  - One record per DATE + LOCATION
  - Weather, holidays, temporal features
  - No duplication!

competitors
  └── competitor_pricing
        └── Also links to enrichment_data
```

---

## 📁 FILES CREATED

### 1. Documentation
- ✅ `docs/developer/UNIVERSAL-CAMPSITE-SCHEMA.md` - Complete design docs
- ✅ `UNIVERSAL-SCHEMA-IMPLEMENTATION-PLAN.md` - This file

### 2. Database Migration
- ✅ `backend/migrations/universal-campsite-schema.sql` - Full SQL migration (ready to run!)

### 3. Still To Create
- ⏳ `backend/types/universal-schema.types.ts` - TypeScript types
- ⏳ `backend/services/universalCSVMapper.ts` - Smart CSV mapping
- ⏳ `backend/services/enrichmentServiceV2.ts` - New enrichment with proper correlation
- ⏳ `backend/routes/properties.ts` - New properties API
- ⏳ `backend/routes/accommodationTypes.ts` - Manage accommodation types
- ⏳ `docs/developer/DATA_MIGRATION_GUIDE.md` - Migrate existing data

---

## 🚀 IMPLEMENTATION STEPS

### PHASE 1: Database Migration (2 hours)

#### Step 1.1: Backup Current Database
```bash
# Via Supabase Dashboard:
# 1. Go to Database → Backups
# 2. Create manual backup: "pre-universal-schema-migration"
# 3. Wait for completion
```

#### Step 1.2: Run Migration SQL
```sql
-- In Supabase SQL Editor:
-- 1. Open backend/migrations/universal-campsite-schema.sql
-- 2. Copy entire contents
-- 3. Paste into SQL Editor
-- 4. Click "Run" (takes ~30 seconds)
-- 5. Verify: Check "Tables" in left sidebar
--    Should see: properties, accommodation_types, seasonal_periods,
--                 daily_pricing, enrichment_data, source_files
```

#### Step 1.3: Verify RLS Policies
```sql
-- Test RLS is working:
SELECT * FROM properties; -- Should return empty (no test data yet)

-- Check policies exist:
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('properties', 'accommodation_types', 'daily_pricing');
-- Should show ~15 policies
```

#### Step 1.4: Generate TypeScript Types
```bash
cd backend

# Install Supabase CLI if not already installed
npm install -g supabase

# Generate types (requires Supabase project ID)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts

# Or using local Supabase:
npx supabase db pull
npx supabase gen types typescript --local > types/database.types.ts
```

**Result**: New `database.types.ts` with all new tables!

---

### PHASE 2: Backend Service Updates (3 hours)

#### Step 2.1: Create Universal CSV Mapper

**File**: `backend/services/universalCSVMapper.ts`

**Purpose**: Intelligently map ANY CSV format to the schema

**Key Features**:
- Auto-detect date columns (any format)
- Auto-detect accommodation type columns
- Auto-detect price columns
- Store unmapped columns in `custom_data` JSONB
- Return confidence score

**Pseudo-code**:
```typescript
// Detect columns
const mapping = detectColumns(csvHeaders);
// mapping.date = "CheckIn" or "Date" or "Arrival"
// mapping.accommodation = "UnitType" or "Accommodation" or "Room"
// mapping.price = "Price" or "Rate" or "Nightly"
// mapping.unmapped = ["Custom_Field_1", "Internal_ID"]

// Map rows
const standardized = csvRows.map(row => ({
  date: parseDate(row[mapping.date]),
  accommodation_type: row[mapping.accommodation],
  price: parseFloat(row[mapping.price]),
  custom_data: {
    [mapping.unmapped[0]]: row[mapping.unmapped[0]],
    // ... all unmapped fields
  }
}));
```

#### Step 2.2: Update Enrichment Service

**File**: `backend/services/enrichmentServiceV2.ts`

**Key Change**: Create/update `enrichment_data` table instead of updating `pricing_data` directly

**New Flow**:
```typescript
async function enrichProperty(propertyId: string) {
  // 1. Get property location
  const property = await supabase.from('properties').select('*').eq('id', propertyId).single();
  const { latitude, longitude } = property;

  // 2. Get all dates needing enrichment
  const dates = await supabase
    .from('daily_pricing')
    .select('enrichment_date')
    .eq('property_id', propertyId)
    .distinct();

  // 3. For each date, create/update enrichment_data
  for (const { enrichment_date } of dates) {
    const locationHash = `${Math.round(latitude * 100) / 100},${Math.round(longitude * 100) / 100}`;

    // Check if enrichment already exists
    const existing = await supabase
      .from('enrichment_data')
      .select('*')
      .eq('location_hash', locationHash)
      .eq('date', enrichment_date)
      .single();

    if (existing) {
      console.log(`✅ Enrichment already exists for ${enrichment_date} at ${locationHash}`);
      continue; // Reuse existing!
    }

    // Fetch weather + holidays
    const weather = await fetchWeather(latitude, longitude, enrichment_date);
    const holiday = await fetchHoliday(latitude, longitude, enrichment_date);

    // Insert enrichment data (ONE RECORD for this date/location)
    await supabase.from('enrichment_data').insert({
      latitude,
      longitude,
      date: enrichment_date,
      ...weather,
      ...holiday,
      enrichment_status: 'enriched',
      enriched_at: new Date(),
    });
  }

  console.log(`🎉 Enrichment complete for property ${propertyId}`);
}
```

**Result**: No more duplicate weather data! Properties in same area share enrichment records.

#### Step 2.3: Update File Upload Route

**File**: `backend/routes/files.ts`

**Changes**:
1. After CSV upload, detect accommodation types
2. Auto-create `accommodation_types` if they don't exist
3. Insert into `daily_pricing` with `enrichment_date = date`
4. Queue enrichment job

**Example**:
```typescript
// Detect unique accommodation types in CSV
const uniqueTypes = [...new Set(csvRows.map(r => r.accommodation))];

// Auto-create accommodation types
for (const typeName of uniqueTypes) {
  await supabase.from('accommodation_types').upsert({
    property_id: propertyId,
    name: typeName,
    code: typeName.toUpperCase().replace(/\s+/g, '_'),
    is_active: true,
  }, { onConflict: 'property_id,code' });
}

// Insert pricing data
await supabase.from('daily_pricing').insert(
  csvRows.map(row => ({
    property_id: propertyId,
    accommodation_type_id: accommodationTypeIds[row.accommodation],
    date: row.date,
    price: row.price,
    enrichment_date: row.date, // KEY: Links to enrichment
    pricing_data: { /* flexible pricing details */ },
    custom_data: { /* unmapped CSV columns */ },
  }))
);

// Queue enrichment
await enqueueEnrichment(propertyId);
```

#### Step 2.4: Create Properties API

**File**: `backend/routes/properties.ts`

**Endpoints**:
- `GET /api/properties` - List user's properties
- `POST /api/properties` - Create property
- `GET /api/properties/:id` - Get property details
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

**Accommodation Types**:
- `GET /api/properties/:id/accommodation-types` - List types
- `POST /api/properties/:id/accommodation-types` - Create type
- `PUT /api/accommodation-types/:id` - Update type
- `DELETE /api/accommodation-types/:id` - Delete type

**Seasonal Periods**:
- `GET /api/properties/:id/seasonal-periods` - List seasons
- `POST /api/properties/:id/seasonal-periods` - Create season
- `PUT /api/seasonal-periods/:id` - Update season
- `DELETE /api/seasonal-periods/:id` - Delete season

---

### PHASE 3: Frontend Updates (2 hours)

#### Step 3.1: Property Setup Flow

**New User Flow**:
1. Sign up
2. Create property (name, location, etc.)
3. Define accommodation types (or auto-detect from CSV)
4. Define seasonal periods (optional)
5. Upload historical CSV
6. System enriches automatically

**UI Needed**:
- Property creation form
- Accommodation type manager (add/edit/delete)
- Season manager (add/edit/delete)

#### Step 3.2: Update Data Upload

**Changes**:
- CSV upload now links to specific property
- Show detected accommodation types (let user confirm)
- Show column mapping preview
- Confirm unmapped columns → custom_data

#### Step 3.3: Update Analytics Queries

**Old Query** (broken after migration):
```typescript
const { data } = await supabase
  .from('pricing_data')
  .select('*')
  .eq('propertyId', id); // Old schema
```

**New Query**:
```typescript
const { data } = await supabase
  .from('daily_pricing_enriched') // Use view for easy joins
  .select('*')
  .eq('property_id', id);

// Result includes:
// - All pricing data
// - Accommodation type name
// - Weather data (temperature, precipitation, etc.)
// - Holiday data
// - Temporal features (day of week, season, etc.)
```

**New Query Examples**:
```typescript
// "Show bookings when temperature > 25°C"
const { data } = await supabase
  .from('daily_pricing_enriched')
  .select('*')
  .eq('property_id', propertyId)
  .gt('temperature', 25)
  .eq('availability_status', 'occupied');

// "Show occupancy by weather condition"
const { data } = await supabase
  .from('daily_pricing_enriched')
  .select('weather_condition, occupancy_rate')
  .eq('property_id', propertyId)
  .order('occupancy_rate', { ascending: false });

// "Compare my prices vs. competitor on sunny days"
const query = `
  SELECT
    dp.date,
    dp.price AS my_price,
    cp.price AS competitor_price,
    e.weather_condition
  FROM daily_pricing dp
  JOIN enrichment_data e ON
    dp.enrichment_date = e.date AND
    e.location_hash = (SELECT ROUND(latitude::numeric, 2)::text || ',' || ROUND(longitude::numeric, 2)::text FROM properties WHERE id = dp.property_id)
  JOIN competitor_pricing cp ON cp.enrichment_date = e.date
  WHERE dp.property_id = '${propertyId}'
    AND e.weather_condition = 'sunny'
`;
```

---

### PHASE 4: Data Migration (1 hour)

**IF you have existing data in the old schema**, create migration script:

**File**: `backend/scripts/migrate-to-universal-schema.ts`

**Steps**:
1. Create default property for each user
2. Create default accommodation type "Standard Unit"
3. Migrate `pricing_data` → `daily_pricing`
4. Extract weather data into `enrichment_data` (deduplicate!)
5. Verify data integrity

**Run**:
```bash
cd backend
tsx scripts/migrate-to-universal-schema.ts
```

---

## ✅ TESTING CHECKLIST

### After Phase 1 (Database)
- [ ] All tables created successfully
- [ ] RLS policies in place
- [ ] TypeScript types generated
- [ ] Can insert test property via SQL Editor

### After Phase 2 (Backend)
- [ ] CSV upload works
- [ ] Accommodation types auto-created
- [ ] Enrichment job queues
- [ ] Enrichment creates `enrichment_data` records
- [ ] No duplicate enrichment records for same date/location
- [ ] Properties API works (CRUD operations)

### After Phase 3 (Frontend)
- [ ] Property creation form works
- [ ] Accommodation type manager works
- [ ] CSV upload shows column mapping
- [ ] Analytics queries return enriched data
- [ ] Can query by weather conditions

### After Phase 4 (Migration)
- [ ] Old data migrated successfully
- [ ] Old `pricing_data` table can be archived
- [ ] Data integrity verified (row counts match)

---

## 🎬 QUICK START (For New Deployments)

If you're starting fresh (no existing data):

```bash
# 1. Run migration
# Copy backend/migrations/universal-campsite-schema.sql
# Paste into Supabase SQL Editor → Run

# 2. Generate types
cd backend
npx supabase gen types typescript --project-id YOUR_ID > types/database.types.ts

# 3. Create sample property (via SQL Editor)
INSERT INTO properties (user_id, name, latitude, longitude, city, country)
VALUES (
  auth.uid(),
  'My Test Campsite',
  43.296482,
  5.374658,
  'Saint-Cyr-sur-Mer',
  'France'
);

# 4. Create sample accommodation types
INSERT INTO accommodation_types (property_id, name, category, capacity_people)
VALUES
  ((SELECT id FROM properties WHERE user_id = auth.uid() LIMIT 1), 'Luxury Mobile Home', 'mobile_home', 6),
  ((SELECT id FROM properties WHERE user_id = auth.uid() LIMIT 1), 'Standard Pitch', 'pitch', 6);

# 5. Upload test CSV
# CSV should have columns: Date, Accommodation, Price
# System will auto-map and enrich!

# 6. Query enriched data
SELECT * FROM daily_pricing_enriched WHERE property_id = 'your-property-id';
```

**Done!** Your universal schema is ready.

---

## 📝 EXAMPLE: Universal Schema in Action

### Campsite A (France)
**CSV**:
```
Date,UnitType,Price,Bookings
2024-06-01,Mobil Home Luxe,180,2
2024-06-01,Emplacement Premium,45,5
```

**System**:
1. Auto-creates accommodation types: "Mobil Home Luxe", "Emplacement Premium"
2. Inserts to `daily_pricing`
3. Enriches: Fetches weather for `lat: 43.30, lon: 5.37, date: 2024-06-01`
4. Creates `enrichment_data` record

**Query**:
```sql
SELECT * FROM daily_pricing_enriched WHERE property_id = 'campsite-a-id';
-- Returns pricing + weather + holidays for Campsite A
```

### Campsite B (Spain) - Different Data!
**CSV**:
```
CheckIn,Accommodation,WeeklyRate,Guests
15/06/2024,Safari Tent,650,4
22/06/2024,Yurt,420,2
```

**System**:
1. Auto-creates accommodation types: "Safari Tent", "Yurt"
2. Detects "WeeklyRate" → stores in `pricing_data.pricing_unit = 'per_week'`
3. Stores "Guests" in `custom_data.guests = 4`
4. Enriches: Fetches weather for Campsite B's location
5. Creates `enrichment_data` record for Campsite B location

**Query**:
```sql
SELECT * FROM daily_pricing_enriched WHERE property_id = 'campsite-b-id';
-- Returns pricing + weather for Campsite B
```

**Both work with the SAME schema!** 🎉

---

## 🚨 IMPORTANT NOTES

### 1. Location Rounding
Properties within ~1km share enrichment data (rounded to 2 decimals).
- Property A: `43.296482, 5.374658` → `43.30, 5.37`
- Property B: `43.298123, 5.376543` → `43.30, 5.38` (different hash)

### 2. Enrichment is Asynchronous
Don't expect enrichment to complete immediately after upload. Show progress UI.

### 3. Custom Data Storage
ANY unmapped CSV columns go into `custom_data` JSONB. Users can query custom fields:
```sql
SELECT * FROM daily_pricing
WHERE custom_data->>'internal_code' = 'ABC123';
```

### 4. Flexible Pricing Structure
Use `pricing_data` JSONB for complex pricing:
```json
{
  "base_price": 45.00,
  "pricing_unit": "per_night",
  "supplements": {
    "extra_adult": 8.50,
    "extra_child": 5.00,
    "electricity": 4.00
  },
  "total_price": 61.50
}
```

### 5. Seasonal Periods are Optional
Users can define seasons OR just use date-based pricing. Both work!

---

## 📚 NEXT STEPS

After completing this migration:

1. **Update Docs**: Update `CLAUDE.md` to reference new schema
2. **Update API Docs**: Regenerate OpenAPI docs
3. **Add Tests**: Unit tests for universal CSV mapper
4. **User Migration**: Email existing users about new features
5. **Performance Monitoring**: Watch enrichment queue performance

---

## 🎯 SUCCESS CRITERIA

✅ Any campsite can sign up and upload their data
✅ System adapts to their CSV format automatically
✅ Enrichment data properly correlated by date
✅ No duplicate weather data
✅ Easy to query: "Show bookings on rainy Saturdays in July"
✅ Competitor data links to same enrichment records
✅ Multi-property support (users can manage multiple campsites)

---

**Ready to implement? Start with Phase 1!** 🚀

**Questions?** See `docs/developer/UNIVERSAL-CAMPSITE-SCHEMA.md` for full technical details.
