// index.js
const { WebsocketClient } = require('bybit-api');
const axios = require('axios');

// Parámetros de la estrategia
const RSI_LENGTH = 14;
const BB_LENGTH = 20;
const BB_MULT = 2.0;
const PROXIMITY_PERCENT = 1.0;
const TP_PERCENT = 0.3;
const SL_PERCENT = 1.2;
const SYMBOL = 'BTCUSDT';
const INTERVAL = '5'; // 5 minutos

// WhatsApp config
const WHATSAPP_URL = 'https://api.callmebot.com/whatsapp.php';
const PHONE = '5493434697053';
const APIKEY = '8494152';

// Utilidades para indicadores
function sma(values, length) {
  if (values.length < length) return null;
  const sum = values.slice(-length).reduce((a, b) => a + b, 0);
  return sum / length;
}

function stdev(values, length) {
  if (values.length < length) return null;
  const mean = sma(values, length);
  const variance = values.slice(-length).reduce((a, b) => a + Math.pow(b - mean, 2), 0) / length;
  return Math.sqrt(variance);
}

function rsi(values, length) {
  if (values.length < length + 1) return null;
  let gains = 0, losses = 0;
  for (let i = values.length - length; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (gains + losses === 0) return 50;
  const rs = gains / (losses || 1e-10);
  return 100 - (100 / (1 + rs));
}

async function sendWhatsapp(message) {
  try {
    await axios.get(WHATSAPP_URL, {
      params: {
        phone: PHONE,
        text: message,
        apikey: APIKEY
      }
    });
    console.log('Alerta enviada:', message);
  } catch (e) {
    console.error('Error enviando WhatsApp:', e.message);
  }
}

// Almacena los cierres de las velas
const closes = [];

const ws = new WebsocketClient({
  market: 'linear',
});

ws.subscribe(`kline.${INTERVAL}.${SYMBOL}`);

ws.on('update', (data) => {
  if (data.topic && data.topic.startsWith('kline')) {
    const k = data.data[0];
    if (k.confirmed) {
      const close = parseFloat(k.close);
      closes.push(close);
      if (closes.length > BB_LENGTH + RSI_LENGTH + 2) closes.shift();
      // Indicadores
      const rsiVal = rsi(closes, RSI_LENGTH);
      const basis = sma(closes, BB_LENGTH);
      const dev = stdev(closes, BB_LENGTH) * BB_MULT;
      const bbUpper = basis + dev;
      const bbLower = basis - dev;
      // Condiciones
      const near_bb_lower = close <= bbLower * (1 + PROXIMITY_PERCENT / 100);
      const near_bb_upper = close >= bbUpper * (1 - PROXIMITY_PERCENT / 100);
      const longCondition = near_bb_lower && rsiVal !== null && rsiVal < 28;
      const shortCondition = near_bb_upper && rsiVal !== null && rsiVal > 72;
      if (longCondition) {
        sendWhatsapp('📈 Señal de COMPRA detectada (BB + RSI)');
      }
      if (shortCondition) {
        sendWhatsapp('📉 Señal de VENTA detectada (BB + RSI)');
      }
      // Debug
      console.log({ close, rsiVal, bbUpper, bbLower, longCondition, shortCondition });
    }
  }
});

ws.on('open', () => console.log('WebSocket conectado a Bybit'));
ws.on('response', (msg) => { });
ws.on('error', (err) => console.error('WebSocket error:', err));
ws.on('close', () => console.log('WebSocket cerrado'));
