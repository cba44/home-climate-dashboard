'use client';

import { useSensorWebSocket } from '@/hooks/useSensorWebSocket';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { SensorCard } from '@/components/SensorCard';
import { SensorCardSkeleton } from '@/components/SensorCardSkeleton';
import { StatusBar } from '@/components/StatusBar';

export function Dashboard() {
  const { sensors, bulbs, capabilities, status, sendBulbCommand } = useSensorWebSocket();
  usePushSubscription();

  const sortedRooms = Object.entries(sensors).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const isEmpty = sortedRooms.length === 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <StatusBar status={status} />
      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {isEmpty
          ? Array.from({ length: 4 }).map((_, i) => <SensorCardSkeleton key={i} />)
          : sortedRooms.map(([key, reading]) => {
              const room = key.replace(/^climate-/, '');
              return (
                <SensorCard
                  key={key}
                  room={room}
                  reading={reading}
                  bulb={bulbs[room] ?? null}
                  bulbCapabilities={capabilities[room] ?? null}
                  onBulbCommand={(command) => sendBulbCommand(room, command)}
                />
              );
            })}
      </main>
    </div>
  );
}
