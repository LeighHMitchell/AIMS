/**
 * Environment Variable Validation
 * Validates required environment variables at runtime
 */

const requiredClientVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
] as const;

const requiredServerVars = [
  'SUPABASE_SERVICE_ROLE_KEY'
] as const;

export function validateClientEnv() {
  const missing: string[] = [];
  
  for (const envVar of requiredClientVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required client environment variables: ${missing.join(', ')}`
    );
  }
}

export function validateServerEnv() {
  const missing: string[] = [];
  
  for (const envVar of requiredServerVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(', ')}`
    );
  }
}

export function validateAllEnv() {
  validateClientEnv();
  
  // Only validate server vars on server-side
  if (typeof window === 'undefined') {
    validateServerEnv();
  }
}

// Validate on module load
if (typeof window === 'undefined') {
  // Server-side validation
  validateAllEnv();
} else {
  // Client-side validation  
  validateClientEnv();
}