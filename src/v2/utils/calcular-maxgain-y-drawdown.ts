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
export function calcularMaxGainYDrawdown(op: Operacion): ResultadosOperacion {
  // 1. Convertir leverage a número
  const lev = parseFloat(op.leverage);
  if (isNaN(lev) || lev <= 0) {
    throw new Error('Leverage inválido');
  }

  // 2. Calcular cambios brutos (fracción) según side
  let rawGain, rawDD;
  if (op.side === 'Buy') {
    rawGain = (op.high - op.entrada) / op.entrada;
    rawDD   = (op.low   - op.entrada) / op.entrada;  // negativo
  } else { // 'Sell'
    rawGain = (op.entrada - op.low)   / op.entrada;
    rawDD   = (op.entrada - op.high)  / op.entrada;  // negativo
  }

  // 3. Aplicar apalancamiento
  const leveragedGain = rawGain * lev;   // fracción
  const leveragedDD   = rawDD   * lev;   // fracción

  // 4. Pasar a porcentaje
  const grossGainPct = leveragedGain * 100;  // ej. 1.23 = 1.23%
  const grossDDPct   = leveragedDD   * 100;  // ej. -0.56 = -0.56%

  // 5. Restar comisiones (fees viene en %, p.ej. 0.07)
  const netGainPct = grossGainPct - op.fees;
  const netDDPct   = grossDDPct   - op.fees;

  return {
    max_gain: parseFloat(netGainPct.toFixed(2)),
    max_dd:   parseFloat(netDDPct.toFixed(2))
  };
}