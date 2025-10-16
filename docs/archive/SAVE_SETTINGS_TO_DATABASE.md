# 🔧 Save Business Settings to Supabase Database

## Problem

Business settings (name, location, currency, etc.) are only saved to **browser memory** (Zustand store), NOT to Supabase database.

**Result:**

- ❌ Settings disappear on page refresh
- ❌ Settings not saved between sessions
- ❌ Settings lost when switching pages

## Solution

Save settings to Supabase `business_settings` table linked to userId.

---

## Step 1: Create Database Table in Supabase

###Go to: https://supabase.com/dashboard/project/geehtuuyyxhyissplfjb/editor

### Run this SQL:

```sql
-- Create business_settings table
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  property_type VARCHAR(50),
  city VARCHAR(100),
  country VARCHAR(100),
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  currency VARCHAR(10) DEFAULT 'EUR',
  timezone VARCHAR(50) DEFAULT 'Europe/Paris',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(userId)
);

-- Enable Row Level Security
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only access their own settings
CREATE POLICY "Users can manage their own settings"
  ON business_settings
  FOR ALL
  USING (auth.uid() = userId);

-- Create index for faster lookups
CREATE INDEX idx_business_settings_user ON business_settings(userId);
```

---

## Step 2: Add Backend API Endpoint

I'll create endpoints to:

- `GET /api/settings` - Get user's business settings
- `POST /api/settings` - Save/update user's business settings

---

## Step 3: Update Frontend Settings Page

Update Settings.tsx to:

- Load settings from Supabase on page load
- Save settings to Supabase when clicking "Save"
- Show success/error messages

---

## Implementation Steps

1. ✅ You create the table in Supabase (run SQL above)
2. ✅ I'll add backend endpoints
3. ✅ I'll update frontend Settings page
4. ✅ Test: Save settings, refresh page, settings still there!

---

**Ready to implement?**

First, go to Supabase and run that SQL to create the table, then I'll update the code!
