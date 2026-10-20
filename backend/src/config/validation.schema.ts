import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  APP_PORT: Joi.number().default(4000),
  API_PREFIX: Joi.string().default('api/v1'),
  CLIENT_URL: Joi.string().default('http://localhost:3000'),

  DATABASE_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('', null).optional(),
  REDIS_DB: Joi.number().default(0),

  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().optional(),
  MAIL_USER: Joi.string().allow('', null).optional(),
  MAIL_PASSWORD: Joi.string().allow('', null).optional(),
  MAIL_FROM: Joi.string().optional(),

  EGOV_MYSQL_HOST: Joi.string().default('mysql.konaweselatankab.go.id'),
  EGOV_MYSQL_USER: Joi.string().allow('', null).optional(),
  EGOV_MYSQL_PASSWORD: Joi.string().allow('', null).optional(),
  EGOV_MYSQL_PORT: Joi.number().default(3306),
  EGOV_MYSQL_LIMIT: Joi.number().default(20),

  KONSEL_SETARA_MYSQL_DATABASE: Joi.string().default('konsel_setara'),
  KONSEL_SETARA_MYSQL_HOST: Joi.string().allow('', null).optional(),
  KONSEL_SETARA_MYSQL_USER: Joi.string().allow('', null).optional(),
  KONSEL_SETARA_MYSQL_PASSWORD: Joi.string().allow('', null).optional(),
  KONSEL_SETARA_MYSQL_PORT: Joi.number().allow('', null).optional(),
});
