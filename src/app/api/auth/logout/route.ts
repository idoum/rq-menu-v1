import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/lib/auth';
import { securityHeaders } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    await logout();

    const response = NextResponse.json(
      { success: true },
      { status: 200, headers: securityHeaders }
    );

    // Clear session cookie
    response.cookies.delete('session');

    return response;
  } catch (error) {
    console.error('Logout error:', error);

    // Still clear cookie even on error
    const response = NextResponse.json(
      { success: true },
      { status: 200, headers: securityHeaders }
    );
    response.cookies.delete('session');

    return response;
  }
}
