# Home Climate Dashboard

Live temperature and humidity monitoring for your home, powered by Zigbee sensors, MQTT, and Next.js.

## Overview

```
Sonoff SNZB-02 sensors → zigbee2mqtt → Mosquitto MQTT → server.js → Browser
```

- Reads live data from Sonoff SNZB-02/SNZB-02D sensors via zigbee2mqtt
- A custom Node.js server bridges MQTT to the browser over WebSocket (port 3000)
- No database — live readings only, held in memory
- Responsive card grid with temperature/humidity emojis, battery level, signal strength, and climate advice

## Prerequisites

- Node.js 22+
- Raspberry Pi running **zigbee2mqtt** and **Mosquitto** via Docker
- Sensors paired in zigbee2mqtt with friendly names matching your room names (e.g. `living-room`, `bedroom-1`)

## Local Development

**1. Configure the MQTT broker address**

Edit `.env.local`:

```env
MQTT_HOST=   # your Pi's hostname or IP
MQTT_PORT=1883
PORT=3000
```

**2. Install dependencies and run**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app connects to the Pi's live MQTT broker — no mocking needed.

## Deploy to Raspberry Pi

**1. Build the Docker image on the Pi**

```bash
ssh pi@<pi-hostname>
cd ~/zigbee-dashboard
docker build -t zigbee-dashboard:latest .
```

**2. Add the service to your existing `docker-compose.yml`**

```yaml
zigbee-dashboard:
  image: zigbee-dashboard:latest
  container_name: zigbee-dashboard
  restart: unless-stopped
  ports:
    - "3000:3000"
  environment:
    - MQTT_HOST=mosquitto # Docker service name (if on the same network)
    - MQTT_PORT=1883
    - NODE_ENV=production
  depends_on:
    - mosquitto
```

> If your containers use host networking, set `network_mode: host` and `MQTT_HOST=localhost` instead.

**3. Start the service**

```bash
docker compose up -d zigbee-dashboard
```

**Access:** `http://<pi-hostname>:3000`

## Project Structure

```
├── server.js               # MQTT subscriber + WebSocket server + Next.js HTTP server
├── src/
│   ├── app/                # Next.js App Router pages and global CSS
│   ├── components/
│   │   ├── Dashboard.tsx   # Sensor grid (client component)
│   │   ├── SensorCard.tsx  # Per-room card with readings and climate advice
│   │   ├── SensorCardSkeleton.tsx
│   │   └── StatusBar.tsx   # WebSocket connection status
│   ├── hooks/
│   │   └── useSensorWebSocket.ts  # WS connection, reconnect, state management
│   └── types/
│       └── sensor.ts       # Shared TypeScript interfaces
├── Dockerfile
└── docker-compose.yml      # Service snippet for Pi integration
```

## Sensor Card Features

| Indicator      | Details                                                     |
| -------------- | ----------------------------------------------------------- |
| Temperature    | 🥶 <16° · 🧥 16–18° · 😊 19–24° · 😅 25–28° · 🥵 >28°       |
| Humidity       | 🏜️ <30% · 😐 30–39% · 😊 40–60% · 😅 61–70% · 💧 >70%       |
| Battery        | Color-coded: green ≥50% · yellow ≥20% · red <20%            |
| Signal         | LQI as percentage                                           |
| Stale sensor   | Amber border when no update for 5+ minutes                  |
| Climate advice | Contextual tips shown when temp or humidity is out of range |

## Configuration

| Variable    | Default     | Description                            |
| ----------- | ----------- | -------------------------------------- |
| `MQTT_HOST` | `localhost` | Hostname or IP of the Mosquitto broker |
| `MQTT_PORT` | `1883`      | MQTT broker port                       |
| `PORT`      | `3000`      | HTTP/WebSocket server port             |
