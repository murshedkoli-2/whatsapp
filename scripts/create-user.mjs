import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local
const envFile = path.resolve(process.cwd(), '.env.local');
const env = {};
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local');
  process.exit(1);
}

const email = process.argv[2] || 'admin@example.com';
const password = process.argv[3] || 'password123';
const fullName = process.argv[4] || 'Admin';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Checking user: ${email}...`);
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }

  const existing = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    console.log(`User ${email} already exists (id: ${existing.id}). Updating password...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (updateError) {
      console.error('Failed to update user:', updateError.message);
      process.exit(1);
    }
    console.log(`\nSuccess! Password updated for ${email}`);
  } else {
    console.log(`Creating user ${email}...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError) {
      console.error('Failed to create user:', createError.message);
      process.exit(1);
    }
    console.log(`\nSuccess! Created user ${email} (id: ${createData.user.id})`);
  }

  console.log('Login credentials:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
