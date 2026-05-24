// Blended nominal return — weighted average of per-bucket return
// assumptions (b1-b4) by the user's bucket allocation. Several
// dashboards need this; isolating it here keeps them in sync if
// either ReturnAssumptions or BUCKET_ALLOCATION change.

import type { ReturnAssumptions } from '../types'
import { BUCKET_ALLOCATION } from '../constants'

export interface BucketAlloc { b1: number; b2: number; b3: number; b4: number }

export function blendedReturn(ra: ReturnAssumptions, alloc?: BucketAlloc): number {
  const a = alloc ?? BUCKET_ALLOCATION
  return ra.b1 * a.b1 + ra.b2 * a.b2 + ra.b3 * a.b3 + ra.b4 * a.b4
}
