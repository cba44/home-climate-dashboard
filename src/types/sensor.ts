export interface SensorReading {
  temperature: number;
  humidity: number | null;
  battery: number | null;
  voltage: number | null;
  linkquality: number | null;
  lastUpdated: string; // ISO 8601
}

export type SensorMap = Record<string, SensorReading>;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type WsMessage =
  | { type: 'snapshot'; data: SensorMap }
  | { type: 'update'; room: string; data: SensorReading };
