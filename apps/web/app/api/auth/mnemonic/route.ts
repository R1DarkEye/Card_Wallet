import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { validateMnemonic } from '@cardvault/core';
import { v5 as uuidv5 } from 'uuid';

const VAULT_NAMESPACE = '3f1b0e9c-9e6b-4ad6-8e29-2fba8c9a9d81';
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const runtime = 'nodejs';

let _cachedSecret: Uint8Array | null = null;

function getSigningSecret(): Uint8Array {
  if (_cachedSecret) return _cachedSecret;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');

  _cachedSecret = new TextEncoder().encode(secret);
  return _cachedSecret;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mnemonic = typeof body?.mnemonic === 'string' ? body.mnemonic.trim().toLowerCase() : '';

    if (!mnemonic || !validateMnemonic(mnemonic)) {
      return NextResponse.json({ error: 'Invalid recovery phrase.' }, { status: 400 });
    }

    const signingKey = getSigningSecret();

    const hashHex = crypto.createHash('sha256').update(mnemonic).digest('hex');
    const userId = uuidv5(hashHex, VAULT_NAMESPACE);

    const now = Math.floor(Date.now() / 1000);
    const accessToken = await new SignJWT({
      role: 'authenticated'
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setAudience('authenticated')
      .setIssuer('supabase')
      .setIssuedAt(now - 60) // Backdate by 60 seconds to avoid "issued at future" clock skew errors
      .setExpirationTime(now + DEFAULT_TOKEN_TTL_SECONDS)
      .sign(signingKey);

    return NextResponse.json({
      accessToken,
      userId,
      expiresIn: DEFAULT_TOKEN_TTL_SECONDS
    });
  } catch (error) {
    console.error('Mnemonic auth failed:', error);
    return NextResponse.json({ error: 'Auth failed.' }, { status: 500 });
  }
}
