export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://ipscscore:ipscscore_dev@localhost:5432/ipscscore',
  PORT: parseInt(process.env.PORT || '3001', 10),
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;