export interface SensorReading {
  temperature: number;
  humidity: number | null;
  battery: number | null;
  voltage: number | null;
  linkquality: number | null;
  lastUpdated: string; // ISO 8601
}

export type SensorMap = Record<string, SensorReading>;

export interface BulbState {
  state: 'ON' | 'OFF';
  brightness: number;        // 0–254 (zigbee2mqtt native)
  color_temp: number | null; // mireds, null if not currently set
}

export interface BulbCapabilities {
  minColorTemp: number; // mireds (e.g. 153 = cool white)
  maxColorTemp: number; // mireds (e.g. 454 = warm white)
}

export type BulbMap = Record<string, BulbState>;
export type BulbCapabilitiesMap = Record<string, BulbCapabilities | null>;

export interface BulbCommand {
  state?: 'ON' | 'OFF';
  brightness?: number;  // 0–254
  color_temp?: number;  // mireds
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type WsMessage =
  | { type: 'snapshot'; data: SensorMap; bulbs: BulbMap; capabilities: BulbCapabilitiesMap }
  | { type: 'update'; room: string; data: SensorReading }
  | { type: 'bulb-update'; room: string; data: BulbState };
