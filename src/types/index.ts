// Node configuration type
export interface NodeConfig {
  id: string;
  name: string;
  host: string;
  tokenId: string;
  tokenSecret: string;
}

// ProxMox API response types
export interface ProxmoxNodeStatus {
  id: string;
  name: string;
  configName: string;
  status: 'online' | 'offline';
  uptime: number;
  cpu: number;
  memory: {
    total: number;
    used: number;
    free: number;
    usedPercentage: number;
  };
  swap: {
    total: number;
    used: number;
    free: number;
    usedPercentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usedPercentage: number;
  };
  loadAverage: [number, number, number];
  cpuInfo: {
    cores: number;
    sockets: number;
    model: string;
  };
}

// VM type
export interface ProxmoxVM {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'paused';
  node: string;
  nodeId?: string;
  vmid: number;
  cpus: number;
  cpu?: number;
  memory: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
  netin: number;
  netout: number;
  diskread: number;
  diskwrite: number;
  template: boolean;
  type: 'qemu';
}

// Container type
export interface ProxmoxContainer {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'paused' | 'unknown';
  node: string;
  nodeId?: string;
  vmid: number;
  cpus: number;
  cpu?: number;
  memory: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
  netin: number;
  netout: number;
  diskread: number;
  diskwrite: number;
  template: boolean;
  type: 'lxc';
}

// Union type for VM and Container
export type ProxmoxGuest = ProxmoxVM | ProxmoxContainer;

// Event data structure
export interface ProxmoxEvent {
  id: string;
  node: string;
  type: 'node' | 'vm' | 'container' | 'storage' | 'pool';
  eventTime: number;
  user: string;
  description: string;
  details?: Record<string, any>;
}

// Normalized metrics format
export interface MetricsData {
  timestamp: number;
  nodeId: string;
  guestId?: string;
  type: 'node' | 'vm' | 'container';
  metrics: {
    cpu?: number;
    memory?: {
      total: number;
      used: number;
      usedPercentage: number;
    };
    network?: {
      in: number;
      out: number;
      inRate?: number;
      outRate?: number;
    };
    disk?: {
      total: number;
      used: number;
      usedPercentage: number;
      readRate?: number;
      writeRate?: number;
    };
    uptime?: number;
    status?: string;
  };
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// WebSocket message types
export enum WebSocketMessageType {
  METRICS_UPDATE = 'METRICS_UPDATE',
  NODE_STATUS_UPDATE = 'NODE_STATUS_UPDATE',
  GUEST_STATUS_UPDATE = 'GUEST_STATUS_UPDATE',
  EVENT = 'EVENT',
  ERROR = 'ERROR',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
}

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: number;
}

// App configuration
export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  enableDevTools: boolean;
  metricsHistoryMinutes: number;
  ignoreSSLErrors: boolean;
  nodePollingIntervalMs: number;
  eventPollingIntervalMs: number;
  nodes: NodeConfig[];
} 