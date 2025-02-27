import { EventEmitter } from 'events';
import { ProxmoxClient } from '../api/proxmox-client';
import { createLogger } from '../utils/logger';
import config from '../config';
import { NodeConfig, ProxmoxNodeStatus, ProxmoxVM, ProxmoxContainer, ProxmoxGuest, ProxmoxEvent } from '../types';

export class NodeManager extends EventEmitter {
  private nodes: Map<string, ProxmoxClient> = new Map();
  private nodeStatus: Map<string, ProxmoxNodeStatus> = new Map();
  private vms: Map<string, ProxmoxVM> = new Map();
  private containers: Map<string, ProxmoxContainer> = new Map();
  private eventUnsubscribers: Map<string, () => void> = new Map();
  private logger = createLogger('NodeManager');
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger.info('Initializing NodeManager');
    this.initializeNodes();
  }

  /**
   * Initialize nodes from configuration
   */
  private async initializeNodes(): Promise<void> {
    // Add all nodes from configuration
    for (const nodeConfig of config.nodes) {
      try {
        await this.addNode(nodeConfig);
      } catch (error) {
        this.logger.error(`Failed to initialize node ${nodeConfig.name}`, { error });
      }
    }

    // Start polling for updates
    this.startPolling();
  }

  /**
   * Add a new node
   */
  async addNode(nodeConfig: NodeConfig): Promise<boolean> {
    try {
      this.logger.info(`Adding node: ${nodeConfig.name} (${nodeConfig.host})`);
      
      // Create ProxMox client
      const client = new ProxmoxClient(nodeConfig, config.ignoreSSLErrors);
      
      // Test connection
      const connected = await client.testConnection();
      if (!connected) {
        this.logger.error(`Failed to connect to node: ${nodeConfig.name}`);
        return false;
      }
      
      // Add to nodes map
      this.nodes.set(nodeConfig.id, client);
      
      // Subscribe to events
      const unsubscribe = await client.subscribeToEvents(this.handleEvent.bind(this));
      this.eventUnsubscribers.set(nodeConfig.id, unsubscribe);
      
      // Fetch initial data
      await this.refreshNodeData(nodeConfig.id);
      
      this.logger.info(`Node added successfully: ${nodeConfig.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Error adding node: ${nodeConfig.name}`, { error });
      return false;
    }
  }

  /**
   * Remove a node
   */
  removeNode(nodeId: string): boolean {
    try {
      this.logger.info(`Removing node: ${nodeId}`);
      
      // Unsubscribe from events
      const unsubscribe = this.eventUnsubscribers.get(nodeId);
      if (unsubscribe) {
        unsubscribe();
        this.eventUnsubscribers.delete(nodeId);
      }
      
      // Remove from nodes map
      this.nodes.delete(nodeId);
      
      // Remove node status
      this.nodeStatus.delete(nodeId);
      
      // Remove VMs and containers for this node
      for (const [vmId, vm] of this.vms.entries()) {
        if (vm.node === nodeId) {
          this.vms.delete(vmId);
        }
      }
      
      for (const [containerId, container] of this.containers.entries()) {
        if (container.node === nodeId) {
          this.containers.delete(containerId);
        }
      }
      
      this.logger.info(`Node removed successfully: ${nodeId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error removing node: ${nodeId}`, { error });
      return false;
    }
  }

  /**
   * Start polling for updates
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.logger.info(`Starting polling for node updates (interval: ${config.nodePollingIntervalMs}ms)`);
    
    // Use the configurable polling interval from config
    this.pollingInterval = setInterval(async () => {
      for (const nodeId of this.nodes.keys()) {
        try {
          await this.refreshNodeData(nodeId);
        } catch (error) {
          this.logger.error(`Error polling node: ${nodeId}`, { error });
        }
      }
    }, config.nodePollingIntervalMs);
  }

  /**
   * Stop polling for updates
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logger.info('Polling stopped');
    }
  }

  /**
   * Refresh data for a specific node
   */
  async refreshNodeData(nodeId: string): Promise<void> {
    const client = this.nodes.get(nodeId);
    if (!client) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    try {
      this.logger.debug(`Refreshing data for node: ${nodeId}`);
      
      // Get node status
      this.logger.debug(`Getting status for node: ${nodeId}`);
      const nodeStatus = await client.getNodeStatus();
      this.logger.debug(`Received status for node: ${nodeId}`, { status: nodeStatus.status });
      
      // Check if status changed
      const previousStatus = this.nodeStatus.get(nodeId);
      const statusChanged = !previousStatus || previousStatus.status !== nodeStatus.status;
      
      // Update node status
      this.nodeStatus.set(nodeId, nodeStatus);
      
      // Emit event if status changed
      if (statusChanged) {
        this.logger.debug(`Node status changed for ${nodeId}: ${previousStatus?.status || 'unknown'} -> ${nodeStatus.status}`);
        this.emit('nodeStatusChanged', nodeStatus);
      }
      
      // Only fetch VMs and containers if node is online
      if (nodeStatus.status === 'online') {
        // Get VMs
        this.logger.debug(`Getting VMs for node: ${nodeId}`);
        const vms = await client.getVirtualMachines();
        this.logger.debug(`Received ${vms.length} VMs for node: ${nodeId}`);
        
        // Update VMs
        for (const vm of vms) {
          const previousVM = this.vms.get(vm.id);
          const statusChanged = !previousVM || previousVM.status !== vm.status;
          
          this.vms.set(vm.id, vm);
          
          if (statusChanged) {
            this.logger.debug(`VM status changed for ${vm.id}: ${previousVM?.status || 'unknown'} -> ${vm.status}`);
            this.emit('guestStatusChanged', vm);
          }
        }
        
        // Get containers
        this.logger.debug(`Getting containers for node: ${nodeId}`);
        const containers = await client.getContainers();
        this.logger.debug(`Received ${containers.length} containers for node: ${nodeId}`);
        
        // Update containers
        for (const container of containers) {
          const previousContainer = this.containers.get(container.id);
          const statusChanged = !previousContainer || previousContainer.status !== container.status;
          
          this.containers.set(container.id, container);
          
          if (statusChanged) {
            this.logger.debug(`Container status changed for ${container.id}: ${previousContainer?.status || 'unknown'} -> ${container.status}`);
            this.emit('guestStatusChanged', container);
          }
        }
        
        // Emit metrics update event
        this.logger.debug(`Emitting metrics update for node: ${nodeId}`);
        this.emit('metricsUpdated', {
          nodeId,
          timestamp: Date.now(),
          nodeStatus,
          vms,
          containers
        });
      } else {
        this.logger.debug(`Node ${nodeId} is offline, skipping VM and container updates`);
      }
    } catch (error) {
      this.logger.error(`Error refreshing node data: ${nodeId}`, { error });
      throw error;
    }
  }

  /**
   * Handle event from ProxMox
   */
  private handleEvent(event: ProxmoxEvent): void {
    // Only process important events
    if (this.isImportantEvent(event)) {
      this.logger.debug(`Received important event: ${event.description}`, { event });
      
      // Emit event
      this.emit('event', event);
      
      // Refresh node data immediately if it's an important event
      // This makes the UI update much faster in response to events
      this.refreshNodeData(event.node).catch(error => {
        this.logger.error(`Error refreshing node after event: ${event.node}`, { error });
      });
    }
  }

  /**
   * Check if an event is important enough to trigger a refresh
   */
  private isImportantEvent(event: ProxmoxEvent): boolean {
    // VM or container status change events
    if (event.type === 'vm' || event.type === 'container') {
      const description = event.description.toLowerCase();
      return (
        description.includes('start') ||
        description.includes('stop') ||
        description.includes('shutdown') ||
        description.includes('reset') ||
        description.includes('resume') ||
        description.includes('suspend') ||
        description.includes('create') ||
        description.includes('delete') ||
        description.includes('migrate') ||
        description.includes('clone')
      );
    }
    
    // Also consider node events important
    if (event.type === 'node') {
      return true;
    }
    
    return false;
  }

  /**
   * Get all nodes
   */
  getNodes(): ProxmoxNodeStatus[] {
    return Array.from(this.nodeStatus.values());
  }

  /**
   * Get a specific node
   */
  getNode(nodeId: string): ProxmoxNodeStatus | undefined {
    return this.nodeStatus.get(nodeId);
  }

  /**
   * Get all VMs, optionally filtered by node
   */
  getVMs(nodeId?: string): ProxmoxVM[] {
    const vms = Array.from(this.vms.values());
    if (nodeId) {
      return vms.filter(vm => vm.node === nodeId);
    }
    return vms;
  }

  /**
   * Get a specific VM
   */
  getVM(vmId: string): ProxmoxVM | undefined {
    return this.vms.get(vmId);
  }

  /**
   * Get all containers, optionally filtered by node
   */
  getContainers(nodeId?: string): ProxmoxContainer[] {
    const containers = Array.from(this.containers.values());
    if (nodeId) {
      return containers.filter(container => container.node === nodeId);
    }
    return containers;
  }

  /**
   * Get a specific container
   */
  getContainer(containerId: string): ProxmoxContainer | undefined {
    return this.containers.get(containerId);
  }

  /**
   * Get all guests (VMs and containers), optionally filtered by node
   */
  getGuests(nodeId?: string): ProxmoxGuest[] {
    const vms = this.getVMs(nodeId);
    const containers = this.getContainers(nodeId);
    
    // Combine VMs and containers
    return [...vms, ...containers];
  }

  /**
   * Get a specific guest (VM or container)
   */
  getGuest(guestId: string): ProxmoxGuest | undefined {
    return this.vms.get(guestId) || this.containers.get(guestId);
  }

  /**
   * Shutdown the node manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down NodeManager');
    
    // Stop polling
    this.stopPolling();
    
    // Unsubscribe from all events
    for (const [nodeId, unsubscribe] of this.eventUnsubscribers.entries()) {
      this.logger.debug(`Unsubscribing from events for node: ${nodeId}`);
      unsubscribe();
    }
    
    this.eventUnsubscribers.clear();
    this.logger.info('NodeManager shutdown complete');
  }
}

// Export singleton instance
export const nodeManager = new NodeManager(); 