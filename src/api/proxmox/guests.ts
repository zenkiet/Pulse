import { ProxmoxClient } from './index';
import { ProxmoxVM, ProxmoxContainer } from '../../types';

/**
 * Get all virtual machines for the node
 */
export async function getVirtualMachines(this: ProxmoxClient): Promise<ProxmoxVM[]> {
  try {
    const nodeName = await this.getNodeNameAsync();
    
    if (!this.client) {
      throw new Error('Client is not initialized');
    }
    
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
export async function getContainers(this: ProxmoxClient): Promise<ProxmoxContainer[]> {
  try {
    const nodeName = await this.getNodeNameAsync();
    
    if (!this.client) {
      throw new Error('Client is not initialized');
    }
    
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
          if (!this.client) {
            throw new Error('Client is not initialized');
          }
          
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
            // Do NOT multiply by 100 - use the raw value from Proxmox
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
export async function getGuestResourceUsage(this: ProxmoxClient, type: 'qemu' | 'lxc', vmid: number): Promise<any> {
  try {
    const nodeName = await this.getNodeNameAsync();
    
    if (!this.client) {
      throw new Error('Client is not initialized');
    }
    
    const response = await this.client.get(`/nodes/${nodeName}/${type}/${vmid}/status/current`);
    return response.data.data;
  } catch (error) {
    this.logger.error(`Failed to get ${type} resource usage for VMID ${vmid}`, { error });
    throw error;
  }
} 