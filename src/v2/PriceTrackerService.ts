import { WebsocketClient } from 'bybit-api';

class PriceTrackerService {
  private ws: WebsocketClient;
  private isTracking = false;
  private highPrice: number | null = null;
  private lowPrice: number | null = null;
  private resolveEndTracking: ((data: { high: number, low: number }) => void) | null = null;

  constructor(private symbol: string) {
    this.ws = new WebsocketClient({ market: 'v5',testnet: true });

    this.ws.on('update', this.handleMessage.bind(this));
    this.ws.on('open', () => console.log(`WS abierto para ${this.symbol}`));
    this.ws.on('close', () => console.log(`WS cerrado para ${this.symbol}`));
    this.ws.on('error' as any, (err: Error) => console.error('WS Error:', err));
  }

  private handleMessage(msg: any) {
    if (!this.isTracking) return;
    if (msg.data ) {
      const {close} = msg.data[0] || {};
      
      const price = close ;

      if (isNaN(price)) return;

      if (this.highPrice === null || price > this.highPrice) {
        this.highPrice = price;
      }

      if (this.lowPrice === null || price < this.lowPrice) {
        this.lowPrice = price;
      }
    }
  }

  async startTracking(): Promise<void> {
    this.highPrice = null;
    this.lowPrice = null;
    this.isTracking = true;

    this.ws.subscribe([{ topic: `kline.1.${this.symbol}`, category: 'linear' }]);
  }

  stopTracking(): Promise<{ high: number, low: number }> {
    return new Promise((resolve) => {
      this.isTracking = false;
      this.ws.unsubscribe([{ topic: `kline.1.${this.symbol}`, category: 'linear' }]);
      this.ws.closeAll();

      resolve({
        high: this.highPrice ?? 0,
        low: this.lowPrice ?? 0
      });
    });
  }
}

export default PriceTrackerService;
