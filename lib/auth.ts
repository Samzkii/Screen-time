import jwt from 'jsonwebtoken';
import { type AuthToken } from './types';

const SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function createToken(payload: AuthToken): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, SECRET) as AuthToken;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function getTokenFromCookie(cookieString: string | undefined): string | null {
  if (!cookieString) return null;
  
  const cookies = cookieString.split(';').map((c) => c.trim());
  const tokenCookie = cookies.find((c) => c.startsWith('auth='));
  
  if (!tokenCookie) return null;
  
  return tokenCookie.split('=')[1];
}
