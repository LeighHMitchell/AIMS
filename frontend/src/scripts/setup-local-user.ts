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

console.log('Setting up local test user...');
console.log('================================');
console.log('User Details:');
console.log('- Email:', testUser.email);
console.log('- Name:', testUser.first_name, testUser.last_name);
console.log('- Role:', testUser.role);
console.log('- ID:', testUser.id);
console.log('================================');
console.log('');
console.log('To test email change:');
console.log('1. Make sure your dev server is running (npm run dev)');
console.log('2. Visit http://localhost:3003 (or the port shown in your terminal)');
console.log('3. Log in with the test user credentials');
console.log('4. Go to My Profile and click Edit Profile');
console.log('5. Click "Change Email" to test the email change feature');
console.log('');
console.log('Note: This is for local testing only. In production, you would use proper authentication.');

// Store in a file that can be read by the API
import { writeFileSync } from 'fs';
import { join } from 'path';

try {
  const dataPath = join(process.cwd(), 'src', 'data', 'local-users.json');
  const users = [testUser];
  writeFileSync(dataPath, JSON.stringify(users, null, 2));
  console.log('✅ Test user data saved to:', dataPath);
} catch (error) {
  console.error('❌ Failed to save test user data:', error);
}

export { testUser };
