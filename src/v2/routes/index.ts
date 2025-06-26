import  { Router, Request, Response } from 'express';
import { ORDER_QTY, WEBHOOK_SECRET } from '../../constats';
import BybitServiceV2 from '../bybitService';
import { actualizarGananciaPerdida, insertarOperacion } from '../../respository/orderRepository';
import { calculateTPandSL } from '../utils/calculate-TP-and-SL';
import PriceTrackerService from '../PriceTrackerService';


const router = Router();
const bybitService = new BybitServiceV2();
const tracker = new PriceTrackerService('BTCUSDT');

//variable globar orderId para almacenar el ID de la orden
let orderId: string | null = null;

router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
    const { clave, symbol,order } = req.body;


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
        
         const { high, low } = await tracker.stopTracking();

        setTimeout(async () => {
            const PNL = await bybitService.getClosedPnL(symbol);
           
            if(orderId !== null && PNL) {
               actualizarGananciaPerdida(PNL,orderId, high, low);
           }

        }, 3000 ); 

        res.json({ status: 'ok', message: `Se cancelo la orden ` });
        return;
    }
    
    tracker.startTracking();

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

    const qty = ORDER_QTY;
    const takeProfit = 12; // 12%
    const stopLoss = 50;   // 50%
    const leverage = 40;

    
     const marketData = await bybitService.getMarketData(symbol);
    const price = Number(marketData.result.list?.[0]?.lastPrice);
        if (!price || isNaN(price)) {
            console.error('No se pudo obtener el precio de mercado');
            return;
        }
        
    const { takeProfitPrice, stopLossPrice } = calculateTPandSL(price, side, takeProfit, stopLoss, leverage);


     orderId = await bybitService.placeOrder(
        symbol,
        side,
        'Limit',
        qty,
        price,
        leverage,
        stopLossPrice,
        takeProfitPrice
    );

    if (!orderId) {
        res.status(500).json({ error: 'Error al colocar la orden' });
        return;
    }
    insertarOperacion({
        orderId,
        symbol,
        quien: 'bot',
        leverage: leverage.toString(),
        tipo: side === 'Buy' ? 'Long' : 'Short',
        margen: null, // Si no se calcula el margen
        entrada: price,
        tp: takeProfitPrice,
        sl: stopLossPrice,
        version: 'V1'
    });

    res.json({ status: 'ok', message: `La orden ejecutada` });
});


//acountInfo
router.get('/accountInfo', async (req: Request, res: Response): Promise<void> => {
    try {
        const accountInfo = await bybitService.getAccountInfo();
        res.json(accountInfo);
    }
    catch (error) {
        console.error('Error al obtener la información de la cuenta:', error);
        res.status(500).json({ error: 'Error al obtener la información de la cuenta' });
    }
}
);


//startTracking()
router.get('/startTracking', async (req: Request, res: Response): Promise<void> => {
    try {
        await tracker.startTracking();
        res.json({ status: 'ok', message: 'Empezó a trackear precios de BTCUSDT' });
    } catch (error) {
        console.error('Error al iniciar el tracking:', error);
        res.status(500).json({ error: 'Error al iniciar el tracking' });
    }
});

//stopTracking()
router.get('/stopTracking', async (req: Request, res: Response): Promise<void> => {
    try {
        const { high, low } = await tracker.stopTracking();
        res.json({ status: 'ok', message: 'Finalizó el tracking de precios', high, low });
    } catch (error) {
        console.error('Error al detener el tracking:', error);
        res.status(500).json({ error: 'Error al detener el tracking' });
    }
});

export default router;0