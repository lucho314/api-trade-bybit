import { RestClientV5 } from 'bybit-api';

class BybitService {
  private client: RestClientV5;

  constructor(apiKey: string, apiSecret: string) {
    this.client = new RestClientV5({
      key: apiKey,
      secret: apiSecret,
     // testnet: true, // Set to false for production
    });
  }

  async getMarketData(symbol: string): Promise<any> {
    try {
      const response = await this.client.getTickers({ category: 'linear', symbol });
      return response;
    } catch (error: any) {
      throw new Error(`Error fetching market data: ${error.message}`);
    }
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
  ): Promise<any> {
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
      });
      return response;
    } catch (error: any) {
      throw new Error(`Error placing order: ${error.message}`);
    }
  }

  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.client.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' });
      return response;
    } catch (error: any) {
      throw new Error(`Error fetching account info: ${error.message}`);
    }
  }

  async setLeverage(symbol: string, leverage: number): Promise<any> {
    try {
      const response = await this.client.setLeverage({
        category: 'linear',
        symbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString(),
      });
      return response;
    } catch (error: any) {
      throw new Error(`Error setting leverage: ${error.message}`);
    }
  }

  async getFundingBalance() {
  try {
    const response = await this.client.getAssetInfo({ accountType: 'FUND'});
    console.log(JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('Error al obtener el balance de la Funding Account:', error);
  }
}

  async updatePositionTP_SL(symbol: string, stopLoss?: number, takeProfit?: number): Promise<any> {
  try {
    const response = await this.client.setTradingStop({
      category: 'linear',
      symbol,
      ...(stopLoss ? { stopLoss: stopLoss.toString() } : {}),
      ...(takeProfit ? { takeProfit: takeProfit.toString() } : {}),
      positionIdx: 0
    });
    return response;
  } catch (error: any) {
    throw new Error(`Error actualizando SL/TP: ${error.message}`);
  }
}

  //obtener datos de mi cuenta
  
}

export default BybitService;