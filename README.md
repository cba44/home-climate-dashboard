# Zigbee Dashboard

Live temperature, humidity, and light control dashboard for your home — powered by Zigbee sensors, IKEA bulbs, MQTT, and Next.js. Installable as a PWA with Web Push notifications.

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
- Installable as a PWA (Chrome/Edge install prompt; iOS via Share → Add to Home Screen)
- Web Push notifications — alerts delivered to your device even when the app is closed

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

**3. (Optional) Enable Web Push**

Generate VAPID keys once and add them to `.env.local`:

```bash
npx web-push generate-vapid-keys
```

Copy the output into `.env.local` — see `.env.example` for the full list of keys.

## Testing PWA Locally

PWA features (service worker, install prompt, Web Push) require a **production build** — they are disabled in `npm run dev`. Use the `preview` script to build and run production locally in one command:

```bash
npm run preview
```

This runs `npm run build` then starts the server at `http://localhost:3000` with `.env.local` loaded and `NODE_ENV=production`.

**Step-by-step checklist in Chrome:**

1. Open `http://localhost:3000`
2. **DevTools → Application → Service Workers** — verify the SW is active and scope is `/`
3. **DevTools → Application → Manifest** — verify name, icons, and theme color load correctly
4. An install icon appears in the address bar — click it to install the app in a standalone window
5. Grant notification permission when prompted (or via DevTools → Application → Notifications)
6. Send a test push — no MQTT event needed:

```bash
curl -X POST http://localhost:3000/api/test-push
# {"ok":true,"subscribers":1}
```

A notification titled "Test notification" should arrive on your device. If the app window is open, put it in the background or close it first to see the system notification.

> `POST /api/test-push` is blocked with HTTP 403 in production — it is safe to leave in the codebase.

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
  image: ghcr.io/<your-username>/<your-repo>:latest
  container_name: zigbee-dashboard
  restart: unless-stopped
  ports:
    - "3000:3000"
  environment:
    - MQTT_HOST=mosquitto     # Docker service name (if on the same network)
    - MQTT_PORT=1883
    - NODE_ENV=production
    - VAPID_PUBLIC_KEY=<your-public-key>
    - VAPID_PRIVATE_KEY=<your-private-key>
    - VAPID_SUBJECT=mailto:you@example.com
  depends_on:
    - mosquitto
```

> If your containers use host networking, set `network_mode: host` and `MQTT_HOST=localhost` instead.

**GitHub Actions (CI/CD to GHCR)**

No secrets are needed in CI. The Docker image is built without any VAPID keys — they are injected at runtime via `docker-compose.yml` on the Pi. Only `GITHUB_TOKEN` (provided automatically) is required.

**3. Start the service**

```bash
docker compose up -d zigbee-dashboard
```

**Access:** `http://<pi-hostname>:3000`

## Project Structure

```
├── public/
│   ├── manifest.json           # Web App Manifest (PWA)
│   └── icons/                  # App icons (192×192, 512×512)
├── server.js                   # MQTT subscriber + WebSocket server + Next.js HTTP server
├── notifications.js            # Push notification dispatch (ntfy / Telegram / Discord / Web Push)
├── src/
│   ├── app/                    # Next.js App Router pages and global CSS
│   ├── components/
│   │   ├── Dashboard.tsx             # Sensor grid (client component)
│   │   ├── SensorCard.tsx            # Per-room card layout
│   │   ├── BulbControls.tsx          # Light toggle, brightness & color temp sliders
│   │   ├── SensorCardSkeleton.tsx
│   │   └── StatusBar.tsx             # WebSocket connection status
│   ├── hooks/
│   │   ├── useSensorWebSocket.ts     # WS connection, reconnect, state management
│   │   └── usePushSubscription.ts    # Browser push subscription + permission prompt
│   ├── lib/
│   │   └── sensorHelpers.ts          # Pure helper functions (emojis, colors, advice, time)
│   ├── types/
│   │   └── sensor.ts                 # Shared TypeScript interfaces
│   └── worker/
│       └── index.ts                  # Custom service worker (push + notificationclick events)
├── Dockerfile
└── docker-compose.yml          # Service snippet for Pi integration
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
| `VAPID_PUBLIC_KEY` | — | Web Push VAPID public key — signs push messages server-side; served to the browser at runtime via `GET /api/vapid-public-key` |
| `VAPID_PRIVATE_KEY` | — | Web Push VAPID private key — keep secret, never commit |
| `VAPID_SUBJECT` | `mailto:admin@example.com` | Contact URI sent with each push request |

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

## PWA & Web Push

### Installing the app

The dashboard is a Progressive Web App. Once served over HTTPS (or `localhost`):

- **Chrome / Edge (desktop & Android)** — an install icon appears in the address bar. Click it to install the app in a standalone window.
- **iOS 16.4+** — tap the Share button in Safari, then **Add to Home Screen**. Push notifications require the installed app (not the Safari browser tab).

### Web Push notifications

When the app loads, the browser asks for notification permission. On approval:

1. The browser registers a push subscription using the VAPID public key
2. The subscription is sent to the server (`POST /api/push-subscribe`) and held in memory
3. Whenever a climate alert fires (same thresholds as ntfy/Telegram/Discord), a push notification is delivered to the device — even when the app is closed

Push notifications are sent **in parallel** with all other enabled notification services.

### VAPID key setup

Generate a key pair once (per deployment):

```bash
npx web-push generate-vapid-keys
```

| Key | Where to set it |
|---|---|
| Public key | `.env.local` as `VAPID_PUBLIC_KEY`; docker-compose env — the server serves it to the browser at runtime, no build step needed |
| Private key | `.env.local` and docker-compose env only — never in CI |

### Subscription persistence

Subscriptions are stored in memory. After a server restart, users automatically re-subscribe the next time they load the page (the browser retains its push subscription endpoint; no permission prompt is shown again).

### iOS notes

- Push notifications require iOS 16.4+ and the app must be installed via Add to Home Screen
- iOS does not show an automatic install banner — users must use the Share menu manually
