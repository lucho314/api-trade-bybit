import express, { Router, Request, Response } from 'express';
import BybitService from '../services/bybitService';

import pool from '../db/postgres';
import { BYBIT_API_KEY, BYBIT_API_SECRET, DELAY_MS, ORDER_QTY, PORT, WEBHOOK_SECRET } from '../constats';


const router = Router();



const apiKey = BYBIT_API_KEY
const apiSecret = BYBIT_API_SECRET
const bybitService = new BybitService(apiKey, apiSecret);

console.log({ apiKey, apiSecret });

router.get('/market/:symbol', async (req: Request, res: Response) => {
    try {
        const data = await bybitService.getMarketData(req.params.symbol);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/order', async (req: Request, res: Response) => {
    const { symbol, side, orderType, qty, price, leverage, stopLoss, takeProfit,order } = req.body;
    //si la order contiene en el string TP no hacer nada
   
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
        // Debug extendido para ver respuesta completa de la API
        console.error("Bybit error response:", error?.response?.data || error);

        res.status(500).json({
            error: error.message,
            detail: error?.response?.data || null
        });
    }
})

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

router.get('/position/:symbol', async (req: Request, res: Response) => {
    try {
        const position = await bybitService.getOpenPosition(req.params.symbol);
        if (position) {
            res.json({ open: true, position });
        } else {
            res.json({ open: false, position: null });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});



async function abrirOrdenConLogica({ symbol, side, qty, leverage, stopLoss, takeProfit }: any) {
    try {
        const marketData = await bybitService.getMarketData(symbol);
        const price = Number(marketData.result.list?.[0]?.lastPrice);
        if (!price || isNaN(price)) {
            console.error('No se pudo obtener el precio de mercado');
            return;
        }
        
        const { takeProfitPrice, stopLossPrice } = calculateTPandSL(price, side, takeProfit, stopLoss, leverage);


        const result = await bybitService.placeOrder(
            symbol,
            side,
            'Market',
            qty,
            undefined,
            leverage,
            stopLossPrice,
            takeProfitPrice
        );
        await pool.query(
            `INSERT INTO orders (symbol, side, order_type, qty, leverage, stop_loss, take_profit)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [symbol, side, 'Market', qty, leverage, stopLoss, takeProfit]
        );
        // const message = `Nueva orden: ${side} ${qty} ${symbol} a precio de mercado. TP: ${takeProfit}%, SL: ${stopLoss}%`;
        // const whatsappUrl = `https://api.callmebot.com/whatsapp.php?phone=5493434697053&text=${encodeURIComponent(message)}&apikey=8494152`;
        // await fetch(whatsappUrl);
        console.log(`Orden registrada: ${JSON.stringify(result)}`);
    } catch (error: any) {
        console.error('Error al abrir orden con delay:', error.message);
    }
}

// Webhook para recibir alertas de trading
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
    const { clave, tipo, symbol,order } = req.body;

    // console.log(`Webhook recibido: ${JSON.stringify(req.body)}`);
    // await fetch(`https://api.callmebot.com/whatsapp.php?phone=5493434697053&text=${encodeURIComponent(JSON.stringify(req.body))}&apikey=8494152`);

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

     if (order && order.includes('TP')) {
       await bybitService.closePosition(symbol);
        return;
    }
    
    // // Validación de horario y día (hora de México)
    // const now = DateTime.now().setZone('America/Mexico_City');
    // const day = now.weekday; // 1 = lunes, 7 = domingo
    // const hour = now.hour;

    // console.log(`Día: ${day}, Hora: ${hour}`); // Para depuración

    // if (day > 5 || hour < 6 || hour >= 22) {
    //     res.status(403).json({ error: 'Fuera de horario permitido para operar (Lunes a Viernes de 6:00 a 22:00 hora de México)' });
    //     return;
    // }

    // Determina el lado de la orden
    let side: 'Buy' | 'Sell';
    if (req.body.tipo && typeof req.body.tipo === 'string') {
        if (req.body.tipo.toLowerCase() === 'buy') {
            side = 'Buy';
        } else if (req.body.tipo.toLowerCase() === 'sell') {
            side = 'Sell';
        } else {
            res.status(400).json({ error: 'Tipo de orden no soportado' });
            return;
        }
    } else {
        res.status(400).json({ error: 'Falta el campo side' });
        return;
    }

    // Antes de abrir una nueva posición, verificar si ya existe una posición abierta
    const openPosition = await bybitService.getOpenPosition(symbol);
    if (openPosition) {
        res.status(400).json({ error: 'Ya existe una posición abierta para este símbolo' });
        return;
    }

    // Configuración de la estrategia
    const qty = ORDER_QTY;
    const takeProfit = 12; // 12%
    const stopLoss = 50;   // 50%
    const leverage = 40;

    // Ejecutar la apertura de orden con delay
   // setTimeout(() => {
       await abrirOrdenConLogica({ symbol, side, qty, leverage, stopLoss, takeProfit });
    //}, DELAY_MS);

    res.json({ status: 'ok', message: `La orden ejecutada` });
});

//mostrar variables de entorno
router.get('/env', (req: Request, res: Response) => {
    res.json({
        BYBIT_API_KEY,
        ORDER_QTY,
        DELAY_MS,
        PORT
    });
}
);

// Endpoint para obtener trades de un mes y resumen
router.get('/trades', async (req: Request, res: Response): Promise<void> => {
    try {
        const anio = parseInt(req.query.anio as string);
        const mes = parseInt(req.query.mes as string);
        if (!anio || !mes) {
            res.status(400).json({ error: 'Parámetros anio y mes requeridos' });
            return;
        }
        const resumen = await require('../respository/orderRepository').getTradesResumenPorMes(anio, mes);
        res.json(resumen);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


function calculateTPandSL(price:number, side:string, takeProfit:number, stopLoss:number, leverage:number) {
    if (side === 'Buy') {
        return {
            takeProfitPrice: price * (1 + (takeProfit / 100) / leverage),
            stopLossPrice:   price * (1 - (stopLoss / 100) / leverage),
        };
    } else {
        return {
            takeProfitPrice: price * (1 - (takeProfit / 100) / leverage),
            stopLossPrice:   price * (1 + (stopLoss / 100) / leverage),
        };
    }
}

export default router;