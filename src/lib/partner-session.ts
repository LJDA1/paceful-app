/**
 * Partner Session Management
 *
 * JWT-based session management for magic link authentication.
 * Sessions are stored in cookies and last 7 days.
 */

import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'dev-secret-change-in-production';
const SESSION_COOKIE_NAME = 'paceful_partner_session';
const SESSION_DURATION_DAYS = 7;

export interface PartnerSession {
  partnerId: string;
  email: string;
  companyName: string;
  exp: number;
}

/**
 * Base64url encode (JWT-safe)
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64url decode (JWT-safe)
 */
function base64UrlDecode(str: string): string {
  // Add padding back
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad) {
    str += '='.repeat(4 - pad);
  }
  return Buffer.from(str, 'base64').toString('utf-8');
}

/**
 * Simple HMAC-SHA256 signature using Web Crypto API
 */
async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = new Uint8Array(signature);

  // Convert to base64url
  let binary = '';
  for (let i = 0; i < signatureArray.length; i++) {
    binary += String.fromCharCode(signatureArray[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create a JWT token for the partner session
 */
async function createJWT(payload: Omit<PartnerSession, 'exp'>): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: PartnerSession = {
    ...payload,
    exp: now + (SESSION_DURATION_DAYS * 24 * 60 * 60), // 7 days
  };

  const headerBase64 = base64UrlEncode(JSON.stringify(header));
  const payloadBase64 = base64UrlEncode(JSON.stringify(fullPayload));
  const message = `${headerBase64}.${payloadBase64}`;

  const signature = await hmacSign(message, JWT_SECRET);

  return `${message}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
async function verifyJWT(token: string): Promise<PartnerSession | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerBase64, payloadBase64, signature] = parts;
    const message = `${headerBase64}.${payloadBase64}`;

    // Verify signature
    const expectedSignature = await hmacSign(message, JWT_SECRET);
    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload: PartnerSession = JSON.parse(base64UrlDecode(payloadBase64));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Create a partner session and return the JWT token
 */
export async function createPartnerSession(partner: {
  partnerId: string;
  email: string;
  companyName: string;
}): Promise<string> {
  return createJWT({
    partnerId: partner.partnerId,
    email: partner.email,
    companyName: partner.companyName,
  });
}

/**
 * Get the partner session from a request
 * Returns null if no valid session exists
 */
export async function getPartnerSession(request: NextRequest): Promise<PartnerSession | null> {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) {
    return null;
  }

  return verifyJWT(cookie.value);
}

/**
 * Set the session cookie on a response
 */
export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  const maxAge = SESSION_DURATION_DAYS * 24 * 60 * 60; // in seconds

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  return response;
}

/**
 * Clear the session cookie (logout)
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Cookie name export for client-side use
 */
export const PARTNER_SESSION_COOKIE = SESSION_COOKIE_NAME;
