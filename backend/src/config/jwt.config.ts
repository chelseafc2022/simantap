import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret:
    process.env.JWT_ACCESS_SECRET ||
    'simantap-jwt-access-secret-super-secure-key-2026',
  expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    'simantap-jwt-refresh-secret-super-secure-key-2026',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
