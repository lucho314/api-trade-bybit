export const calculateTPandSL = (price:number, side:string, takeProfit:number, stopLoss:number, leverage:number) =>{
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