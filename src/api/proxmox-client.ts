import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import https from 'https';
import { createLogger } from '../utils/logger';
import { NodeConfig, ProxmoxNodeStatus, ProxmoxVM, ProxmoxContainer, ProxmoxEvent } from '../types';
import { formatSafeTokenId } from '../utils/config-validator';
import config from '../config';

export class ProxmoxClient {
  private client: AxiosInstance;
  private config: NodeConfig;
  private logger: ReturnType<typeof createLogger>;
  private eventLastTimestamp: number = 0;
  private nodeName: string = '';

  constructor(config: NodeConfig, ignoreSSLErrors: boolean = false) {
    this.config = config;
    this.logger = createLogger('ProxmoxClient', config.id);

    // Create axios instance with base configuration
    const axiosConfig: AxiosRequestConfig = {
      baseURL: `${config.host}/api2/json`,
      headers: {
        // Use the safe token ID format to handle special characters
        'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`
      },
      timeout: 10000
    };

    // Add SSL certificate validation bypass if needed
    if (ignoreSSLErrors) {
      axiosConfig.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
      this.logger.warn('SSL certificate validation is disabled. This is not recommended for production.');
    }

    this.client = axios.create(axiosConfig);

    // Add request interceptor for logging
    this.client.interceptors.request.use(request => {
      this.logger.debug(`API Request: ${request.method?.toUpperCase()} ${request.url}`, { 
        params: request.params 
      });
      return request;
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      response => {
        this.logger.debug(`API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, { 
          data: response.data 
        });
        return response;
      },
      error => {
        if (error.response) {
          this.logger.error(`API Error: ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, { 
            data: error.response.data 
          });
        } else {
          this.logger.error(`API Error: ${error.message}`, { error });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Discover the actual ProxMox node name
   */
  async discoverNodeName(): Promise<string> {
    // If we already discovered the node name, return it
    if (this.nodeName) {
      return this.nodeName;
    }

    try {
      // Get the list of nodes from the API
      const response = await this.client.get('/nodes');
      
      if (response.data && response.data.data) {
        const nodes = response.data.data;
        const ipAddress = this.extractIpAddress(this.config.host);
        
        // Try to find a node that matches our IP address
        const matchingNode = nodes.find((node: any) => {
          // Try to match by IP address if available in the API response
          if (node.ip && node.ip === ipAddress) {
            return true;
          }
          
          // Otherwise, try to match by node ID or name
          return node.id === this.config.id || node.name === this.config.name;
        });
        
        if (matchingNode) {
          this.nodeName = matchingNode.node;
          this.logger.info(`Discovered node name: ${this.nodeName}`);
          return this.nodeName;
        }
        
        // If we can't find a direct match, try to access each node's status endpoint
        for (const node of nodes) {
          try {
            await this.client.get(`/nodes/${node.node}/status`);
            this.nodeName = node.node;
            this.logger.info(`Discovered node name by status check: ${this.nodeName}`);
            return this.nodeName;
          } catch (error) {
            // This node is not accessible to us, try the next one
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to discover node name from API', { error });
    }
    
    // Fallback to the old method if we can't discover the node name
    return this.getNodeName();
  }

  /**
   * Extract IP address from host URL
   */
  private extractIpAddress(host: string): string {
    try {
      const url = new URL(host);
      return url.hostname;
    } catch (error) {
      this.logger.error('Failed to extract IP address from host', { host, error });
      return host;
    }
  }

  /**
   * Get the node name, discovering it if necessary
   */
  private async getNodeNameAsync(): Promise<string> {
    if (!this.nodeName) {
      this.nodeName = await this.discoverNodeName();
    }
    return this.nodeName;
  }

  /**
   * Get node name (legacy method, will be deprecated)
   */
  private getNodeName(): string {
    // In ProxMox, the node name is typically the hostname of the server
    // We'll try to get it from the API, but for now use a hardcoded value based on the node ID
    // This assumes your node IDs in the config match the actual ProxMox node names
    if (this.config.id === 'node-1') {
      return 'pve';  // Typical default name for the first node in a ProxMox cluster
    } else if (this.config.id === 'node-2') {
      return 'pve2'; // Typical name for the second node
    }
    
    // Fallback to the old method if we can't determine the node name
    const url = new URL(this.config.host);
    return url.hostname;
  }

  /**
   * Get node status information
   */
  async getNodeStatus(): Promise<ProxmoxNodeStatus> {
    try {
      this.logger.debug('Getting node status...');
      const nodeName = await this.getNodeNameAsync();
      this.logger.debug(`Using node name: ${nodeName}`);
      
      const response = await this.client.get(`/nodes/${nodeName}/status`);
      this.logger.debug('Node status response received', { status: response.status });
      const data = response.data.data;
      
      return {
        id: this.config.id,
        name: this.config.name,
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
        name: this.config.name,
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

  /**
   * Get all virtual machines for the node
   */
  async getVirtualMachines(): Promise<ProxmoxVM[]> {
    try {
      const nodeName = await this.getNodeNameAsync();
      const response = await this.client.get(`/nodes/${nodeName}/qemu`);
      const vms = response.data.data || [];
      
      return vms.map((vm: any) => ({
        id: `${this.config.id}-vm-${vm.vmid}`,
        name: vm.name,
        status: vm.status,
        node: this.config.id,
        vmid: vm.vmid,
        cpus: vm.cpus,
        memory: vm.mem,
        maxmem: vm.maxmem,
        disk: vm.disk,
        maxdisk: vm.maxdisk,
        uptime: vm.uptime || 0,
        netin: vm.netin || 0,
        netout: vm.netout || 0,
        diskread: vm.diskread || 0,
        diskwrite: vm.diskwrite || 0,
        template: vm.template === 1,
        type: 'qemu'
      }));
    } catch (error) {
      this.logger.error('Failed to get virtual machines', { error });
      throw error;
    }
  }

  /**
   * Get all containers for the node
   */
  async getContainers(): Promise<ProxmoxContainer[]> {
    try {
      const nodeName = await this.getNodeNameAsync();
      const response = await this.client.get(`/nodes/${nodeName}/lxc`);
      const containers = response.data.data || [];
      
      return containers.map((container: any) => ({
        id: `${this.config.id}-ct-${container.vmid}`,
        name: container.name,
        status: container.status,
        node: this.config.id,
        vmid: container.vmid,
        cpus: container.cpus,
        memory: container.mem,
        maxmem: container.maxmem,
        disk: container.disk,
        maxdisk: container.maxdisk,
        uptime: container.uptime || 0,
        netin: container.netin || 0,
        netout: container.netout || 0,
        diskread: container.diskread || 0,
        diskwrite: container.diskwrite || 0,
        template: container.template === 1,
        type: 'lxc'
      }));
    } catch (error) {
      this.logger.error('Failed to get containers', { error });
      throw error;
    }
  }

  /**
   * Get VM or container resource usage
   */
  async getGuestResourceUsage(type: 'qemu' | 'lxc', vmid: number) {
    try {
      const nodeName = await this.getNodeNameAsync();
      const response = await this.client.get(`/nodes/${nodeName}/${type}/${vmid}/status/current`);
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to get ${type} resource usage for VMID ${vmid}`, { error });
      throw error;
    }
  }

  /**
   * Subscribe to events
   */
  async subscribeToEvents(callback: (event: ProxmoxEvent) => void): Promise<() => void> {
    // Get the last event timestamp if we don't have one
    if (!this.eventLastTimestamp) {
      try {
        const nodeName = await this.getNodeNameAsync();
        const response = await this.client.get(`/nodes/${nodeName}/tasks`);
        const tasks = response.data.data || [];
        if (tasks.length > 0) {
          this.eventLastTimestamp = Math.floor(tasks[0].starttime);
        } else {
          this.eventLastTimestamp = Math.floor(Date.now() / 1000);
        }
      } catch (error) {
        this.logger.error('Failed to get initial event timestamp', { error });
        this.eventLastTimestamp = Math.floor(Date.now() / 1000);
      }
    }

    // Set up polling interval - this is a fallback method
    // ProxMox doesn't have a true WebSocket event API, but we can optimize our polling
    // to be more responsive and efficient
    
    let isPolling = false;
    let currentPollingInterval = config.eventPollingIntervalMs;
    let lastEventTime = Date.now();
    let consecutiveEmptyPolls = 0;
    
    this.logger.info(`Setting up event polling with base interval: ${config.eventPollingIntervalMs}ms`);
    
    // Function to perform the actual polling
    const pollForEvents = async () => {
      if (isPolling) return;
      
      isPolling = true;
      try {
        const nodeName = await this.getNodeNameAsync();
        const response = await this.client.get(`/nodes/${nodeName}/tasks`, {
          params: {
            start: this.eventLastTimestamp + 1,
            limit: 50
          }
        });
        
        const events = response.data.data || [];
        
        // Adaptive polling logic
        if (events.length > 0) {
          // Activity detected - increase polling frequency temporarily
          lastEventTime = Date.now();
          consecutiveEmptyPolls = 0;
          
          // Update the last timestamp
          this.eventLastTimestamp = Math.max(
            this.eventLastTimestamp,
            ...events.map((e: any) => Math.floor(e.starttime))
          );
          
          // Process events
          events.forEach((event: any) => {
            callback({
              id: event.upid,
              node: this.config.id,
              type: this.determineEventType(event),
              eventTime: Math.floor(event.starttime * 1000),
              user: event.user,
              description: event.status || event.type,
              details: {
                type: event.type,
                status: event.status,
                vmid: event.vmid
              }
            });
          });
          
          // If we received events, poll again very quickly to get any follow-up events
          // This makes the system much more responsive when events are occurring
          setTimeout(pollForEvents, 500); // Quick follow-up poll after 500ms
        } else {
          // No events - track consecutive empty polls
          consecutiveEmptyPolls++;
          
          // If there was recent activity (within 10 seconds), keep polling more frequently
          const timeSinceLastEvent = Date.now() - lastEventTime;
          if (timeSinceLastEvent < 10000) {
            // Recent activity - poll again quickly
            setTimeout(pollForEvents, Math.min(1000, currentPollingInterval));
          }
        }
      } catch (error) {
        this.logger.error('Failed to poll for events', { error });
      } finally {
        isPolling = false;
      }
    };
    
    // Initial poll
    pollForEvents();
    
    // Regular polling interval as a fallback
    const intervalId = setInterval(pollForEvents, currentPollingInterval);

    // Return a function to unsubscribe
    return () => {
      clearInterval(intervalId);
    };
  }

  /**
   * Test the connection to the ProxMox API
   */
  async testConnection(): Promise<boolean> {
    try {
      // First try to discover the node name
      const nodeName = await this.discoverNodeName();
      
      // Then try to access the node's status endpoint
      await this.client.get(`/nodes/${nodeName}/status`);
      
      this.logger.info('Connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Connection test failed', { error });
      return false;
    }
  }

  /**
   * Determine the event type based on the event data
   */
  private determineEventType(event: any): 'node' | 'vm' | 'container' | 'storage' | 'pool' {
    if (event.type.startsWith('qemu')) {
      return 'vm';
    } else if (event.type.startsWith('lxc')) {
      return 'container';
    } else if (event.type.startsWith('storage')) {
      return 'storage';
    } else if (event.type.startsWith('pool')) {
      return 'pool';
    } else {
      return 'node';
    }
  }
} 