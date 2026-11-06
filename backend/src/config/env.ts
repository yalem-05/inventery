import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '5432', 10),
    USER: process.env.DB_USER || 'postgres',
    PASSWORD: process.env.DB_PASSWORD || '1234',
    NAME: process.env.DB_NAME || 'inventory_db',
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_for_inventory_system_production_change_me',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  },
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

