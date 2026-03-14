# Home Climate Dashboard

Live temperature, humidity, and light control dashboard for your home, powered by Zigbee sensors, IKEA bulbs, MQTT, and Next.js.

## Overview

```
Sonoff SNZB-02 sensors → zigbee2mqtt → Mosquitto MQTT → server.js → Browser
IKEA bulbs             ↗                                           ↘ controls
```

- Reads live temperature and humidity from Sonoff SNZB-02/SNZB-02D sensors
- Controls IKEA bulbs (on/off, brightness, optional color temperature) from the same card
- Bulb capabilities (color temperature support) auto-detected from zigbee2mqtt — no hardcoding
- A custom Node.js server bridges MQTT to the browser over WebSocket (port 3000)
- No database — live readings only, held in memory

## Prerequisites

- Node.js 22+
- Raspberry Pi running **zigbee2mqtt** and **Mosquitto** via Docker
- Climate sensors paired in zigbee2mqtt with friendly names `climate-{room}` (e.g. `climate-kitchen`, `climate-living-room`)
- IKEA bulbs paired with friendly names `bulb-{room}` matching the same room (e.g. `bulb-kitchen`, `bulb-living-room`)

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
├── notifications.js        # Push notification dispatch (ntfy / Telegram / Discord)
├── src/
│   ├── app/                # Next.js App Router pages and global CSS
│   ├── components/
│   │   ├── Dashboard.tsx         # Sensor grid (client component)
│   │   ├── SensorCard.tsx        # Per-room card layout
│   │   ├── BulbControls.tsx      # Light toggle, brightness & color temp sliders
│   │   ├── SensorCardSkeleton.tsx
│   │   └── StatusBar.tsx         # WebSocket connection status
│   ├── hooks/
│   │   └── useSensorWebSocket.ts # WS connection, reconnect, state management
│   ├── lib/
│   │   └── sensorHelpers.ts      # Pure helper functions (emojis, colors, advice, time)
│   └── types/
│       └── sensor.ts             # Shared TypeScript interfaces
├── Dockerfile
└── docker-compose.yml      # Service snippet for Pi integration
```

## Sensor Card Features

| Indicator      | Details                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| Room icon      | Auto-detected emoji per room name (🍳 kitchen · 🛋️ living · 🛏️ bedroom · 🚿 bathroom · and more) |
| Temperature    | ❄️ <16° · 🥶 16–18.9° · 😊 19–25° · 🥵 25.1–28° · 🔥 >28°               |
| Humidity       | 🏜️ <30% · 😐 30–39% · 😊 40–60% · 😓 61–70% · 💧 >70%                   |
| Battery        | Color-coded: green ≥50% · yellow ≥20% · red <20%                        |
| Signal         | LQI as percentage                                                       |
| Climate advice | Contextual tips shown when temp or humidity is out of range             |
| Light on/off   | Toggle switch per room (shown when a `bulb-{room}` is paired)           |
| Brightness     | Slider 0–100% (shown when the light is on)                              |
| Color temp     | Cool → warm slider (shown only on bulbs that support color temperature) |

## Configuration

| Variable              | Default           | Description                                             |
| --------------------- | ----------------- | ------------------------------------------------------- |
| `MQTT_HOST`           | `localhost`       | Hostname or IP of the Mosquitto broker                  |
| `MQTT_PORT`           | `1883`            | MQTT broker port                                        |
| `PORT`                | `3000`            | HTTP/WebSocket server port                              |
| `NTFY_ENABLED`        | `false`           | Set to `true` to enable ntfy notifications              |
| `NTFY_URL`            | `https://ntfy.sh` | ntfy base URL — omit to use the public ntfy.sh service  |
| `NTFY_TOPIC`          | —                 | ntfy topic to publish to (required when ntfy is enabled)|
| `NTFY_TOKEN`              | —                 | Bearer token for access-controlled topics (optional)              |
| `NTFY_PRIORITY_ALERT`     | `high`            | ntfy priority for problem alerts (`min`/`low`/`default`/`high`/`max`) |
| `NTFY_PRIORITY_RECOVERY`  | `default`         | ntfy priority for "back to normal" notifications                  |
| `TELEGRAM_ENABLED`        | `false`           | Set to `true` to enable Telegram notifications                    |
| `TELEGRAM_BOT_TOKEN`  | —                 | Bot token from @BotFather                               |
| `TELEGRAM_CHAT_ID`    | —                 | Chat or group ID to send messages to                    |
| `DISCORD_ENABLED`     | `false`           | Set to `true` to enable Discord notifications           |
| `DISCORD_WEBHOOK_URL` | —                 | Discord channel webhook URL                             |

## Notifications

Notifications are sent when a sensor's climate advice **category** changes — not on every reading. A notification fires only when a threshold boundary is crossed:

**Temperature thresholds**

| Range | Category | Message |
| --- | --- | --- |
| < 16° | Very cold | Very cold — turn on heating |
| 16–19° | Chilly | Chilly — consider turning on heating |
| 19–25° | Comfortable | *(no notification)* |
| 25–28° | Warm | Warm — try opening a window |
| > 28° | Too hot | Too hot — turn on AC or a fan |

**Humidity thresholds**

| Range | Category | Message |
| --- | --- | --- |
| < 30% | Very dry | Very dry air — use a humidifier |
| 30–40% | Slightly dry | Slightly dry — a small humidifier may help |
| 40–60% | Comfortable | *(no notification)* |
| 60–70% | Slightly humid | Slightly humid — improve ventilation |
| > 70% | Too humid | Too humid — use a dehumidifier or open windows |

For example: humidity going from 39% → 37% fires no notification (still "slightly dry"). Going from 37% → 28% fires one notification ("very dry"). A return to the comfortable range sends a **"Back to a comfortable range"** recovery message.

Notifications are silenced on the very first reading after server start, so a restart never spams your phone.

**Supported services** — enable any combination via env vars (see [Configuration](#configuration)):
- **ntfy** — works with the public [ntfy.sh](https://ntfy.sh) or any self-hosted instance; set `NTFY_URL` for self-hosted
- **Telegram** — requires a bot token from [@BotFather](https://t.me/BotFather) and a chat/group ID
- **Discord** — requires a channel webhook URL

All services are independent: a failure in one does not silence the others.
