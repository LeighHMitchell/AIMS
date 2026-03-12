import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;
    
    const { currentPassword, newPassword } = await request.json();
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Verify current password by attempting to sign in with the user's session client
    const { error: signInError } = await supabase!.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword
    });
    
    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }
    
    // Use admin client to update password (updateUser on the session client
    // may not have the required permissions depending on Supabase config)
    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user!.id,
      { password: newPassword }
    );
    
    if (updateError) {
      console.error('[Auth Change Password] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
    
  } catch (error) {
    console.error('[Auth Change Password] Error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
