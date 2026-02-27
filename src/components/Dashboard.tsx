'use client';

import { useSensorWebSocket } from '@/hooks/useSensorWebSocket';
import { SensorCard } from '@/components/SensorCard';
import { SensorCardSkeleton } from '@/components/SensorCardSkeleton';
import { StatusBar } from '@/components/StatusBar';

export function Dashboard() {
  const { sensors, status } = useSensorWebSocket();

  const sortedRooms = Object.entries(sensors).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const isEmpty = sortedRooms.length === 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <StatusBar status={status} />
      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {isEmpty
          ? // Show skeleton placeholders while connecting / waiting for first data
            Array.from({ length: 4 }).map((_, i) => (
              <SensorCardSkeleton key={i} />
            ))
          : sortedRooms.map(([room, reading]) => (
              <SensorCard key={room} room={room} reading={reading} />
            ))}
      </main>
    </div>
  );
}
