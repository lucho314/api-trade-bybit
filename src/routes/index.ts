import express, { Router, Request, Response } from 'express';
import BybitService from '../services/bybitService';

import { DateTime } from 'luxon';
import pool from '../db/postgres';
import { BYBIT_API_KEY, BYBIT_API_SECRET, ORDER_QTY, WEBHOOK_SECRET } from '../constats';


const router = Router();



const apiKey = BYBIT_API_KEY
const apiSecret = BYBIT_API_SECRET
const bybitService = new BybitService(apiKey, apiSecret);


router.get('/market/:symbol', async (req: Request, res: Response) => {
    try {
        const data = await bybitService.getMarketData(req.params.symbol);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/order', async (req: Request, res: Response) => {
    const { symbol, side, orderType, qty, price, leverage, stopLoss, takeProfit } = req.body;
    try {
        const result = await bybitService.placeOrder(symbol, side, orderType, qty, price, leverage, stopLoss, takeProfit);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/account', async (req: Request, res: Response) => {
    try {
        const info = await bybitService.getAccountInfo();
        res.json(info);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/position/tpsl', async (req: Request, res: Response) => {
    const { symbol, stopLoss, takeProfit } = req.body;
    try {
        const result = await bybitService.updatePositionTP_SL(symbol, stopLoss, takeProfit);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/funding-balance', async (req: Request, res: Response) => {
    try {
        const balance = await bybitService.getFundingBalance();
        res.json(balance);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Webhook para recibir alertas de trading
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
    const { clave, tipo, symbol } = req.body;

    // Valida la clave secreta
    if (clave !== WEBHOOK_SECRET) {
        res.status(401).json({ error: 'Clave inválida' });
        return;
    }

    // Solo permite operar BTC
    if (symbol !== 'BTCUSDT') {
        res.status(400).json({ error: 'Solo se permite operar BTCUSDT' });
        return;
    }

    // Validación de horario y día (hora de México)
    const now = DateTime.now().setZone('America/Mexico_City');
    const day = now.weekday; // 1 = lunes, 7 = domingo
    const hour = now.hour;

    console.log(`Día: ${day}, Hora: ${hour}`); // Para depuración

    if (day > 5 || hour < 6 || hour >= 22) {
        res.status(403).json({ error: 'Fuera de horario permitido para operar (Lunes a Viernes de 6:00 a 22:00 hora de México)' });
        return;
    }

    // Determina el lado de la orden
    let side: 'Buy' | 'Sell';
    if (tipo === 'long') {
        side = 'Buy';
    } else if (tipo === 'short') {
        side = 'Sell';
    } else {
        res.status(400).json({ error: 'Tipo de orden no soportado' });
        return;
    }

    // Configuración de la estrategia
    const leverage = 40;
    const qty = ORDER_QTY;
    const takeProfit = 12; // 12%
    const stopLoss = 50;   // 50%

    try {
        // const result = await bybitService.placeOrder(
        //     symbol,
        //     side,
        //     'Market',
        //     qty,
        //     undefined, // price no es necesario para Market
        //     leverage,
        //     stopLoss,
        //     takeProfit
        // );

        // Registrar la orden en PostgreSQL
        await pool.query(
            `INSERT INTO orders (symbol, side, order_type, qty, leverage, stop_loss, take_profit)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [symbol, tipo === 'long' ? 'Buy' : 'Sell', 'Market', qty, leverage, stopLoss, takeProfit]
        );

        // Respuesta simulada
        const result = {
            symbol,
            side,
            orderType: 'Market',
            qty,
            leverage,
            stopLoss,
            takeProfit,
            status: 'Order placed successfully (mocked response)'
        };

        res.json({ status: 'ok', result });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;