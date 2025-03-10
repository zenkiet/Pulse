import { ProxmoxClient } from './index';

/**
 * Discover the actual Proxmox node name
 */
export async function discoverNodeName(this: ProxmoxClient): Promise<string> {
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
export function extractIpAddress(this: ProxmoxClient, host: string): string {
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
export async function getNodeNameAsync(this: ProxmoxClient): Promise<string> {
  if (!this.nodeName) {
    this.nodeName = await this.discoverNodeName();
  }
  return this.nodeName;
}

/**
 * Get node name (legacy method, will be deprecated)
 */
export function getNodeName(this: ProxmoxClient): string {
  // In Proxmox, the node name is typically the hostname of the server
  // This assumes your node IDs in the config match the actual Proxmox node names
  // If not found, return 'pve' which is the typical default name for the first node in a Proxmox cluster
  return 'pve';
} 