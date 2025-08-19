// Local database implementation for when Supabase is not configured
// This uses in-memory storage for development/testing purposes

interface User {
  id: string;
  email: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  role: string;
  organisation?: string;
  department?: string;
  job_title?: string;
  telephone?: string;
  website?: string;
  mailing_address?: string;
  bio?: string;
  preferred_language?: string;
  timezone?: string;
  avatar_url?: string;
  title?: string;
  contact_type?: string;
  secondary_email?: string;
  secondary_phone?: string;
  fax_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  reporting_org_id?: string;
  organization_id?: string;
}

// In-memory storage that works on both client and server
let users: Map<string, User> = new Map();
let initialized = false;

// Initialize with test data
export function initializeLocalDb() {
  if (initialized) return;
  
  // Add multiple test users
  const testUsers: User[] = [
    {
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
    },
    {
      id: 'test-user-2',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'super_user',
      organisation: 'Test Organization',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];
  
  testUsers.forEach(user => {
    users.set(user.id, user);
  });
  
  initialized = true;
  console.log('[LocalDB] Initialized with', users.size, 'test users');
  
  // Store in localStorage for client-side persistence
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('aims_local_users', JSON.stringify(Array.from(users.entries())));
    } catch (e) {
      console.error('Could not save to localStorage:', e);
    }
  }
}

// Load from localStorage if available (client-side only)
export function loadFromLocalStorage() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('aims_local_users');
      if (stored) {
        const storedUsers = new Map(JSON.parse(stored));
        // Merge with existing users
        storedUsers.forEach((user, id) => {
          users.set(id as string, user as User);
        });
        console.log('[LocalDB] Loaded', storedUsers.size, 'users from localStorage');
      }
    } catch (e) {
      console.error('Could not load from localStorage:', e);
    }
  }
}

// Ensure database is initialized
export function ensureInitialized() {
  if (!initialized) {
    if (typeof window !== 'undefined') {
      loadFromLocalStorage();
    }
    if (users.size === 0 || !initialized) {
      initializeLocalDb();
    }
  }
}

// Database-like interface
export const localDb = {
  from: (table: string) => {
    if (table !== 'users') {
      throw new Error(`Table ${table} not implemented in local database`);
    }
    
    return {
      select: (fields?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            ensureInitialized();
            console.log(`[LocalDB] Selecting ${fields || '*'} from users where ${column} = ${value}`);
            
            if (column === 'id') {
              const user = users.get(value);
              if (!user) {
                console.log('[LocalDB] User not found by ID:', value);
                return { data: null, error: { message: 'User not found' } };
              }
              console.log('[LocalDB] Found user by ID:', user.first_name, user.last_name);
              return { data: user, error: null };
            }
            
            if (column === 'email') {
              const user = Array.from(users.values()).find(u => u.email === value);
              if (!user) {
                console.log('[LocalDB] User not found by email:', value);
                return { data: null, error: { message: 'User not found' } };
              }
              console.log('[LocalDB] Found user by email:', user.first_name, user.last_name);
              return { data: user, error: null };
            }
            
            return { data: null, error: { message: 'Unsupported query' } };
          },
          maybeSingle: async () => {
            const result = await localDb.from(table).select(fields).eq(column, value).single();
            if (result.error && result.error.message === 'User not found') {
              return { data: null, error: null };
            }
            return result;
          }
        })
      }),
      
      update: (data: Partial<User>) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: async () => {
              ensureInitialized();
              console.log(`[LocalDB] Updating user where ${column} = ${value} with:`, data);
              
              if (column === 'id') {
                const user = users.get(value);
                if (!user) {
                  console.log('[LocalDB] User not found for update:', value);
                  return { data: null, error: { message: 'User not found' } };
                }
                
                const updatedUser = {
                  ...user,
                  ...data,
                  updated_at: new Date().toISOString()
                };
                
                users.set(value, updatedUser);
                console.log('[LocalDB] User updated successfully:', updatedUser.first_name, updatedUser.last_name, 'new email:', updatedUser.email);
                
                // Save to localStorage if on client-side
                if (typeof window !== 'undefined') {
                  try {
                    localStorage.setItem('aims_local_users', JSON.stringify(Array.from(users.entries())));
                  } catch (e) {
                    console.error('Could not save to localStorage:', e);
                  }
                }
                
                return { data: updatedUser, error: null };
              }
              
              return { data: null, error: { message: 'Unsupported update query' } };
            }
          })
        })
      })
    };
  }
};

// Auto-initialize for both client and server
ensureInitialized();
