import { RestClientV5 } from 'bybit-api';
import { ClosedPnlData } from '../respository/orderRepository';
import { BYBIT_API_KEY, BYBIT_API_SECRET } from '../constats';
class BybitServiceV2 {
  private client: RestClientV5;

  constructor() {
    this.client = new RestClientV5({
      key: BYBIT_API_KEY,
      secret: BYBIT_API_SECRET,
      testnet: true, // Set to false for production
    });
  }


  async placeOrder(
    symbol: string,
    side: 'Buy' | 'Sell',
    orderType: 'Limit' | 'Market',
    qty: number,
    price?: number,
    leverage?: number,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<number | any> {
    try {
      if (leverage) {
        await this.client.setLeverage({
          category: 'linear',
          symbol,
          buyLeverage: leverage.toString(),
          sellLeverage: leverage.toString(),
        });
      }
      const response = await this.client.submitOrder({
        category: 'linear',
        symbol,
        side,
        orderType,
        qty: qty.toString(),
        ...(orderType === 'Limit' && price ? { price: price.toString() } : {}),
        timeInForce: 'GTC',
        ...(stopLoss ? { stopLoss: stopLoss.toString() } : {}),
        ...(takeProfit ? { takeProfit: takeProfit.toString() } : {}),
       // marketUnit: 'quoteCoin',
      });
      //return orderId
      if (!response || !response.result || !response.result.orderId) {
        throw new Error('Error al colocar la orden: respuesta inválida');
      }
      // orderId and Pri
      const { orderId } = response.result;

      return orderId;
    } catch (error: any) {
      throw new Error(`Error placing order: ${error.message}`);
    }
  }


  async getOpenPosition(symbol: string): Promise<any> {
    try {
      const response = await this.client.getPositionInfo({
        category: 'linear',
        symbol
      });
      // Busca la posición abierta (size > 0)
      const position = response.result?.list?.find((pos: any) => parseFloat(pos.size) !== 0);
      return position || null;
    } catch (error: any) {
      throw new Error(`Error consultando posición abierta: ${error.message}`);
    }
  }

  async closePosition(symbol: string): Promise<any> {
    try {
      const openPosition = await this.getOpenPosition(symbol);
      if (!openPosition) {
        throw new Error('No hay posición abierta para cerrar');
      }
      const side = openPosition.side === 'Buy' ? 'Sell' : 'Buy';
      const qty = Math.abs(Number(openPosition.size));
      if (!qty || qty === 0) {
        throw new Error('Cantidad inválida para cerrar la posición');
      }
      const response = await this.client.submitOrder({
        category: 'linear',
        symbol,
        side,
        orderType: 'Market',
        qty: qty.toString(),
        reduceOnly: true,
        timeInForce: 'GTC',
      });
      return response;
    } catch (error: any) {
     console.error(`Error cerrando posición: ${error.message}`);
    }
  }


  
  async getClosedPnL(symbol: string): Promise<ClosedPnlData | null> {
    try {
      const response = await this.client.getClosedPnL({
        category: 'linear',
        symbol,
        limit: 1, // Solo el último PnL cerrado
      });
      if (!response.result || !response.result.list || response.result.list.length === 0) {
        console.log('No se encontraron PnL cerrados recientes');
        return null;
      }
      return response.result.list[0] as ClosedPnlData;
    } catch (error: any) {
      throw new Error(`Error obteniendo Closed PnL: ${error.message}`);
    }
  }

   async getMarketData(symbol: string): Promise<any> {
    try {
      const response = await this.client.getTickers({ category: 'linear', symbol });
      return response;
    } catch (error: any) {
      throw new Error(`Error fetching market data: ${error.message}`);
    }
  }


}

export default BybitServiceV2;