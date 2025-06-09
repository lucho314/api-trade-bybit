import dotenv from 'dotenv';
dotenv.config();

export const BYBIT_API_KEY = process.env.BYBIT_API_KEY || 'TU_API_KEY';
export const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET || 'TU_API_SECRET';
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TU_WEBHOOK_SECRET';
export const DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/mydatabase';
export const ORDER_QTY = parseFloat(process.env.ORDER_QTY || '0.1'); // Cantidad por defecto para órdenes

