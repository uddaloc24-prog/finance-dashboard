// Personal details captured at first launch — used to personalise the app
// and to stamp the downloadable PDF report with the user's name + profile.
//
// Storage: localStorage only. Never transmitted off-device.

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'

export interface PostalAddress {
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
}

export interface UserIdentity {
  fullName: string
  email?: string
  phone?: string
  dateOfBirth?: string         // ISO date "YYYY-MM-DD"
  panCard?: string             // optional, never validated/sent
  maritalStatus?: MaritalStatus
  spouseName?: string
  address?: PostalAddress
  occupation?: string
  createdAt: string            // ISO timestamp
  updatedAt: string            // ISO timestamp
}

export const EMPTY_IDENTITY: UserIdentity = {
  fullName: '',
  createdAt: '',
  updatedAt: '',
}

// Derive a safe filename slug from the identity — used by the PDF download
export function fileSlug(identity: UserIdentity | null): string {
  const raw = (identity?.fullName ?? 'user').trim().toLowerCase()
  if (!raw) return 'user'
  return raw
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'user'
}

// Derive the user's age from DOB (or null if not set)
export function ageFromDOB(dob: string | undefined): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}
