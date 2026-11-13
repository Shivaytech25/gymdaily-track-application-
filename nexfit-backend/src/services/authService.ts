import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be configured with at least 32 characters.'
    );
  }

  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function createAccessToken(userId: string): string {
  const secret = getJwtSecret();

  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    subject: userId,
    issuer: 'nexfit-api',
    audience: 'nexfit-app',
  };

  return jwt.sign({ type: 'access' }, secret, options);
}

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret(), {
    issuer: 'nexfit-api',
    audience: 'nexfit-app',
    algorithms: ['HS256'],
  });

  if (
    typeof decoded === 'string' ||
    decoded.type !== 'access' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.iat !== 'number' ||
    typeof decoded.exp !== 'number'
  ) {
    throw new Error('Invalid access token payload.');
  }

  return decoded as AccessTokenPayload;
}
