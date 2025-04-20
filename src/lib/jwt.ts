import jwt from 'jsonwebtoken';

export function signRlsJwt(payload: Record<string, unknown>): string {
  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET!, {
    algorithm: 'HS256',
    expiresIn: '5m',
  });
} 