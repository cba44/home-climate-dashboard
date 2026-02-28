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

// Climate sensor cache: key = "climate-kitchen", value = SensorReading
const sensorCache = new Map();

// Bulb state cache: key = "kitchen" (no prefix), value = BulbState
const bulbCache = new Map();

// Bulb capabilities: key = "kitchen", value = { minColorTemp, maxColorTemp } | null
const bulbCapabilities = new Map();

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
  const httpServer = http.createServer((req, res) => {
    handle(req, res);
  });

  // Use noServer mode to avoid intercepting Next.js HMR upgrades
  const wss = new WebSocket.Server({ noServer: true });

  // Only handle upgrades to /ws — our dedicated sensor WebSocket path
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

    // Send full snapshot immediately so browser doesn't show blank cards
    ws.send(JSON.stringify({
      type: 'snapshot',
      data: Object.fromEntries(sensorCache),
      bulbs: Object.fromEntries(bulbCache),
      capabilities: Object.fromEntries(bulbCapabilities),
    }));

    // Receive commands from the browser (e.g. bulb toggle/brightness)
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'bulb-command' && msg.room && msg.command) {
          mqttClient.publish(
            `zigbee2mqtt/bulb-${msg.room}/set`,
            JSON.stringify(msg.command)
          );
        }
      } catch {
        // Ignore malformed messages
      }
    });

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

  // Connect to MQTT broker
  const mqttClient = mqtt.connect(`mqtt://${mqttHost}:${mqttPort}`, {
    clientId: `zigbee-dashboard-${Math.random().toString(16).slice(2, 8)}`,
    keepalive: 60,
    reconnectPeriod: 5000,
  });

  mqttClient.on('connect', () => {
    console.log(`[MQTT] connected to ${mqttHost}:${mqttPort}`);
    // bridge/devices is retained — delivered immediately, contains bulb capabilities
    mqttClient.subscribe('zigbee2mqtt/bridge/devices');
    mqttClient.subscribe('zigbee2mqtt/+');
  });

  mqttClient.on('message', (topic, payload) => {
    try {
      // Parse device capabilities from bridge/devices (retained message)
      if (topic === 'zigbee2mqtt/bridge/devices') {
        const devices = JSON.parse(payload.toString());
        for (const device of devices) {
          const name = device.friendly_name;
          if (!name || !name.startsWith('bulb-')) continue;
          const room = name.replace(/^bulb-/, '');
          const lightFeature = device.definition?.exposes?.find(e => e.type === 'light');
          const colorTempFeature = lightFeature?.features?.find(f => f.name === 'color_temp');
          bulbCapabilities.set(
            room,
            colorTempFeature
              ? { minColorTemp: colorTempFeature.value_min, maxColorTemp: colorTempFeature.value_max }
              : null
          );
        }
        // Re-broadcast snapshot so connected clients get updated capabilities
        broadcast({
          type: 'snapshot',
          data: Object.fromEntries(sensorCache),
          bulbs: Object.fromEntries(bulbCache),
          capabilities: Object.fromEntries(bulbCapabilities),
        });
        return;
      }

      // Only handle single-level device topics: "zigbee2mqtt/{device}"
      const parts = topic.split('/');
      if (parts.length !== 2) return;

      const device = parts[1];
      const data = JSON.parse(payload.toString());

      // Handle bulb state updates
      if (device.startsWith('bulb-')) {
        const room = device.replace(/^bulb-/, '');
        const bulbState = {
          state: data.state ?? 'OFF',
          brightness: data.brightness ?? 254,
          color_temp: data.color_temp ?? null,
        };
        bulbCache.set(room, bulbState);
        broadcast({ type: 'bulb-update', room, data: bulbState });
        return;
      }

      // Handle climate sensor updates
      if (device.startsWith('climate-')) {
        if (typeof data.temperature === 'undefined') return;
        const reading = {
          temperature: data.temperature,
          humidity: data.humidity ?? null,
          battery: data.battery ?? null,
          voltage: data.voltage ?? null,
          linkquality: data.linkquality ?? null,
          lastUpdated: new Date().toISOString(),
        };
        sensorCache.set(device, reading);
        broadcast({ type: 'update', room: device, data: reading });
      }
    } catch (err) {
      console.warn('[MQTT] failed to parse message on topic', topic, err.message);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('[MQTT] error:', err.message);
  });

  mqttClient.on('reconnect', () => {
    console.log('[MQTT] reconnecting...');
  });

  mqttClient.on('offline', () => {
    console.warn('[MQTT] offline');
  });

  httpServer.listen(port, () => {
    console.log(`[Server] ready on http://localhost:${port}`);
  });
});
