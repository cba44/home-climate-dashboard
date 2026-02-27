'use strict';

const http = require('http');
const next = require('next');
const WebSocket = require('ws');
const mqtt = require('mqtt');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const mqttHost = process.env.MQTT_HOST || 'localhost';
const mqttPort = parseInt(process.env.MQTT_PORT || '1883', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory cache of the latest reading per room.
// Key: room name (friendly_name from MQTT topic, e.g. "living-room")
// Value: SensorReading + lastUpdated
const sensorCache = new Map();

// Set of connected WebSocket clients
const clients = new Set();

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

app.prepare().then(() => {
  // 1. Create the HTTP server (not listening yet)
  const httpServer = http.createServer((req, res) => {
    handle(req, res);
  });

  // 2. Create WebSocket server in noServer mode, then manually route upgrades.
  //    This prevents the wss from intercepting Next.js HMR WebSocket connections
  //    (/_next/webpack-hmr) which would break hot reload in development.
  const wss = new WebSocket.Server({ noServer: true });

  // Only handle upgrades to /ws — our dedicated sensor WebSocket path.
  // All other upgrades (/_next/webpack-hmr, etc.) are left entirely for Next.js.
  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    clients.add(ws);

    // Send a full snapshot of current state immediately so the browser
    // doesn't show blank cards until the next MQTT message arrives.
    const snapshot = {};
    for (const [room, data] of sensorCache) {
      snapshot[room] = data;
    }
    ws.send(JSON.stringify({ type: 'snapshot', data: snapshot }));

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] client error:', err.message);
      clients.delete(ws);
    });
  });

  wss.on('error', (err) => {
    console.error('[WS] server error:', err.message);
  });

  // 3. Connect to MQTT broker
  const mqttClient = mqtt.connect(`mqtt://${mqttHost}:${mqttPort}`, {
    clientId: `zigbee-dashboard-${Math.random().toString(16).slice(2, 8)}`,
    keepalive: 60,
    reconnectPeriod: 5000,
  });

  mqttClient.on('connect', () => {
    console.log(`[MQTT] connected to ${mqttHost}:${mqttPort}`);
    // Subscribe to all device topics (+ = single-level wildcard)
    mqttClient.subscribe('zigbee2mqtt/+', (err) => {
      if (err) {
        console.error('[MQTT] subscribe error:', err.message);
      } else {
        console.log('[MQTT] subscribed to zigbee2mqtt/+');
      }
    });
  });

  mqttClient.on('message', (topic, payload) => {
    try {
      // Only handle device topics — exactly 2 segments: "zigbee2mqtt/{room}"
      // Skip bridge topics like "zigbee2mqtt/bridge/state", "zigbee2mqtt/bridge/devices", etc.
      const parts = topic.split('/');
      if (parts.length !== 2) return;

      const room = parts[1];

      // Only process climate sensors (e.g. "climate-kitchen", "climate-bedroom")
      if (!room.startsWith('climate-')) return;
      const data = JSON.parse(payload.toString());

      // Guard: only process if this looks like a sensor reading
      if (typeof data.temperature === 'undefined') return;

      const reading = {
        temperature: data.temperature,
        humidity: data.humidity ?? null,
        battery: data.battery ?? null,
        voltage: data.voltage ?? null,
        linkquality: data.linkquality ?? null,
        lastUpdated: new Date().toISOString(),
      };

      sensorCache.set(room, reading);

      broadcast({ type: 'update', room, data: reading });
    } catch (err) {
      // Malformed JSON or unexpected payload — ignore silently
      console.warn('[MQTT] failed to parse message on topic', topic, err.message);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('[MQTT] error:', err.message);
    // mqtt@5 handles reconnect automatically — no manual retry needed
  });

  mqttClient.on('reconnect', () => {
    console.log('[MQTT] reconnecting...');
  });

  mqttClient.on('offline', () => {
    console.warn('[MQTT] offline');
  });

  // 4. Start listening — must be last, after WS and MQTT are set up
  httpServer.listen(port, () => {
    console.log(`[Server] ready on http://localhost:${port}`);
  });
});
