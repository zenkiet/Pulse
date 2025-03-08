import { ProxmoxClient } from './index';
import { ProxmoxNodeStatus } from '../../types';

/**
 * Get node status information
 */
export async function getNodeStatus(this: ProxmoxClient): Promise<ProxmoxNodeStatus> {
  try {
    this.logger.debug('Getting node status...');
    const nodeName = await this.getNodeNameAsync();
    this.logger.debug(`Using node name: ${nodeName}`);
    
    if (!this.client) {
      throw new Error('Client is not initialized');
    }
    
    const response = await this.client.get(`/nodes/${nodeName}/status`);
    this.logger.debug('Node status response received', { status: response.status });
    const data = response.data.data;
    
    return {
      id: this.config.id,
      name: nodeName,
      configName: this.config.name,
      status: 'online', // If we get a successful response, the node is online
      uptime: data.uptime,
      cpu: data.cpu,
      memory: {
        total: data.memory.total,
        used: data.memory.used,
        free: data.memory.free,
        usedPercentage: (data.memory.used / data.memory.total) * 100
      },
      swap: {
        total: data.swap.total,
        used: data.swap.used,
        free: data.swap.free,
        usedPercentage: data.swap.total > 0 ? (data.swap.used / data.swap.total) * 100 : 0
      },
      disk: {
        total: data.rootfs.total,
        used: data.rootfs.used,
        free: data.rootfs.free,
        usedPercentage: (data.rootfs.used / data.rootfs.total) * 100
      },
      loadAverage: data.loadavg,
      cpuInfo: {
        cores: data.cpuinfo.cores,
        sockets: data.cpuinfo.sockets,
        model: data.cpuinfo.model
      }
    };
  } catch (error) {
    this.logger.error('Failed to get node status', { error });
    
    // Return offline status on error
    this.logger.debug('Returning offline status due to error');
    return {
      id: this.config.id,
      name: this.nodeName || this.config.name, // Use discovered node name if available, otherwise config name
      configName: this.config.name,
      status: 'offline',
      uptime: 0,
      cpu: 0,
      memory: {
        total: 0,
        used: 0,
        free: 0,
        usedPercentage: 0
      },
      swap: {
        total: 0,
        used: 0,
        free: 0,
        usedPercentage: 0
      },
      disk: {
        total: 0,
        used: 0,
        free: 0,
        usedPercentage: 0
      },
      loadAverage: [0, 0, 0],
      cpuInfo: {
        cores: 0,
        sockets: 0,
        model: 'Unknown'
      }
    };
  }
} 