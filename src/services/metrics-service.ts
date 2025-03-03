import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { nodeManager } from './node-manager';
import config from '../config';
import { MetricsData, ProxmoxNodeStatus, ProxmoxVM, ProxmoxContainer } from '../types';

export class MetricsService extends EventEmitter {
  private logger = createLogger('MetricsService');
  private metricsHistory: Map<string, MetricsData[]> = new Map();
  private lastMetrics: Map<string, MetricsData> = new Map();
  private historyMaxLength: number;
  // Add a map to store recent network rate values for smoothing
  private recentNetworkRates: Map<string, { inRates: number[], outRates: number[] }> = new Map();
  // Number of samples to use for the moving average
  private readonly movingAverageSamples: number = 3;

  constructor() {
    super();
    
    // Calculate max history length based on configuration
    // Assuming we collect metrics every 30 seconds
    this.historyMaxLength = Math.ceil((config.metricsHistoryMinutes * 60) / 30);
    
    this.logger.info(`Metrics history configured for ${config.metricsHistoryMinutes} minutes (${this.historyMaxLength} data points)`);
    
    // Subscribe to node manager events
    this.subscribeToEvents();
  }

  /**
   * Subscribe to node manager events
   */
  private subscribeToEvents(): void {
    nodeManager.on('metricsUpdated', this.handleMetricsUpdate.bind(this));
  }

  /**
   * Handle metrics update from node manager
   */
  private handleMetricsUpdate(data: any): void {
    const { nodeId, timestamp, nodeStatus, vms, containers } = data;
    
    // Process node metrics
    this.processNodeMetrics(nodeId, timestamp, nodeStatus);
    
    // Process VM metrics
    for (const vm of vms) {
      this.processGuestMetrics(nodeId, timestamp, vm, 'vm');
    }
    
    // Process container metrics
    for (const container of containers) {
      this.processGuestMetrics(nodeId, timestamp, container, 'container');
    }
  }

  /**
   * Process node metrics
   */
  private processNodeMetrics(nodeId: string, timestamp: number, nodeStatus: ProxmoxNodeStatus): void {
    const metrics: MetricsData = {
      timestamp,
      nodeId,
      type: 'node',
      metrics: {
        cpu: nodeStatus.cpu,
        memory: {
          total: nodeStatus.memory.total,
          used: nodeStatus.memory.used,
          usedPercentage: nodeStatus.memory.usedPercentage
        },
        disk: {
          total: nodeStatus.disk.total,
          used: nodeStatus.disk.used,
          usedPercentage: nodeStatus.disk.usedPercentage
        },
        uptime: nodeStatus.uptime,
        status: nodeStatus.status
      }
    };
    
    // Store last metrics
    this.lastMetrics.set(nodeId, metrics);
    
    // Add to history
    this.addToHistory(nodeId, metrics);
    
    // Emit metrics update event
    this.emit('metricsUpdated', metrics);
  }

  /**
   * Process guest (VM or container) metrics
   */
  private processGuestMetrics(
    nodeId: string, 
    timestamp: number, 
    guest: ProxmoxVM | ProxmoxContainer,
    type: 'vm' | 'container'
  ): void {
    const guestId = guest.id;
    const previousMetrics = this.lastMetrics.get(guestId);
    
    // Calculate network rates
    const networkInRate = previousMetrics ? 
      this.calculateRate(guest.netin, previousMetrics.metrics.network?.in || 0, timestamp, previousMetrics.timestamp) : 
      0;
    
    const networkOutRate = previousMetrics ? 
      this.calculateRate(guest.netout, previousMetrics.metrics.network?.out || 0, timestamp, previousMetrics.timestamp) : 
      0;
    
    // Apply moving average to smooth network rates
    const smoothedNetworkRates = this.applyMovingAverage(guestId, networkInRate, networkOutRate);
    
    // Calculate disk rates
    const diskReadRate = previousMetrics ? 
      this.calculateRate(guest.diskread, previousMetrics.metrics.disk?.readRate || 0, timestamp, previousMetrics.timestamp) : 
      0;
    
    const diskWriteRate = previousMetrics ? 
      this.calculateRate(guest.diskwrite, previousMetrics.metrics.disk?.writeRate || 0, timestamp, previousMetrics.timestamp) : 
      0;
    
    // Create metrics object
    const metrics: MetricsData = {
      timestamp,
      nodeId,
      guestId,
      type,
      metrics: {
        // ProxMox returns CPU as a decimal (e.g., 0.0854 for 8.54%)
        // We need to multiply by 100 to get the percentage
        cpu: guest.cpu !== undefined ? guest.cpu * 100 : (guest.cpus > 0 ? 0 : 0),
        memory: {
          total: guest.maxmem,
          used: guest.memory,
          usedPercentage: guest.maxmem > 0 ? (guest.memory / guest.maxmem) * 100 : 0
        },
        network: {
          in: guest.netin,
          out: guest.netout,
          inRate: smoothedNetworkRates.inRate,
          outRate: smoothedNetworkRates.outRate
        },
        disk: {
          total: guest.maxdisk,
          used: guest.disk,
          usedPercentage: guest.maxdisk > 0 ? (guest.disk / guest.maxdisk) * 100 : 0,
          readRate: diskReadRate,
          writeRate: diskWriteRate
        },
        uptime: guest.uptime,
        status: guest.status
      }
    };
    
    // Store last metrics
    this.lastMetrics.set(guestId, metrics);
    
    // Add to history
    this.addToHistory(guestId, metrics);
    
    // Emit metrics update event
    this.emit('metricsUpdated', metrics);
  }

  /**
   * Apply moving average to network rates to smooth out fluctuations
   */
  private applyMovingAverage(guestId: string, inRate: number, outRate: number): { inRate: number, outRate: number } {
    // Get or initialize the recent rates array for this guest
    if (!this.recentNetworkRates.has(guestId)) {
      this.recentNetworkRates.set(guestId, { 
        inRates: [inRate], 
        outRates: [outRate] 
      });
      return { inRate, outRate };
    }
    
    const rates = this.recentNetworkRates.get(guestId)!;
    
    // Add new rates to the arrays
    rates.inRates.push(inRate);
    rates.outRates.push(outRate);
    
    // Trim arrays to keep only the most recent samples
    if (rates.inRates.length > this.movingAverageSamples) {
      rates.inRates.shift();
    }
    if (rates.outRates.length > this.movingAverageSamples) {
      rates.outRates.shift();
    }
    
    // Calculate averages
    const smoothedInRate = rates.inRates.reduce((sum, rate) => sum + rate, 0) / rates.inRates.length;
    const smoothedOutRate = rates.outRates.reduce((sum, rate) => sum + rate, 0) / rates.outRates.length;
    
    // Update the stored rates
    this.recentNetworkRates.set(guestId, rates);
    
    this.logger.debug(`Network rates for ${guestId}: Raw in=${inRate.toFixed(2)}, Smoothed in=${smoothedInRate.toFixed(2)}, Raw out=${outRate.toFixed(2)}, Smoothed out=${smoothedOutRate.toFixed(2)}`);
    
    return { inRate: smoothedInRate, outRate: smoothedOutRate };
  }

  /**
   * Calculate rate between two values
   */
  private calculateRate(currentValue: number, previousValue: number, currentTime: number, previousTime: number): number {
    if (currentTime === previousTime) return 0;
    if (currentValue < previousValue) return 0; // Counter reset
    
    const timeDiff = (currentTime - previousTime) / 1000; // Convert to seconds
    return (currentValue - previousValue) / timeDiff;
  }

  /**
   * Add metrics to history
   */
  private addToHistory(id: string, metrics: MetricsData): void {
    // Get existing history or create new array
    const history = this.metricsHistory.get(id) || [];
    
    // Add new metrics
    history.push(metrics);
    
    // Trim history if needed
    if (history.length > this.historyMaxLength) {
      history.shift();
    }
    
    // Update history
    this.metricsHistory.set(id, history);
  }

  /**
   * Get current metrics for a node or guest
   */
  getCurrentMetrics(id: string): MetricsData | undefined {
    return this.lastMetrics.get(id);
  }

  /**
   * Get metrics history for a node or guest
   */
  getMetricsHistory(id: string): MetricsData[] {
    return this.metricsHistory.get(id) || [];
  }

  /**
   * Get all current metrics
   */
  getAllCurrentMetrics(): MetricsData[] {
    return Array.from(this.lastMetrics.values());
  }

  /**
   * Get metrics for all nodes
   */
  getNodeMetrics(): MetricsData[] {
    return Array.from(this.lastMetrics.values())
      .filter(metrics => metrics.type === 'node');
  }

  /**
   * Get metrics for all guests
   */
  getGuestMetrics(): MetricsData[] {
    return Array.from(this.lastMetrics.values())
      .filter(metrics => metrics.type === 'vm' || metrics.type === 'container');
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.metricsHistory.clear();
    this.recentNetworkRates.clear();
    this.logger.info('Metrics history cleared');
  }
}

// Export singleton instance
export const metricsService = new MetricsService(); 