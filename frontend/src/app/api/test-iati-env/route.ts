import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  const hasKey = !!process.env.IATI_API_KEY
  const hasPublicKey = !!process.env.NEXT_PUBLIC_IATI_API_KEY
  const keyLength = process.env.IATI_API_KEY?.length || 0
  const publicKeyLength = process.env.NEXT_PUBLIC_IATI_API_KEY?.length || 0
  
  // List all env vars that contain "IATI"
  const iatiEnvVars = Object.keys(process.env).filter(k => k.includes('IATI'))
  
  return NextResponse.json({
    hasIATI_API_KEY: hasKey,
    hasNEXT_PUBLIC_IATI_API_KEY: hasPublicKey,
    IATI_API_KEY_length: keyLength,
    NEXT_PUBLIC_IATI_API_KEY_length: publicKeyLength,
    allIatiEnvVars: iatiEnvVars,
    first4Chars: hasKey ? process.env.IATI_API_KEY?.substring(0, 4) : 'N/A',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  })
}

