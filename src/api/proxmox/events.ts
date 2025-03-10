import { ProxmoxClient } from './index';
import { ProxmoxEvent } from '../../types';
import config from '../../config';

/**
 * Subscribe to events
 */
export async function subscribeToEvents(this: ProxmoxClient, callback: (event: ProxmoxEvent) => void): Promise<() => void> {
  // Get the last event timestamp if we don't have one
  if (!this.eventLastTimestamp) {
    try {
      const nodeName = await this.getNodeNameAsync();
      
      if (!this.client) {
        throw new Error('Client is not initialized');
      }
      
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
  // Proxmox doesn't have a true WebSocket event API, but we can optimize our polling
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
      
      if (!this.client) {
        throw new Error('Client is not initialized');
      }
      
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
 * Determine the event type based on the event data
 */
export function determineEventType(this: ProxmoxClient, event: any): 'node' | 'vm' | 'container' | 'storage' | 'pool' {
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
export function setupEventPolling(this: ProxmoxClient): void {
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