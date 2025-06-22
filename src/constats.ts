import dotenv from 'dotenv';
dotenv.config();

export const BYBIT_API_KEY = process.env.BYBIT_API_KEY_TEST || 'TU_API_KEY';
export const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET_TEST || 'TU_API_SECRET';
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TU_WEBHOOK_SECRET';
export const DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/mydatabase';
export const ORDER_QTY = parseFloat(process.env.ORDER_QTY || '0.1'); // Cantidad por defecto para órdenes
export const DELAY_MS = parseInt(process.env.DELAY_MS || '1000'); // Retardo entre órdenes en milisegundos
export const PORT = parseInt(process.env.PORT || '3000'); // Puerto del servidor

 export const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];