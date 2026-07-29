export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://ipscscore:ipscscore_dev@localhost:5432/ipscscore',
  PORT: parseInt(process.env.PORT || '3001', 10),
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  NODE_ENV: process.env.NODE_ENV || 'development',
  BIND_ADDRESS: process.env.BIND_ADDRESS || '0.0.0.0',
  CORS_ORIGINS: process.env.CORS_ORIGINS || '*',
  PUBLIC_HIDE_EMAIL: process.env.PUBLIC_HIDE_EMAIL !== 'false',
} as const;
