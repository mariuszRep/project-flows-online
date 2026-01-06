#!/usr/bin/env tsx
/**
 * Temporary script to generate an MCP connection token for testing
 * Run with: npx tsx scripts/generate-mcp-token.ts
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

async function generateToken() {
  console.log('🔑 Generating MCP Connection Token...\n');

  // Create a direct Supabase client for the script
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get first user
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1);

  if (!users || users.length === 0) {
    console.error('❌ No users found in database. Please create a user first.');
    process.exit(1);
  }

  const user = users[0];
  console.log(`👤 User: ${user.email}`);

  // Get first organization for this user
  const { data: permissions } = await supabase
    .from('permissions')
    .select('org_id')
    .eq('principal_id', user.id)
    .eq('principal_type', 'user')
    .is('deleted_at', null)
    .limit(1);

  if (!permissions || permissions.length === 0) {
    console.error('❌ No organizations found for user. Please create an organization first.');
    process.exit(1);
  }

  const organizationId = permissions[0].org_id;
  console.log(`🏢 Organization ID: ${organizationId}\n`);

  try {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('base64url');
    
    // Hash the token for storage
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Calculate expiry date (90 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Create connection token directly in database
    const { data: connection, error } = await supabase
      .from('mcp_connections')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        name: 'Test Connection',
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create connection: ${error.message}`);
    }

    console.log('✅ Connection token created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 CONNECTION TOKEN (save this, it won\'t be shown again):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📅 Expires: ${expiresAt.toLocaleDateString()}`);
    console.log(`🆔 Connection ID: ${connection.id}`);
    
    console.log('\n📋 To use this token with MCP Inspector or Claude Desktop:');
    console.log('1. Add to your MCP config file:');
    console.log(`
{
  "mcpServers": {
    "project-flows": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer ${token}"
      }
    }
  }
}
`);
    console.log('2. Restart your MCP client');
    console.log('3. The connection will work for 90 days\n');
  } catch (error) {
    console.error('❌ Failed to create connection:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
generateToken().catch(console.error);
