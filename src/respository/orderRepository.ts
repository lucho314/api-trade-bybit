import { dias } from "../constats";
import sql from "../db/postgresV2";

export interface ClosedPnlData {
  symbol: string;             // Ej: 'BTCUSDT'
  orderType: 'Market' | 'Limit';
  leverage: string;           // Ej: '40'
  updatedTime: string;        // Timestamp en milisegundos
  side: 'Buy' | 'Sell';
  orderId: string;
  closedPnl: string;          // Ganancia o pérdida neta (ya incluye fees)
  openFee: string;            // Fee al abrir
  closeFee: string;           // Fee al cerrar
  avgEntryPrice: string;      // Precio promedio de entrada
  qty: string;                // Cantidad operada (tamaño de posición)
  cumEntryValue: string;      // Valor total en USDT de la entrada (qty × avgEntryPrice)
  createdTime: string;        // Timestamp de creación de la orden
  orderPrice: string;         // Precio solicitado (ej: para TP/SL)
  closedSize: string;         // Tamaño cerrado (ej: 0.01)
  avgExitPrice: string;       // Precio promedio de salida
  execType: string;           // Ej: 'Trade'
  fillCount: string;          // Cantidad de ejecuciones
  cumExitValue: string;    
}

//interface Operacion

export interface Operacion {
  orderId: string;
  symbol: string;            // Ej: 'BTCUSDT'
  quien: string;             // 'bot' o nombre del trader
  leverage: string;     // Ej: '40'
  tipo: 'Long' | 'Short';     // Tipo de operación
  margen: number | null;     // Margen utilizado (si se calcula)
  entrada: number;           // Precio de entrada
  tp: number ;         // Precio de Take Profit (si se calcula)
  sl: number ;         // Precio de Stop Loss (si se calcula)
  version: string;          // Versión del esquema, por ejemplo 'V1'
}


export async function insertarOperacion(data: Operacion) {
  const fecha = new Date();
  const diaSemana = fecha.getDay();
  const diaSemanaTexto = dias[diaSemana];
  console.log("insertarOperacion", data);
  const horaActual = fecha.toTimeString().slice(0, 8);


  await sql`
    INSERT INTO operaciones (
    order_id,
    fecha,
    dia_semana,
    activo,
    quien,
    apalancamiento,
    tipo,
    margen,
    entrada,
    version,
    tp,
    sl,
    hora_open
  ) VALUES (
    ${data.orderId},
    ${fecha.toISOString().slice(0, 10)},
    ${diaSemanaTexto},
    ${data.symbol},
    'bot',
    ${data.leverage},
    ${data.tipo},
    ${data.margen},
    ${data.entrada},
    'V1',
    ${Number(data.tp.toFixed(2))},
    ${Number(data.sl.toFixed(2))},
    ${horaActual}
  )
  `;
}

//actualizar ganancia perdida y fees
export async function actualizarGananciaPerdida(data: ClosedPnlData,orderId: string) {

  const openFee = parseFloat(data.openFee) || 0;
  const closeFee = parseFloat(data.closeFee) || 0;
  const fees = openFee + closeFee;
  const hsmsss = new Date(parseInt(data.updatedTime)).toTimeString().slice(0, 8);

  await sql`
    UPDATE operaciones
    SET
     fee = ${fees},
     ganancia_bruta = ${parseFloat(data.closedPnl) + fees },
     ganancia_neta = ${parseFloat(data.closedPnl)},
     ganado =  ${parseFloat(data.closedPnl) > 0 ? true : false},
     hora_close = ${hsmsss}
    WHERE order_id = ${orderId}
  `;
  
}

//test insrt insertarOperacion

export async function testInsertarOperacion() {
  const data: Operacion = {
    orderId: "123456789",
    symbol: "BTCUSDT",
    quien: "bot",
    leverage: "40",
    tipo: "Long",
    margen: 100,
    entrada: 50000,
    tp: 55000,
    sl: 48000,
    version: "V1"
  };

  await insertarOperacion(data);
}

// Obtener trades y resumen por mes
export async function getTradesResumenPorMes(anio: number, mes: number) {
  // Formato YYYY-MM para filtrar
  const desde = `${anio}-${mes.toString().padStart(2, '0')}-01`;
  const hasta = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${(mes + 1).toString().padStart(2, '0')}-01`;
  const trades = await sql`
    SELECT * FROM operaciones WHERE fecha >= ${desde} AND fecha < ${hasta} and ganado is not null ORDER BY fecha ASC
  `;
  const tradesArr = Array.from(trades);
  const total = tradesArr.length;
  const ganados = tradesArr.filter((t: any) => t.ganado).length;
  const perdidos = tradesArr.filter((t: any) => t.ganado === false).length;
  const winrate = total ? (ganados / total) * 100 : 0;
  const lossrate = total ? (perdidos / total) * 100 : 0;
  const balance = tradesArr.reduce((sum: number, t: any) => sum + Number(t.ganancia_neta || 0), 0);

  console.log({
    total,
    ganados,
    perdidos,
    winrate,
    lossrate,
    balance
  })
  return {
    total,
    winrate: Number(winrate.toFixed(2)),
    lossrate: Number(lossrate.toFixed(2)),
    balance: Number(balance.toFixed(2)),
    trades
  };
}