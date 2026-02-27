'use client';

import { useEffect, useState } from 'react';
import { Wifi, Battery, Clock, AlertTriangle } from 'lucide-react';
import type { SensorReading } from '@/types/sensor';

interface Props {
  room: string;
  reading: SensorReading;
}

// --- Temperature helpers ---

function getTempEmoji(t: number): string {
  if (t < 16) return '🥶';
  if (t < 19) return '🧥';
  if (t <= 24) return '😊';
  if (t <= 28) return '😅';
  return '🥵';
}

function getTempColor(t: number): string {
  if (t < 16) return 'text-blue-500';
  if (t <= 24) return 'text-green-500';
  if (t <= 28) return 'text-yellow-500';
  return 'text-red-500';
}

function getTempAdvice(t: number): string | null {
  if (t < 16) return 'Too cold — consider turning on heating';
  if (t >= 25 && t <= 28) return 'Warm — try opening a window';
  if (t > 28) return 'Too hot — turn on AC or a fan';
  return null;
}

// --- Humidity helpers ---

function getHumidityEmoji(h: number): string {
  if (h < 30) return '🏜️';
  if (h < 40) return '😐';
  if (h <= 60) return '😊';
  if (h <= 70) return '😅';
  return '💧';
}

function getHumidityAdvice(h: number): string | null {
  if (h < 30) return 'Very dry air — use a humidifier';
  if (h < 40) return 'Slightly dry — a small humidifier may help';
  if (h > 70) return 'Too humid — use a dehumidifier or open windows';
  if (h > 60) return 'Slightly humid — improve ventilation';
  return null;
}

// --- Battery helpers ---

function getBatteryColor(b: number): string {
  if (b >= 50) return 'text-green-500';
  if (b >= 20) return 'text-yellow-500';
  return 'text-red-500';
}

// --- Relative time ---

function getRelativeTime(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function SensorCard({ room, reading }: Props) {
  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(reading.lastUpdated));

  // Update relative time every 30 seconds
  useEffect(() => {
    setRelativeTime(getRelativeTime(reading.lastUpdated));
    const id = setInterval(() => {
      setRelativeTime(getRelativeTime(reading.lastUpdated));
    }, 30_000);
    return () => clearInterval(id);
  }, [reading.lastUpdated]);

  const tempAdvice = getTempAdvice(reading.temperature);
  const humidityAdvice = reading.humidity != null ? getHumidityAdvice(reading.humidity) : null;
  const hasAdvice = tempAdvice !== null || humidityAdvice !== null;

  // LQI signal strength as percentage (0–255 → 0–100%)
  const signalPct = reading.linkquality != null ? Math.round((reading.linkquality / 255) * 100) : null;

  return (
    <div
      className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md p-5 flex flex-col gap-3 border border-zinc-100 dark:border-zinc-800"
    >
      {/* Room name */}
      <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-200 capitalize">
        {room.replace(/^climate-/, '').replace(/-/g, ' ')}
      </h2>

      {/* Primary readings: temperature + humidity */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-3xl" aria-label="temperature emoji">
            {getTempEmoji(reading.temperature)}
          </span>
          <span
            className={`text-2xl font-bold tabular-nums ${getTempColor(reading.temperature)}`}
          >
            {reading.temperature.toFixed(1)}°C
          </span>
        </div>

        {reading.humidity != null && (
          <>
            <div className="w-px h-12 bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex flex-col items-center">
              <span className="text-3xl" aria-label="humidity emoji">
                {getHumidityEmoji(reading.humidity)}
              </span>
              <span className="text-2xl font-bold tabular-nums text-sky-500">
                {Math.round(reading.humidity)}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Secondary readings: battery + signal */}
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        {reading.battery != null && (
          <div className="flex items-center gap-1">
            <Battery
              size={14}
              className={getBatteryColor(reading.battery)}
            />
            <span className={getBatteryColor(reading.battery)}>
              {reading.battery}%
            </span>
          </div>
        )}
        {signalPct != null && (
          <div className="flex items-center gap-1">
            <Wifi size={14} />
            <span>{signalPct}%</span>
          </div>
        )}
      </div>

      {/* Last updated */}
      <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
        <Clock size={11} />
        <span>{relativeTime}</span>
      </div>

      {/* Climate advice panel */}
      {hasAdvice && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 flex flex-col gap-1">
          {tempAdvice && (
            <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{tempAdvice}</span>
            </div>
          )}
          {humidityAdvice && (
            <div className="flex items-start gap-1.5 text-xs text-sky-700 dark:text-sky-400">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{humidityAdvice}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
