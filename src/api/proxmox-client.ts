import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { NodeConfig, ProxmoxNodeStatus, ProxmoxVM, ProxmoxContainer, ProxmoxEvent } from '../types';
import { formatSafeTokenId } from '../utils/config-validator';
import { formatBytes, bytesToMB, mbToBytes } from '../utils/format';
import config from '../config';
import winston from 'winston';

export class ProxmoxClient extends EventEmitter {
  private config: NodeConfig;
  private logger: winston.Logger;
  private client: AxiosInstance | null = null;
  private retryAttempts: number = 3;
  private retryDelayMs: number = 5000;
  private eventLastTimestamp = 0;
  private isMockData: boolean = false;
  private nodeName = '';

  constructor(config: NodeConfig, ignoreSSLErrors: boolean = false) {
    super();
    this.config = config;
    this.logger = createLogger('ProxmoxClient', config.id);
    
    // Check if this is a mock data client
    this.isMockData = process.env.USE_MOCK_DATA === 'true' || process.env.MOCK_DATA_ENABLED === 'true';
    
    if (this.isMockData) {
      this.logger.info('Mock data mode enabled. Using mock data server.');
    } else {
      // Get timeout from environment variable or use default
      const apiTimeoutMs = parseInt(process.env.API_TIMEOUT_MS || '60000', 10);
      this.retryAttempts = parseInt(process.env.API_RETRY_ATTEMPTS || '3', 10);
      this.retryDelayMs = parseInt(process.env.API_RETRY_DELAY_MS || '5000', 10);
      
      // Create axios instance with base configuration
      const axiosConfig = {
        baseURL: `${config.host}/api2/json`,
        headers: {
          Authorization: `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`
        },
        timeout: apiTimeoutMs,
        httpsAgent: new https.Agent({
          rejectUnauthorized: !ignoreSSLErrors
        })
      };
      
      this.client = axios.create(axiosConfig);
      this.logger.info(`ProxMox API client created with timeout: ${apiTimeoutMs}ms and ${this.retryAttempts} retry attempts`);

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
        async error => {
          if (error.response) {
            this.logger.error(`API Error: ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, { 
              data: error.response.data 
            });
          } else {
            this.logger.error(`API Error: ${error.message}`, { error });
          }
          
          // Implement retry logic for network errors and timeouts
          const config = error.config;
          
          // Only retry on network errors or timeouts, not on 4xx or 5xx responses
          if (!error.response && config && (!config.retryCount || config.retryCount < this.retryAttempts)) {
            config.retryCount = config.retryCount || 0;
            config.retryCount++;
            
            this.logger.warn(`Retrying request (attempt ${config.retryCount}/${this.retryAttempts}): ${config.method?.toUpperCase()} ${config.url}`);
            
            // Use configured retry delay instead of exponential backoff
            const delay = this.retryDelayMs;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            return this.client(config);
          }
          
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * Discover the actual ProxMox node name
   */
  async discoverNodeName(): Promise<string> {
    // If we already discovered the node name, return it
    if (this.nodeName) {
      return this.nodeName;
    }

    if (!this.client) {
      this.logger.error('Client is not initialized');
      return this.getNodeName();
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
            if (this.client) {
              await this.client.get(`/nodes/${node.node}/status`);
              this.nodeName = node.node;
              this.logger.info(`Discovered node name by status check: ${this.nodeName}`);
              return this.nodeName;
            }
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

  /**
   * Get all virtual machines for the node
   */
  async getVirtualMachines(): Promise<ProxmoxVM[]> {
    try {
      const nodeName = await this.getNodeNameAsync();
      const response = await this.client.get(`/nodes/${nodeName}/qemu`);
      const vms = response.data.data || [];
      
      // Create an array of promises to fetch detailed resource usage for each VM
      const vmPromises = vms.map(async (vm: any) => {
        try {
          // Get detailed resource usage for this VM
          const resourceData = await this.getGuestResourceUsage('qemu', vm.vmid);
          
          // Use memory values from resource data if available, otherwise fall back to VM data
          const memory = resourceData.mem !== undefined ? resourceData.mem : vm.mem;
          const maxmem = resourceData.maxmem !== undefined ? resourceData.maxmem : vm.maxmem;
          
          // Use disk values from resource data if available
          const disk = resourceData.disk !== undefined ? resourceData.disk : vm.disk;
          const maxdisk = resourceData.maxdisk !== undefined ? resourceData.maxdisk : vm.maxdisk;
          
          return {
            id: `${this.config.id}-vm-${vm.vmid}`,
            name: vm.name,
            status: vm.status,
            node: this.config.id,
            vmid: vm.vmid,
            cpus: vm.cpus,
            cpu: resourceData.cpu,
            memory: memory,
            maxmem: maxmem,
            disk: disk,
            maxdisk: maxdisk,
            uptime: vm.uptime || 0,
            netin: resourceData.netin || vm.netin || 0,
            netout: resourceData.netout || vm.netout || 0,
            diskread: resourceData.diskread || vm.diskread || 0,
            diskwrite: resourceData.diskwrite || vm.diskwrite || 0,
            template: vm.template === 1,
            type: 'qemu'
          } as ProxmoxVM;
        } catch (error) {
          // If we fail to get detailed resource usage, just return basic VM data
          this.logger.warn(`Failed to get detailed resource usage for VM ${vm.vmid}`, { error });
          
          return {
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
          } as ProxmoxVM;
        }
      });
      
      // Wait for all VM resource data to be fetched
      return await Promise.all(vmPromises);
    } catch (error) {
      this.logger.error('Failed to get virtual machines', { error });
      throw error;
    }
  }

  /**
   * Get all containers on the node with optimized polling
   */
  async getContainers(): Promise<ProxmoxContainer[]> {
    try {
      const nodeName = await this.getNodeNameAsync();
      
      // First, get the list of all containers
      const response = await this.client.get(`/nodes/${nodeName}/lxc`);
      const containers = response.data.data || [];
      
      // Create a batch of promises to get container status
      // We'll process them in smaller batches to avoid overwhelming the API
      const batchSize = 3; // Process 3 containers at a time
      const results: ProxmoxContainer[] = [];
      
      // Process containers in batches
      for (let i = 0; i < containers.length; i += batchSize) {
        const batch = containers.slice(i, i + batchSize);
        const batchPromises = batch.map(async (container: any) => {
          try {
            // Get the container status first
            const statusResponse = await this.client.get(`/nodes/${nodeName}/lxc/${container.vmid}/status/current`);
            const status = statusResponse.data.data;
            
            // Log the raw status data for debugging
            this.logger.debug(`Raw container status for ${container.vmid}:`, { status });
            
            // Get detailed resource usage for this container
            let resourceData = { cpu: 0, netin: 0, netout: 0, diskread: 0, diskwrite: 0 };
            try {
              resourceData = await this.getGuestResourceUsage('lxc', container.vmid);
              // Log the raw resource data for debugging
              this.logger.debug(`Raw resource data for container ${container.vmid}:`, { resourceData });
            } catch (error) {
              this.logger.warn(`Failed to get detailed resource usage for Container ${container.vmid}`, { error });
            }
            
            // Use fallback values from status if resource data is missing or zero
            return {
              id: `${this.config.id}-ct-${container.vmid}`,
              name: container.name,
              status: status.status,
              node: this.config.id,
              vmid: container.vmid,
              cpus: status.cpus || container.cpus || 1,
              // Use CPU usage from detailed resource data or fallback to status
              // Do NOT multiply by 100 - use the raw value from ProxMox
              cpu: (resourceData.cpu !== undefined && resourceData.cpu !== null) ? 
                   resourceData.cpu : 
                   (status.cpu !== undefined && status.cpu !== null) ? 
                   status.cpu : 0,
              memory: status.mem || 0,
              maxmem: status.maxmem || container.maxmem || 0,
              disk: status.disk || 0,
              maxdisk: status.maxdisk || container.maxdisk || 0,
              uptime: status.uptime || 0,
              netin: resourceData.netin || status.netin || 0,
              netout: resourceData.netout || status.netout || 0,
              diskread: resourceData.diskread || status.diskread || 0,
              diskwrite: resourceData.diskwrite || status.diskwrite || 0,
              template: container.template === 1,
              type: 'lxc'
            } as ProxmoxContainer;
          } catch (error) {
            this.logger.error(`Failed to get status for container ${container.vmid}`, { error });
            // Return a basic container object with limited information
            return {
              id: `${this.config.id}-ct-${container.vmid}`,
              name: container.name,
              status: container.status,
              node: this.config.id,
              vmid: container.vmid,
              cpus: container.cpus || 1,
              memory: container.mem || 0,
              maxmem: container.maxmem || 0,
              disk: container.disk || 0,
              maxdisk: container.maxdisk || 0,
              uptime: 0,
              netin: 0,
              netout: 0,
              diskread: 0,
              diskwrite: 0,
              template: container.template === 1,
              type: 'lxc'
            } as ProxmoxContainer;
          }
        });
        
        // Wait for this batch to complete before moving to the next
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add a small delay between batches to avoid overwhelming the API
        if (i + batchSize < containers.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return results;
    } catch (error) {
      this.logger.error('Failed to get containers', { error });
      return [];
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

  /**
   * Set up event polling
   */
  setupEventPolling(): void {
    // Use the existing subscribeToEvents method to set up polling
    if (this.isMockData) {
      this.logger.info('Mock data mode enabled, skipping event polling setup');
      return;
    }
    
    this.subscribeToEvents((event: ProxmoxEvent) => {
      this.emit('event', event);
    }).catch(error => {
      this.logger.error('Failed to set up event polling', { error });
    });
    
    // Set up periodic polling for node status, VMs, and containers
    setInterval(async () => {
      try {
        if (this.client) {
          const status = await this.getNodeStatus();
          this.emit('nodeStatus', status);
          
          const vms = await this.getVirtualMachines();
          this.emit('vmList', vms);
          
          const containers = await this.getContainers();
          this.emit('containerList', containers);
        }
      } catch (error) {
        this.logger.error('Error during periodic polling', { error });
      }
    }, config.nodePollingIntervalMs || 30000);
  }
} 