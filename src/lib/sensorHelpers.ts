// --- Temperature ---

export function getTempEmoji(t: number): string {
  if (t < 16) return '❄️';
  if (t < 19) return '🥶';
  if (t <= 25) return '😊';
  if (t <= 28) return '🥵';
  return '🔥';
}

export function getTempColor(t: number): string {
  if (t < 16) return 'text-blue-500';
  if (t <= 25) return 'text-green-500';
  if (t <= 28) return 'text-yellow-500';
  return 'text-red-500';
}

export function getTempAdvice(t: number): string | null {
  if (t < 16) return 'Too cold — consider turning on heating';
  if (t > 25 && t <= 28) return 'Warm — try opening a window';
  if (t > 28) return 'Too hot — turn on AC or a fan';
  return null;
}

// --- Humidity ---

export function getHumidityEmoji(h: number): string {
  if (h < 30) return '🏜️';
  if (h < 40) return '😐';
  if (h <= 60) return '😊';
  if (h <= 70) return '😓';
  return '💧';
}

export function getHumidityAdvice(h: number): string | null {
  if (h < 30) return 'Very dry air — use a humidifier';
  if (h < 40) return 'Slightly dry — a small humidifier may help';
  if (h > 70) return 'Too humid — use a dehumidifier or open windows';
  if (h > 60) return 'Slightly humid — improve ventilation';
  return null;
}

// --- Room emoji ---

export function getRoomEmoji(room: string): string {
  const r = room.toLowerCase();
  if (r.includes('kitchen')) return '🍳';
  if (r.includes('living')) return '🛋️';
  if (r.includes('bedroom') || r.includes('bed') || r.includes('master')) return '🛏️';
  if (r.includes('bathroom') || r.includes('bath') || r.includes('toilet')) return '🚿';
  if (r.includes('office') || r.includes('study')) return '💼';
  if (r.includes('dining')) return '🍽️';
  if (r.includes('hallway') || r.includes('hall') || r.includes('corridor') || r.includes('entrance') || r.includes('entry')) return '🚪';
  if (r.includes('garage')) return '🚗';
  if (r.includes('garden') || r.includes('yard') || r.includes('outdoor') || r.includes('outside')) return '🌿';
  if (r.includes('balcony') || r.includes('terrace')) return '🌅';
  if (r.includes('laundry')) return '🫧';
  if (r.includes('basement') || r.includes('cellar')) return '⬇️';
  if (r.includes('attic')) return '⬆️';
  if (r.includes('nursery') || r.includes('baby')) return '👶';
  if (r.includes('gym') || r.includes('fitness')) return '🏋️';
  return '🏠';
}

// --- Battery ---

export function getBatteryColor(b: number): string {
  if (b >= 50) return 'text-green-500';
  if (b >= 20) return 'text-yellow-500';
  return 'text-red-500';
}

// --- Relative time ---

export function getRelativeTime(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// --- Bulb brightness conversion ---

export function brightnessToPercent(b: number): number {
  return Math.round((b / 254) * 100);
}

export function percentToBrightness(p: number): number {
  return Math.round((p / 100) * 254);
}
