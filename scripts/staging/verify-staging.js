const { createClient } = require('@supabase/supabase-js');

const stagingUrl = 'https://fhsnotxclmkwayetffav.supabase.co';
const stagingServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoc25vdHhjbG1rd2F5ZXRmZmF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDgzMDIzNSwiZXhwIjoyMDk2NDA2MjM1fQ.5-dd_hrkW4ftB5cgH_apje1aDw3-55GLHZcf_0YCuEI';

const client = createClient(stagingUrl, stagingServiceKey, {
  auth: { persistSession: false }
});

const expectedCounts = {
  users: 208,
  posts: 116,
  companies: 132,
  messages: 23,
  vouches: 28,
  job_views: 133,
  manual_verification_requests: 33,
  waitlist: 10,
  comments: 7,
  jobs: 15,
  job_applications: 4,
  otp_ip_rate_limits: 98,
  feedback: 6,
  reports: 2,
  user_public_keys: 7,
  recruiters: 1,
  advertisers: 1
};

async function verify() {
  console.log('--- Staging Verification Started ---');
  let pass = true;

  // 1. Verify Connectivity
  try {
    const { data, error } = await client.from('users').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✓ Successfully connected to staging database.');
  } catch (err) {
    console.error('✗ Failed to connect to staging database:', err.message);
    pass = false;
  }

  // 2. Verify Row Counts
  console.log('\nVerifying Table Row Counts:');
  for (const [table, expected] of Object.entries(expectedCounts)) {
    try {
      const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
      if (error) throw error;
      
      if (count === expected) {
        console.log(`  ✓ ${table}: ${count} rows (Matches expected)`);
      } else {
        console.warn(`  ⚠ ${table}: ${count} rows (Expected: ${expected})`);
        pass = false;
      }
    } catch (err) {
      console.error(`  ✗ Failed to query table ${table}:`, err.message);
      pass = false;
    }
  }

  // 3. Verify Storage Buckets
  console.log('\nVerifying Storage Buckets:');
  const expectedBuckets = ['post-images', 'verification-docs', 'blog-images', 'AvatarsInChatMaleAndFemale', 'avatars', 'resumes'];
  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    if (error) throw error;

    for (const expectedBucket of expectedBuckets) {
      const found = buckets.find(b => b.name === expectedBucket);
      if (found) {
        console.log(`  ✓ Bucket "${expectedBucket}" is present (Public: ${found.public})`);
      } else {
        console.error(`  ✗ Bucket "${expectedBucket}" is missing!`);
        pass = false;
      }
    }
  } catch (err) {
    console.error('✗ Failed to verify storage buckets:', err.message);
    pass = false;
  }

  console.log('\n-------------------------------------');
  if (pass) {
    console.log('🎉 ALL VERIFICATION CHECKS PASSED!');
    console.log('Staging environment fhsnotxclmkwayetffav is fully replicated and configured.');
  } else {
    console.warn('⚠ SOME VERIFICATION CHECKS FAILED OR MISMATCHED.');
  }
}

verify();
