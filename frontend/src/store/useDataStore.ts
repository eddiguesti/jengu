import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UploadedFile {
  id: string // Backend file ID (e.g., "1728931234567-bookings.csv")
  name: string
  size: number
  rows: number
  columns: number
  uploaded_at: string
  status: 'uploaded' | 'enriching' | 'complete' | 'error'
  preview?: any[] // Store preview data for quick display
  // Note: csvData is NO LONGER stored here - fetch from backend API instead
  // Use GET /api/files/:fileId/data to retrieve full CSV data
}

interface DataStore {
  // State
  uploadedFiles: UploadedFile[]
  currentFileId: string | null
  isUploading: boolean

  // Actions
  addFile: (file: UploadedFile) => void
  removeFile: (fileId: string) => void
  updateFileStatus: (fileId: string, status: UploadedFile['status']) => void
  setCurrentFile: (fileId: string | null) => void
  setUploading: (isUploading: boolean) => void
  clearFiles: () => void
}

export const useDataStore = create<DataStore>()(
  persist(
    (set) => ({
      // Initial state
      uploadedFiles: [],
      currentFileId: null,
      isUploading: false,

      // Actions
      addFile: (file) =>
        set((state) => ({
          uploadedFiles: [...state.uploadedFiles, file],
          currentFileId: file.id,
        })),

      removeFile: (fileId) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.filter((f) => f.id !== fileId),
          currentFileId: state.currentFileId === fileId ? null : state.currentFileId,
        })),

      updateFileStatus: (fileId, status) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.map((f) =>
            f.id === fileId ? { ...f, status } : f
          ),
        })),

      setCurrentFile: (fileId) =>
        set({ currentFileId: fileId }),

      setUploading: (isUploading) =>
        set({ isUploading }),

      clearFiles: () =>
        set({ uploadedFiles: [], currentFileId: null }),
    }),
    {
      name: 'jengu-data-storage',
    }
  )
)
