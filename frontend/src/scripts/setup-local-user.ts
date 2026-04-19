// Script to set up a test user for local development without Supabase

const testUser = {
  id: 'local-test-user',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'super_user',
  organisation: 'Test Organization',
  department: 'Development',
  job_title: 'Test Administrator',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};


// Store in a file that can be read by the API
import { writeFileSync } from 'fs';
import { join } from 'path';

try {
  const dataPath = join(process.cwd(), 'src', 'data', 'local-users.json');
  const users = [testUser];
  writeFileSync(dataPath, JSON.stringify(users, null, 2));
} catch (error) {
  console.error('❌ Failed to save test user data:', error);
}

export { testUser };
