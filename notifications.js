'use strict';

// ---------------------------------------------------------------------------
// Notification services — enabled via environment variables.
// All services receive the same title + body. Failures are logged but do
// not propagate (Promise.allSettled), so one broken service won't silence
// the others.
// ---------------------------------------------------------------------------

const ntfyEnabled    = process.env.NTFY_ENABLED     === 'true';
const telegramEnabled = process.env.TELEGRAM_ENABLED === 'true';
const discordEnabled  = process.env.DISCORD_ENABLED  === 'true';

// Web Push
const webpush = require('web-push');
const webPushEnabled = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (webPushEnabled) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// In-memory push subscription store — keyed by endpoint URL to prevent duplicates.
// Exported so server.js can register subscriptions.
const pushSubscriptions = new Map();

// ntfy
const ntfyBaseUrl          = (process.env.NTFY_URL || 'https://ntfy.sh').replace(/\/$/, '');
const ntfyTopic            = process.env.NTFY_TOPIC;
const ntfyToken            = process.env.NTFY_TOKEN;            // optional Bearer token
const ntfyPriorityAlert    = process.env.NTFY_PRIORITY_ALERT    || 'high';
const ntfyPriorityRecovery = process.env.NTFY_PRIORITY_RECOVERY || 'default';

// Telegram
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId   = process.env.TELEGRAM_CHAT_ID;

// Discord
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

// ---------------------------------------------------------------------------

async function sendNtfy(title, body, priority) {
  if (!ntfyTopic) {
    console.warn('[notify] ntfy is enabled but NTFY_TOPIC is not set — skipping');
    return;
  }
  const headers = {
    'Title':        title,
    'Content-Type': 'text/plain',
    'Priority':     priority,
  };
  if (ntfyToken) headers['Authorization'] = `Bearer ${ntfyToken}`;

  const res = await fetch(`${ntfyBaseUrl}/${encodeURIComponent(ntfyTopic)}`, {
    method:  'POST',
    headers,
    body,
  });
  if (!res.ok) {
    console.warn(`[notify] ntfy returned ${res.status}: ${await res.text()}`);
  }
}

async function sendTelegram(title, body) {
  if (!telegramBotToken || !telegramChatId) {
    console.warn('[notify] Telegram is enabled but TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID is not set — skipping');
    return;
  }
  const text = `*${title}*\n${body}`;
  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: telegramChatId, text, parse_mode: 'Markdown' }),
  });
  if (!res.ok) {
    console.warn(`[notify] Telegram returned ${res.status}: ${await res.text()}`);
  }
}

async function sendWebPush(title, body) {
  if (pushSubscriptions.size === 0) return;
  const payload = JSON.stringify({ title, body });
  const stale = [];
  await Promise.allSettled(
    [...pushSubscriptions.values()].map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          stale.push(subscription.endpoint);
        } else {
          console.error('[notify] web-push error:', err.message);
        }
      }
    })
  );
  for (const endpoint of stale) pushSubscriptions.delete(endpoint);
}

async function sendDiscord(title, body) {
  if (!discordWebhookUrl) {
    console.warn('[notify] Discord is enabled but DISCORD_WEBHOOK_URL is not set — skipping');
    return;
  }
  const res = await fetch(discordWebhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      embeds: [{
        title,
        description: body,
        color: 0x5865F2, // Discord blurple
      }],
    }),
  });
  if (!res.ok) {
    console.warn(`[notify] Discord returned ${res.status}: ${await res.text()}`);
  }
}

/**
 * Send a notification to all enabled services.
 * @param {string}  title       Short heading (e.g. "Living Room humidity")
 * @param {string}  body        Advice or recovery message
 * @param {boolean} isRecovery  True when conditions returned to comfortable (uses lower priority)
 */
async function sendNotification(title, body, isRecovery = false) {
  const ntfyPriority = isRecovery ? ntfyPriorityRecovery : ntfyPriorityAlert;
  const tasks = [];
  if (ntfyEnabled)     tasks.push(sendNtfy(title, body, ntfyPriority));
  if (telegramEnabled) tasks.push(sendTelegram(title, body));
  if (discordEnabled)  tasks.push(sendDiscord(title, body));
  if (webPushEnabled)  tasks.push(sendWebPush(title, body));
  if (tasks.length === 0) return;

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[notify] unhandled send error:', result.reason);
    }
  }
}

async function sendTestPush() {
  return sendWebPush('Test notification', 'Push is working correctly');
}

module.exports = { sendNotification, pushSubscriptions, sendTestPush };
