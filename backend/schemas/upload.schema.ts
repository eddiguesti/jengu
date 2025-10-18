import { z } from 'zod'

/**
 * File upload validation schema
 *
 * Validates file metadata before processing
 */
export const fileUploadSchema = z.object({
  file: z.object({
    mimetype: z.enum(['text/csv', 'application/vnd.ms-excel']),
    size: z.number().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
    originalname: z.string().regex(/\.csv$/i, 'File must have .csv extension'),
  }),
})

/**
 * CSV content validation schema
 *
 * Validates parsed CSV structure
 */
export const csvContentSchema = z.object({
  headers: z.array(z.string()).min(1, 'CSV must have at least one column'),
  rows: z
    .array(z.record(z.string(), z.any()))
    .min(1, 'CSV must have at least one row')
    .max(100000, 'CSV file too large (max 100,000 rows)'),
})

export type FileUpload = z.infer<typeof fileUploadSchema>
export type CSVContent = z.infer<typeof csvContentSchema>
