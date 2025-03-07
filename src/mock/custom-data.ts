/**
 * Custom Mock Data for Screenshots
 * 
 * This file contains custom mock data for generating screenshots.
 * It provides a consistent set of data with different guests for each node.
 */

export const customMockData = {
  nodes: [
    {
      id: 'node-1',
      name: 'pve-1',
      status: 'online',
      cpu: { usage: 0.45, cores: 8 },
      memory: { used: 8589934592, total: 17179869184 },
      guests: [
        { id: 'node1-vm1', name: 'ubuntu-vm', type: 'vm', status: 'running', cpu: 0.32, memory: 2147483648, node: 'node-1' },
        { id: 'node1-vm2', name: 'debian-vm', type: 'vm', status: 'stopped', cpu: 0, memory: 4294967296, node: 'node-1' },
        { id: 'node1-ct1', name: 'alpine-ct', type: 'ct', status: 'running', cpu: 0.12, memory: 1073741824, node: 'node-1' },
        { id: 'node1-ct2', name: 'nginx-ct', type: 'ct', status: 'paused', cpu: 0, memory: 536870912, node: 'node-1' }
      ]
    },
    {
      id: 'node-2',
      name: 'pve-2',
      status: 'online',
      cpu: { usage: 0.28, cores: 4 },
      memory: { used: 4294967296, total: 8589934592 },
      guests: [
        { id: 'node2-vm1', name: 'debian-vm', type: 'vm', status: 'running', cpu: 0.18, memory: 3221225472, node: 'node-2' },
        { id: 'node2-vm2', name: 'ubuntu-vm', type: 'vm', status: 'stopped', cpu: 0, memory: 2147483648, node: 'node-2' },
        { id: 'node2-ct1', name: 'fedora-ct', type: 'ct', status: 'stopped', cpu: 0, memory: 536870912, node: 'node-2' },
        { id: 'node2-ct2', name: 'redis-ct', type: 'ct', status: 'running', cpu: 0.22, memory: 1073741824, node: 'node-2' }
      ]
    },
    {
      id: 'node-3',
      name: 'pve-3',
      status: 'online',
      cpu: { usage: 0.65, cores: 16 },
      memory: { used: 12884901888, total: 34359738368 },
      guests: [
        { id: 'node3-vm1', name: 'windows-vm', type: 'vm', status: 'running', cpu: 0.45, memory: 8589934592, node: 'node-3' },
        { id: 'node3-vm2', name: 'centos-vm', type: 'vm', status: 'paused', cpu: 0, memory: 4294967296, node: 'node-3' },
        { id: 'node3-vm3', name: 'fedora-vm', type: 'vm', status: 'stopped', cpu: 0, memory: 6442450944, node: 'node-3' },
        { id: 'node3-ct1', name: 'ubuntu-ct', type: 'ct', status: 'running', cpu: 0.05, memory: 1073741824, node: 'node-3' },
        { id: 'node3-ct2', name: 'postgres-ct', type: 'ct', status: 'running', cpu: 0.15, memory: 2147483648, node: 'node-3' }
      ]
    }
  ]
}; 