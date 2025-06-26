interface Operacion {
  leverage: string; // como string, lo convertimos
  entrada: number;
  side: 'Buy' | 'Sell';
  fees: number; // porcentaje total, por ejemplo 0.07 para 0.07%
   high: number;
  low: number;
   costo: number;  // monto invertido en USDT
}

interface ResultadosOperacion {
  max_gain: number; // en porcentaje
  max_dd: number;   // en porcentaje
}

/**
 * Calcula el % máximo de ganancia y drawdown (pérdida) considerando apalancamiento y fees
 */
export function calcularMaxGainYDrawdown(operacion: Operacion): ResultadosOperacion {
  const { entrada, leverage, side, fees, high, low, costo } = operacion;

  const lev = parseFloat(leverage);
  if (isNaN(lev) || lev <= 0) throw new Error('Apalancamiento inválido');
  if (!costo || costo <= 0) throw new Error('Costo inválido');

  // Cantidad de contratos: costo = (entrada * qty) / leverage => qty = (costo * leverage) / entrada
  const qty = (costo * lev) / entrada;

  // Ganancia/pérdida bruta en USDT
  const gananciaMaximaUSDT = side === 'Buy'
    ? (high - entrada) * qty
    : (entrada - low) * qty;

  const perdidaMaximaUSDT = side === 'Buy'
    ? (entrada - low) * qty
    : (high - entrada) * qty;

  // Aplicar fees al costo: fees en porcentaje (%), no decimal
  const feeTotalUSDT = (costo * fees) / 100;

  // Porcentaje neto sobre el costo real
  const max_gain = ((gananciaMaximaUSDT - feeTotalUSDT) / costo) * 100;
  const max_dd = ((perdidaMaximaUSDT - feeTotalUSDT) / costo) * 100;

  return {
    max_gain: parseFloat(max_gain.toFixed(2)),
    max_dd: parseFloat(max_dd.toFixed(2)),
  };
}