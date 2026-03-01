'use client';

import { useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { BulbCapabilities, BulbCommand, BulbState } from '@/types/sensor';
import { brightnessToPercent, percentToBrightness } from '@/lib/sensorHelpers';

interface Props {
  bulb: BulbState;
  bulbCapabilities: BulbCapabilities | null;
  onBulbCommand: (command: BulbCommand) => void;
}

export function BulbControls({ bulb, bulbCapabilities, onBulbCommand }: Props) {
  const [localBrightness, setLocalBrightness] = useState(() => brightnessToPercent(bulb.brightness));
  const [localColorTemp, setLocalColorTemp] = useState(() => bulb.color_temp ?? bulbCapabilities?.minColorTemp ?? 153);

  const brightnessDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorTempDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingBrightness = useRef(false);
  const isDraggingColorTemp = useRef(false);

  useEffect(() => {
    if (!isDraggingBrightness.current) setLocalBrightness(brightnessToPercent(bulb.brightness));
  }, [bulb.brightness]);

  useEffect(() => {
    if (bulb.color_temp != null && !isDraggingColorTemp.current) setLocalColorTemp(bulb.color_temp);
  }, [bulb.color_temp]);

  const isOn = bulb.state === 'ON';

  function handleToggle() {
    onBulbCommand({ state: isOn ? 'OFF' : 'ON' });
  }

  function handleBrightnessChange(e: React.ChangeEvent<HTMLInputElement>) {
    const pct = Number(e.target.value);
    setLocalBrightness(pct);
    isDraggingBrightness.current = true;
    if (brightnessDebounce.current) clearTimeout(brightnessDebounce.current);
    brightnessDebounce.current = setTimeout(() => {
      isDraggingBrightness.current = false;
      onBulbCommand({ brightness: percentToBrightness(pct) });
    }, 300);
  }

  function handleColorTempChange(e: React.ChangeEvent<HTMLInputElement>) {
    const mireds = Number(e.target.value);
    setLocalColorTemp(mireds);
    isDraggingColorTemp.current = true;
    if (colorTempDebounce.current) clearTimeout(colorTempDebounce.current);
    colorTempDebounce.current = setTimeout(() => {
      isDraggingColorTemp.current = false;
      onBulbCommand({ color_temp: mireds });
    }, 300);
  }

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex flex-col gap-3">
      {/* On/Off toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
          <Lightbulb size={14} className={isOn ? 'text-yellow-400' : 'text-zinc-400'} />
          <span>Light</span>
        </div>
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            isOn ? 'bg-yellow-400' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
          aria-label={isOn ? 'Turn off light' : 'Turn on light'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isOn ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Brightness slider — only when ON */}
      {isOn && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Brightness</span>
            <span>{localBrightness}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={localBrightness}
            onChange={handleBrightnessChange}
            className="w-full h-1.5 rounded-full accent-yellow-400 cursor-pointer"
            aria-label="Brightness"
          />
        </div>
      )}

      {/* Color temperature slider — only when ON and supported */}
      {isOn && bulbCapabilities && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Cool</span>
            <span>Warm</span>
          </div>
          <input
            type="range"
            min={bulbCapabilities.minColorTemp}
            max={bulbCapabilities.maxColorTemp}
            value={localColorTemp}
            onChange={handleColorTempChange}
            className="w-full h-1.5 rounded-full cursor-pointer"
            style={{ accentColor: '#f59e0b', background: 'linear-gradient(to right, #bfdbfe, #fef3c7)' }}
            aria-label="Color temperature"
          />
        </div>
      )}
    </div>
  );
}
