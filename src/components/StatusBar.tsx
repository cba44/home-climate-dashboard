import clsx from 'clsx';
import type { ConnectionStatus } from '@/types/sensor';

interface Props {
  status: ConnectionStatus;
}

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; dotColor: string; pulse: boolean }> = {
  connecting: {
    label: 'Connecting…',
    dotColor: 'bg-yellow-400',
    pulse: true,
  },
  connected: {
    label: 'Live',
    dotColor: 'bg-green-500',
    pulse: true,
  },
  disconnected: {
    label: 'Disconnected',
    dotColor: 'bg-zinc-400',
    pulse: false,
  },
  error: {
    label: 'Connection error',
    dotColor: 'bg-red-500',
    pulse: false,
  },
};

export function StatusBar({ status }: Props) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
      <h1 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
        Home Climate
      </h1>
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            'inline-block h-2 w-2 rounded-full',
            config.dotColor,
            config.pulse && 'animate-pulse'
          )}
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {config.label}
        </span>
      </div>
    </div>
  );
}
