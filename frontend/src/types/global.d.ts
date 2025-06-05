/// <reference types="node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      ALLOWED_ORIGINS?: string
      NEXT_PUBLIC_SUPABASE_URL?: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
      SUPABASE_SERVICE_ROLE_KEY?: string
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string
    }
  }
}

export {}