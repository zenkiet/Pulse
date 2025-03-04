/**
 * Mock Data Templates
 * 
 * This file contains templates for generating mock data for the Pulse application.
 * These templates are used by both the mock client and the mock data server.
 */

/**
 * VM templates with names and OS combinations
 */
export const vmTemplates = [
  { name: "ubuntu-web", os: "ubuntu" },
  { name: "debian-db", os: "debian" },
  { name: "centos-app", os: "centos" },
  { name: "windows-ad", os: "windows" },
  { name: "fedora-dev", os: "fedora" },
  { name: "arch-build", os: "arch" },
  { name: "windows-rdp", os: "windows" },
  { name: "ubuntu-mail", os: "ubuntu" },
  { name: "debian-proxy", os: "debian" },
  { name: "centos-monitor", os: "centos" }
];

/**
 * Container templates with names and OS combinations
 */
export const containerTemplates = [
  { name: "nginx-proxy", os: "alpine" },
  { name: "postgres-db", os: "debian" },
  { name: "redis-cache", os: "alpine" },
  { name: "nodejs-api", os: "debian" },
  { name: "python-worker", os: "alpine" },
  { name: "php-app", os: "debian" },
  { name: "mariadb-db", os: "debian" },
  { name: "mongodb-db", os: "debian" },
  { name: "haproxy-lb", os: "alpine" },
  { name: "elasticsearch", os: "debian" }
];

/**
 * Helper function to get a random status for VMs
 */
export function getRandomVMStatus(): 'running' | 'stopped' | 'paused' {
  const statuses: Array<'running' | 'stopped' | 'paused'> = ['running', 'stopped', 'paused'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

/**
 * Helper function to get a random status for containers
 */
export function getRandomContainerStatus(): 'running' | 'stopped' | 'paused' | 'unknown' {
  const statuses: Array<'running' | 'stopped' | 'paused' | 'unknown'> = ['running', 'stopped', 'paused', 'unknown'];
  return statuses[Math.floor(Math.random() * statuses.length)];
} 