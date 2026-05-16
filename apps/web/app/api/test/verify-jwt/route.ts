import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'JWT_SECRET not configured' }, { status: 500 });
    }

    const signingKey = new TextEncoder().encode(secret);

    // Note: jwtVerify with ES256 needs the public key, but for a quick test
    // we can use the JWKS from Supabase. For now, we just decode and return.
    try {
      const verified = await jwtVerify(token, signingKey, {
        algorithms: ['HS256']
      });
      return NextResponse.json({
        success: true,
        payload: verified.payload
      });
    } catch (verifyError: any) {
      return NextResponse.json({
        success: false,
        error: verifyError.message,
        details: verifyError.toString()
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
