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