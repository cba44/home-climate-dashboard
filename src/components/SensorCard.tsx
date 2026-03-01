'use client';

import { useEffect, useState } from 'react';
import { Wifi, Battery, Clock, AlertTriangle } from 'lucide-react';
import type { BulbCapabilities, BulbCommand, BulbState, SensorReading } from '@/types/sensor';
import {
  getBatteryColor, getHumidityAdvice, getHumidityEmoji,
  getRelativeTime, getRoomEmoji, getTempAdvice, getTempColor, getTempEmoji,
} from '@/lib/sensorHelpers';
import { BulbControls } from '@/components/BulbControls';

interface Props {
  room: string;
  reading: SensorReading;
  bulb: BulbState | null;
  bulbCapabilities: BulbCapabilities | null;
  onBulbCommand: (command: BulbCommand) => void;
}

export function SensorCard({ room, reading, bulb, bulbCapabilities, onBulbCommand }: Props) {
  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(reading.lastUpdated));

  useEffect(() => {
    setRelativeTime(getRelativeTime(reading.lastUpdated));
    const id = setInterval(() => setRelativeTime(getRelativeTime(reading.lastUpdated)), 30_000);
    return () => clearInterval(id);
  }, [reading.lastUpdated]);

  const tempAdvice = getTempAdvice(reading.temperature);
  const humidityAdvice = reading.humidity != null ? getHumidityAdvice(reading.humidity) : null;
  const signalPct = reading.linkquality != null ? Math.round((reading.linkquality / 255) * 100) : null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md p-5 flex flex-col gap-3 border border-zinc-100 dark:border-zinc-800">
      {/* Room name */}
      <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-700 dark:text-zinc-200 capitalize">
        <span aria-hidden="true">{getRoomEmoji(room)}</span>
        {room.replace(/-/g, ' ')}
      </h2>

      {/* Primary readings: temperature + humidity */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-3xl" aria-label="temperature emoji">{getTempEmoji(reading.temperature)}</span>
          <span className={`text-2xl font-bold tabular-nums ${getTempColor(reading.temperature)}`}>
            {reading.temperature.toFixed(1)}°C
          </span>
        </div>
        {reading.humidity != null && (
          <>
            <div className="w-px h-12 bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex flex-col items-center">
              <span className="text-3xl" aria-label="humidity emoji">{getHumidityEmoji(reading.humidity)}</span>
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
            <Battery size={14} className={getBatteryColor(reading.battery)} />
            <span className={getBatteryColor(reading.battery)}>{reading.battery}%</span>
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

      {/* Climate advice */}
      {(tempAdvice || humidityAdvice) && (
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

      {/* Bulb controls */}
      {bulb && (
        <BulbControls
          bulb={bulb}
          bulbCapabilities={bulbCapabilities}
          onBulbCommand={onBulbCommand}
        />
      )}
    </div>
  );
}
