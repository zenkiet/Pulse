/**
 * ProxMox API Test Mock Generator
 * 
 * This script generates a mock test report with anonymized data
 * for documentation and development purposes.
 * 
 * It creates a report file in the reports directory that mimics
 * the structure of a real API test but with sanitized data.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define types
interface NodeConfig {
  id: string;
  name: string;
  host: string;
  tokenId: string;
  tokenSecret: string;
}

interface DiscoveredNode {
  id: string;
  name: string;
  nodeName: string;
  host: string;
  ipAddress: string;
}

interface TestResult {
  endpoint: string;
  success: boolean;
  responseTime: number;
  statusCode: number;
  data: any;
}

interface NodeTestResult {
  nodeConfig: NodeConfig;
  discoveredNode: DiscoveredNode;
  testResults: TestResult[];
  overallSuccess: boolean;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageResponseTime: number;
}

interface TestReport {
  timestamp: string;
  nodes: NodeTestResult[];
  overallSuccess: boolean;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageResponseTime: number;
}

// Generate random data helpers
const randomBetween = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1) + min);

const randomFloat = (min: number, max: number): number => 
  parseFloat((Math.random() * (max - min) + min).toFixed(2));

// Generate mock node status data
function generateNodeStatusData() {
  return {
    data: {
      memory: {
        free: randomBetween(8000000000, 12000000000),
        total: 16539889664,
        used: randomBetween(4000000000, 8000000000)
      },
      kversion: "Linux 6.8.12-8-pve #1 SMP PREEMPT_DYNAMIC PMX 6.8.12-8 (2025-01-24T12:32Z)",
      pveversion: "pve-manager/8.3.4/65224a0f9cd294a3",
      wait: randomFloat(0.0001, 0.001),
      rootfs: {
        free: randomBetween(20000000000, 30000000000),
        total: 33501757440,
        avail: randomBetween(20000000000, 25000000000),
        used: randomBetween(5000000000, 10000000000)
      },
      idle: 0,
      cpu: randomFloat(0.01, 0.1),
      ksm: {
        shared: 0
      },
      loadavg: [
        (randomFloat(0.01, 0.2)).toFixed(2),
        (randomFloat(0.1, 0.3)).toFixed(2),
        (randomFloat(0.1, 0.3)).toFixed(2)
      ],
      "current-kernel": {
        machine: "x86_64",
        sysname: "Linux",
        version: "#1 SMP PREEMPT_DYNAMIC PMX 6.8.12-8 (2025-01-24T12:32Z)",
        release: "6.8.12-8-pve"
      },
      swap: {
        used: randomBetween(1000000000, 3000000000),
        total: 8589930496,
        free: randomBetween(5000000000, 7000000000)
      },
      cpuinfo: {
        sockets: 1,
        user_hz: 100,
        cores: 4,
        flags: "fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush dts acpi mmx fxsr sse sse2 ss ht tm pbe syscall nx pdpe1gb rdtscp lm constant_tsc art arch_perfmon pebs bts rep_good nopl xtopology nonstop_tsc cpuid aperfmperf tsc_known_freq pni pclmulqdq dtes64 monitor ds_cpl vmx est tm2 ssse3 sdbg fma cx16 xtpr pdcm sse4_1 sse4_2 x2apic movbe popcnt tsc_deadline_timer aes xsave avx f16c rdrand lahf_lm abm 3dnowprefetch cpuid_fault epb cat_l2 cdp_l2 ssbd ibrs ibpb stibp ibrs_enhanced tpr_shadow flexpriority ept vpid ept_ad fsgsbase tsc_adjust bmi1 avx2 smep bmi2 erms invpcid rdt_a rdseed adx smap clflushopt clwb intel_pt sha_ni xsaveopt xsavec xgetbv1 xsaves split_lock_detect user_shstk avx_vnni dtherm ida arat pln pts hwp hwp_notify hwp_act_window hwp_epp hwp_pkg_req vnmi umip pku ospke waitpkg gfni vaes vpclmulqdq rdpid movdiri movdir64b fsrm md_clear serialize arch_lbr ibt flush_l1d arch_capabilities",
        hvm: "1",
        model: "Intel(R) CPU",
        mhz: "3200.000",
        cpus: 4
      },
      "boot-info": {
        secureboot: 0,
        mode: "efi"
      },
      uptime: randomBetween(1000000, 2000000)
    }
  };
}

// Generate mock container data
function generateContainers() {
  const containers = [];
  const containerNames = [
    "web-server", "database", "cache", "monitoring", "proxy", 
    "backup", "app-server", "auth-service", "api-gateway", "logger"
  ];
  
  for (let i = 0; i < randomBetween(5, 10); i++) {
    containers.push({
      netout: randomBetween(1000000, 10000000),
      netin: randomBetween(10000000, 100000000),
      uptime: randomBetween(1000000, 2000000),
      vmid: randomBetween(100, 999),
      diskread: randomBetween(10000000, 1000000000),
      status: Math.random() > 0.2 ? "running" : "stopped",
      mem: randomBetween(50000000, 500000000),
      pid: Math.random() > 0.2 ? randomBetween(1000, 20000) : undefined,
      type: "lxc",
      cpu: randomFloat(0.001, 0.02),
      maxmem: randomBetween(500000000, 2000000000),
      name: containerNames[i % containerNames.length],
      tags: "alpine;community-script;docker",
      diskwrite: randomBetween(10000000, 1000000000),
      maxswap: 536870912,
      swap: randomBetween(5000000, 50000000),
      cpus: randomBetween(1, 4),
      maxdisk: randomBetween(1000000000, 5000000000),
      disk: randomBetween(500000000, 3000000000)
    });
  }
  
  return { data: containers };
}

// Generate mock storage data
function generateStorage() {
  return {
    data: [
      {
        total: 0,
        content: "backup",
        used: 0,
        shared: 1,
        type: "pbs",
        storage: "backup-pbs",
        avail: 0,
        enabled: 1,
        active: 0
      },
      {
        total: randomBetween(400000000000, 500000000000),
        used_fraction: randomFloat(0.2, 0.4),
        content: "images,rootdir",
        shared: 0,
        used: randomBetween(100000000000, 200000000000),
        type: "lvmthin",
        avail: randomBetween(300000000000, 400000000000),
        storage: "local-lvm",
        enabled: 1,
        active: 1
      },
      {
        type: "dir",
        shared: 0,
        content: "vztmpl,backup,iso",
        used: randomBetween(5000000000, 10000000000),
        used_fraction: randomFloat(0.1, 0.3),
        total: 33501757440,
        active: 1,
        enabled: 1,
        avail: randomBetween(20000000000, 30000000000),
        storage: "local"
      }
    ]
  };
}

// Generate mock network data
function generateNetwork() {
  return {
    data: [
      {
        method6: "manual",
        families: ["inet"],
        iface: "wlan0",
        method: "manual",
        priority: 6,
        type: "unknown"
      },
      {
        type: "eth",
        exists: 1,
        families: ["inet"],
        priority: 4,
        method: "manual",
        iface: "eth1",
        method6: "manual"
      },
      {
        netmask: "24",
        families: ["inet"],
        bridge_fd: "0",
        cidr: "10.0.0.1/24",
        type: "bridge",
        method6: "manual",
        active: 1,
        address: "10.0.0.1",
        iface: "vmbr0",
        method: "static",
        bridge_stp: "off",
        bridge_ports: "eth0",
        gateway: "10.0.0.254",
        autostart: 1,
        priority: 5
      },
      {
        families: ["inet"],
        exists: 1,
        type: "eth",
        method6: "manual",
        active: 1,
        iface: "eth0",
        method: "manual",
        priority: 3
      }
    ]
  };
}

// Generate mock version data
function generateVersion() {
  return {
    data: {
      version: "8.3.4",
      release: "8.3",
      repoid: "65224a0f9cd294a3"
    }
  };
}

// Generate a complete mock test report
function generateMockTestReport(): TestReport {
  const timestamp = new Date().toISOString();
  
  // Create mock node config
  const nodeConfig: NodeConfig = {
    id: "node-1",
    name: "Proxmox Node 1",
    host: "https://10.0.0.1:8006",
    tokenId: "root@pam!pulse",
    tokenSecret: uuidv4()
  };
  
  // Create mock discovered node
  const discoveredNode: DiscoveredNode = {
    id: "node-1",
    name: "Proxmox Node 1",
    nodeName: "pve",
    host: "https://10.0.0.1:8006",
    ipAddress: "10.0.0.1"
  };
  
  // Create mock test results
  const testResults: TestResult[] = [
    {
      endpoint: "/nodes/pve/status",
      success: true,
      responseTime: randomBetween(20, 50),
      statusCode: 200,
      data: generateNodeStatusData()
    },
    {
      endpoint: "/nodes/pve/qemu",
      success: true,
      responseTime: randomBetween(20, 50),
      statusCode: 200,
      data: { data: [] }
    },
    {
      endpoint: "/nodes/pve/lxc",
      success: true,
      responseTime: randomBetween(200, 500),
      statusCode: 200,
      data: generateContainers()
    },
    {
      endpoint: "/nodes/pve/storage",
      success: true,
      responseTime: randomBetween(100, 200),
      statusCode: 200,
      data: generateStorage()
    },
    {
      endpoint: "/nodes/pve/network",
      success: true,
      responseTime: randomBetween(20, 50),
      statusCode: 200,
      data: generateNetwork()
    },
    {
      endpoint: "/nodes/pve/tasks",
      success: true,
      responseTime: randomBetween(20, 50),
      statusCode: 200,
      data: { data: [], total: 0 }
    },
    {
      endpoint: "/nodes/pve/subscription",
      success: true,
      responseTime: randomBetween(20, 50),
      statusCode: 200,
      data: {
        data: {
          status: "notfound",
          message: "There is no subscription key",
          serverid: "MOCK000000000000000000000000000000",
          url: "https://www.proxmox.com/en/proxmox-virtual-environment/pricing"
        }
      }
    },
    {
      endpoint: "/nodes/pve/version",
      success: true,
      responseTime: randomBetween(20, 50),
      statusCode: 200,
      data: generateVersion()
    }
  ];
  
  // Calculate test statistics
  const totalTests = testResults.length;
  const successfulTests = testResults.filter(test => test.success).length;
  const failedTests = totalTests - successfulTests;
  const averageResponseTime = Math.floor(
    testResults.reduce((sum, test) => sum + test.responseTime, 0) / totalTests
  );
  
  // Create node test result
  const nodeTestResult: NodeTestResult = {
    nodeConfig,
    discoveredNode,
    testResults,
    overallSuccess: failedTests === 0,
    totalTests,
    successfulTests,
    failedTests,
    averageResponseTime
  };
  
  // Create complete test report
  return {
    timestamp,
    nodes: [nodeTestResult],
    overallSuccess: failedTests === 0,
    totalTests,
    successfulTests,
    failedTests,
    averageResponseTime
  };
}

// Save the test report to a file
function saveTestReport(report: TestReport): void {
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const filename = `proxmox-api-test-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const filePath = path.join(reportDir, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  console.log(`Mock test report saved to ${filePath}`);
}

// Main function
function main() {
  console.log('Generating mock ProxMox API test report...');
  const mockReport = generateMockTestReport();
  saveTestReport(mockReport);
  console.log('Done!');
}

// Run the script
main(); 