/**
 * GetNear V1 — Supabase Storage Bucket Setup Script
 *
 * Programmatically creates the three storage buckets required by the platform.
 * This script is a convenience helper for manual or CI setup. The SQL migration
 * (005_storage_buckets.sql) is the primary deliverable and should be preferred
 * for automated deployments via `supabase db push` or `supabase migration up`.
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx ts-node supabase/storage-setup.ts
 *
 * Requirements: 7.7, 15.6
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌  Missing environment variable: SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabase admin client (service role bypasses RLS)
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ---------------------------------------------------------------------------
// Bucket definitions
// ---------------------------------------------------------------------------

interface BucketConfig {
  id: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

const BUCKETS: BucketConfig[] = [
  {
    id: 'business-photos',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB — Req 7.7
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  {
    id: 'review-photos',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB — Req 15.6
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  {
    id: 'avatars',
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2 MB — Req 6.9
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
];

// ---------------------------------------------------------------------------
// Bucket creation helper
// ---------------------------------------------------------------------------

async function ensureBucket(config: BucketConfig): Promise<void> {
  const { data: existing, error: getError } = await supabase.storage.getBucket(config.id);

  if (getError && getError.message !== 'The resource was not found') {
    throw new Error(`Failed to check bucket "${config.id}": ${getError.message}`);
  }

  if (existing) {
    console.log(`✅  Bucket already exists: ${config.id}`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(config.id, {
    public: config.public,
    fileSizeLimit: config.fileSizeLimit,
    allowedMimeTypes: config.allowedMimeTypes,
  });

  if (createError) {
    throw new Error(`Failed to create bucket "${config.id}": ${createError.message}`);
  }

  console.log(`🪣  Created bucket: ${config.id}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('GetNear V1 — Storage bucket setup\n');
  console.log(`Supabase URL: ${SUPABASE_URL}\n`);

  let hasError = false;

  for (const bucket of BUCKETS) {
    try {
      await ensureBucket(bucket);
    } catch (err) {
      console.error(`❌  ${(err as Error).message}`);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('\nSetup completed with errors.');
    process.exit(1);
  }

  console.log('\nAll buckets are ready.');
}

main();
