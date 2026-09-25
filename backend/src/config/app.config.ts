import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.APP_PORT || '4000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production',
}));
