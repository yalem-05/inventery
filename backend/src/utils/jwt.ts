import jwt, { SignOptions } from 'jsonwebtoken';
import { ENV } from '../config/env';
import { UserPayload } from '../types';

export const signToken = (payload: UserPayload): string => {
  const options: SignOptions = {
    expiresIn: (ENV.JWT.EXPIRES_IN || '7d') as any,
  };
  return jwt.sign(payload, ENV.JWT.SECRET, options);
};

export const verifyToken = (token: string): UserPayload => {
  return jwt.verify(token, ENV.JWT.SECRET) as UserPayload;
};

