# Intelligent CSV Column Mapping System

**Last Updated**: 2025-10-20
**Location**: `backend/services/csvMapper.ts`
**Purpose**: Automatically detects and maps various CSV column formats to standardized fields

## Overview

The CSV Mapper intelligently handles different CSV formats by:

1. **Auto-detecting column names** - Handles variations like "date" vs "check_in" vs "booking_date"
2. **Intelligent column mapping** - Standardizes field names automatically
3. **Data validation and cleaning** - Validates and cleans data before saving to Supabase
4. **Flexible handling of missing columns** - Works with incomplete CSVs

## Supported Column Variations

### Date Fields

Recognizes: `date`, `check_in`, `checkin`, `check-in`, `arrival`, `arrival_date`, `booking_date`, `stay_date`, `night_date`, `checkout`, `check_out`, `check-out`

### Price/Rate Fields

Recognizes: `price`, `rate`, `nightly_rate`, `daily_rate`, `room_rate`, `adr`, `average_daily_rate`, `tariff`, `cost`, `amount`

### Revenue Fields

Recognizes: `revenue`, `total_revenue`, `income`, `sales`, `turnover`

### Bookings/Reservations

Recognizes: `bookings`, `reservations`, `rooms_sold`, `units_sold`, `occupied_rooms`, `sold_rooms`, `number_of_bookings`, `booking_count`

### Availability

Recognizes: `availability`, `available_rooms`, `total_rooms`, `inventory`, `capacity`, `rooms_available`, `units_available`

### Occupancy

Recognizes: `occupancy`, `occupancy_rate`, `occ`, `occ_rate`, `occupancy_pct`, `occupancy_percent`

**Note**: If occupancy is not provided but bookings and availability are, occupancy is automatically calculated as `(bookings / availability) * 100`

### Unit/Room Type

Recognizes: `unit_type`, `room_type`, `accommodation_type`, `property_type`, `unit`, `room`, `type`, `category`

### Channel/Source

Recognizes: `channel`, `source`, `booking_source`, `distribution_channel`, `ota`, `platform`, `marketplace`

### Property Identification

Recognizes: `property_id`, `property`, `id`, `listing_id`, `unit_id`, `property_name`, `name`, `listing_name`, `title`

### Guests

Recognizes: `guests`, `pax`, `number_of_guests`, `guest_count`, `people`

### Nights/Length of Stay

Recognizes: `nights`, `length_of_stay`, `los`, `stay_length`, `duration`

### Rate Plan

Recognizes: `rate_plan`, `plan`, `package`, `offer`, `promotion`

## How It Works

### 1. Column Detection

When a CSV is uploaded, the system:

- Reads all column headers
- Normalizes them (lowercase, trim, remove special characters)
- Matches them against known patterns
- Creates a mapping table

### 2. Data Transformation

For each row:

- Extracts values using the detected mapping
- Cleans and validates each field
- Converts to standardized types (Date, Number, String)
- Calculates derived fields (e.g., occupancy from bookings/availability)

### 3. Validation

- Checks for required fields (date and price)
- Validates data ranges (e.g., price > 0, occupancy 0-100%)
- Generates warnings for invalid data
- Provides detailed validation statistics

### 4. Mapping Report

The system generates a detailed report showing:

- Which columns were mapped
- Validation statistics
- Sample standardized data
- Warnings and issues

## Example Mapping Report

```
📊 CSV Mapping Report
==================================================

🔗 Column Mapping:
   ✓ date                 ← "check_in"
   ✓ price                ← "nightly_rate"
   ✓ bookings             ← "rooms_sold"
   ✓ availability         ← "total_rooms"
   ✓ unit_type            ← "room_type"
   ✓ channel              ← "booking_source"
   ⚠️  2 standard fields not found in CSV

📈 Validation Stats:
   Total Rows: 1000
   Valid Rows: 998 (99.8%)
   Date Range: 2024-01-01 to 2024-12-31
   Price Range: €45.00 - €350.00 (avg: €125.50)

⚠️  Warnings:
   - 2 rows have invalid data
   - 145 rows missing occupancy data (will be calculated if possible)

📝 Sample Standardized Data (first 3 rows):
   Row 1:
      Date: 2024-01-01
      Price: €120.00
      Unit Type: Deluxe Suite
      Bookings: 15
      Availability: 20
      Occupancy: 75.0%
      Channel: Airbnb
```

## Supported CSV Formats

### Format 1: Basic Pricing

```csv
date,price,occupancy
2024-01-01,100,75
2024-01-02,120,80
```

### Format 2: Airbnb Export

```csv
check_in,nightly_rate,guest_count,nights
2024-01-01,100.00,2,3
2024-01-02,120.00,4,2
```

### Format 3: Booking.com Format

```csv
arrival_date,room_rate,booking_source,rooms_sold,total_rooms
2024-01-01,100,Direct,15,20
2024-01-02,120,OTA,18,20
```

### Format 4: Property Management System

```csv
booking_date,daily_rate,accommodation_type,reservations,inventory,distribution_channel
2024-01-01,100,Studio,10,15,Website
2024-01-02,120,1 Bedroom,12,15,Booking.com
```

## API Response

### Success Response

```json
{
  "success": true,
  "file": {
    "id": "uuid-here",
    "name": "my-data.csv",
    "size": 12345,
    "rows": 1000,
    "columns": 6,
    "preview": [...],
    "uploaded_at": "2024-01-01T00:00:00Z",
    "status": "complete"
  }
}
```

### Error Response (Invalid Data)

```json
{
  "error": "INVALID_DATA",
  "message": "No valid rows found. Please check your CSV format.",
  "details": ["Invalid or missing date", "Invalid or missing price"]
}
```

## Data Storage

All fields are stored in the `pricing_data` table:

### Core Fields (in dedicated columns)

- `date` - Date (YYYY-MM-DD)
- `price` - Decimal number
- `occupancy` - Decimal number (0-100)
- `bookings` - Integer
- `temperature` - Decimal (filled by enrichment)
- `weatherCondition` - String (filled by enrichment)

### Extra Data (in JSONB column)

- All other fields stored in `extraData` JSONB column
- Allows full flexibility for any CSV format
- Queryable using JSONB operators

## Benefits

1. **No Manual Column Mapping** - System automatically detects columns
2. **Works with Any Format** - Supports dozens of column name variations
3. **Data Quality Assurance** - Validates and cleans data automatically
4. **Detailed Reporting** - Know exactly what was imported and any issues
5. **Backwards Compatible** - All existing CSVs still work
6. **Future-Proof** - Easy to add new column patterns

## Adding New Column Patterns

To support a new column name variation:

1. Open `backend/services/csvMapper.ts`
2. Find the `COLUMN_PATTERNS` object
3. Add the new variation to the appropriate array

Example:

```typescript
const COLUMN_PATTERNS = {
  price: [
    'price',
    'rate',
    // ... existing patterns
    'tarifa', // Add Spanish variation
    'prix', // Add French variation
  ],
  // ... other fields
}
```

## Testing Different CSV Formats

The system automatically handles:

- Different date formats (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY)
- Currency symbols ($, €, £) in price fields
- Commas and spaces in numbers
- Different text encodings
- Missing or empty values

## Error Handling

The system provides clear errors for:

- **No valid rows**: When date or price is missing in all rows
- **Low validation rate**: When < 50% of rows are valid (warning in logs)
- **Column detection failures**: When required fields aren't found

## Console Output

During upload, you'll see detailed logs:

```
📥 Processing CSV file: data.csv (25000 bytes)
🔍 Scanning file for malicious content...
✅ Content security check passed
⏳ Creating property record...
✅ Created property record: uuid-here
📊 CSV Columns (6): [ 'check_in', 'nightly_rate', 'room_type', ... ]
🧠 Detecting column mapping...
📊 Column Mapping: { date: 'check_in', price: 'nightly_rate', ... }

📊 CSV Mapping Report
==================================================
... (detailed report)
==================================================

📥 Processing 998 valid rows...
✅ Inserted batch 1 (1000 rows, 1000/1000 total)
✅ Processing complete: 1000 rows, 6 columns
```

## Future Enhancements

Potential improvements:

- Machine learning for column detection
- User-customizable column mappings
- Multi-language support
- Automatic currency conversion
- Support for Excel files (.xlsx)
- Support for compressed files (.zip)

## Related Documentation

- **Architecture**: See `docs/developer/ARCHITECTURE.md`
- **File Upload Flow**: See "File Management" section in ARCHITECTURE.md
- **Data Transformation**: See `backend/services/dataTransform.ts`
- **Enrichment**: See `backend/services/enrichmentService.ts`
