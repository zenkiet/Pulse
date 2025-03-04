// Custom mock data for screenshots
window.MOCK_DATA = {
  nodes: [
    {
      id: 'node-1',
      name: 'pve-1',
      status: 'online',
      cpu: { usage: 0.45, cores: 8 },
      memory: { used: 8589934592, total: 17179869184 },
      guests: [
        { id: 'node-1-vm-1', name: 'ubuntu-vm-1', type: 'vm', status: 'running', cpu: 0.32, memory: 2147483648 },
        { id: 'node-1-ct-1', name: 'alpine-ct-1', type: 'ct', status: 'running', cpu: 0.12, memory: 1073741824 }
      ]
    },
    {
      id: 'node-2',
      name: 'pve-2',
      status: 'online',
      cpu: { usage: 0.28, cores: 4 },
      memory: { used: 4294967296, total: 8589934592 },
      guests: [
        { id: 'node-2-vm-1', name: 'debian-vm-1', type: 'vm', status: 'running', cpu: 0.18, memory: 3221225472 },
        { id: 'node-2-ct-2', name: 'fedora-ct-1', type: 'ct', status: 'stopped', cpu: 0, memory: 536870912 }
      ]
    },
    {
      id: 'node-3',
      name: 'pve-3',
      status: 'online',
      cpu: { usage: 0.65, cores: 16 },
      memory: { used: 12884901888, total: 34359738368 },
      guests: [
        { id: 'node-3-vm-1', name: 'windows-vm-1', type: 'vm', status: 'running', cpu: 0.45, memory: 8589934592 },
        { id: 'node-3-vm-2', name: 'centos-vm-1', type: 'vm', status: 'running', cpu: 0.15, memory: 4294967296 },
        { id: 'node-3-ct-1', name: 'ubuntu-ct-1', type: 'ct', status: 'running', cpu: 0.05, memory: 1073741824 }
      ]
    }
  ]
}; 