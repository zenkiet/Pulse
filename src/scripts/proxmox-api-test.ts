#!/usr/bin/env node

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import https from 'https';
import dotenv from 'dotenv';
import { createLogger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Create logger
const logger = createLogger('ProxmoxApiTest');

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
  nodeName: string; // The actual ProxMox node name (e.g., 'pve', 'pve2')
  host: string;
  ipAddress: string;
}

interface TestResult {
  endpoint: string;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  data?: any;
}

interface NodeTestReport {
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
  nodes: NodeTestReport[];
  overallSuccess: boolean;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageResponseTime: number;
}

// Parse node configurations from environment variables
function parseNodeConfigs(): NodeConfig[] {
  const nodes: NodeConfig[] = [];
  const nodePattern = /^PROXMOX_NODE_(\d+)_/;
  
  // Get all environment variables that match the node pattern
  const nodeEnvVars = Object.keys(process.env).filter(key => nodePattern.test(key));
  
  // Extract unique node numbers
  const nodeNumbers = new Set<string>();
  nodeEnvVars.forEach(key => {
    const match = key.match(nodePattern);
    if (match && match[1]) {
      nodeNumbers.add(match[1]);
    }
  });
  
  // Parse configuration for each node
  Array.from(nodeNumbers).forEach(nodeNumber => {
    const name = process.env[`PROXMOX_NODE_${nodeNumber}_NAME`];
    const host = process.env[`PROXMOX_NODE_${nodeNumber}_HOST`];
    const tokenId = process.env[`PROXMOX_NODE_${nodeNumber}_TOKEN_ID`];
    const tokenSecret = process.env[`PROXMOX_NODE_${nodeNumber}_TOKEN_SECRET`];
    
    if (name && host && tokenId && tokenSecret) {
      nodes.push({
        id: `node-${nodeNumber}`,
        name,
        host,
        tokenId,
        tokenSecret
      });
    } else {
      logger.warn(`Incomplete configuration for node ${nodeNumber}, skipping.`);
    }
  });
  
  return nodes;
}

// Create an Axios client for a node
function createApiClient(nodeConfig: NodeConfig): AxiosInstance {
  const axiosConfig: AxiosRequestConfig = {
    baseURL: `${nodeConfig.host}/api2/json`,
    headers: {
      'Authorization': `PVEAPIToken=${nodeConfig.tokenId}=${nodeConfig.tokenSecret}`
    },
    timeout: 10000,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  };

  return axios.create(axiosConfig);
}

// Extract IP address from host URL
function extractIpAddress(host: string): string {
  try {
    const url = new URL(host);
    return url.hostname;
  } catch (error) {
    logger.error('Failed to extract IP address from host', { host, error });
    return host;
  }
}

// Discover node names from the cluster API
async function discoverNodes(nodes: NodeConfig[]): Promise<DiscoveredNode[]> {
  logger.info('Discovering ProxMox node names...');
  
  const discoveredNodes: DiscoveredNode[] = [];
  
  // Try each node until we get a successful response
  for (const nodeConfig of nodes) {
    try {
      const client = createApiClient(nodeConfig);
      const response = await client.get('/nodes');
      
      if (response.data && response.data.data) {
        const apiNodes = response.data.data;
        logger.info(`Successfully discovered ${apiNodes.length} nodes from the cluster API`, { 
          source: nodeConfig.host 
        });
        
        // Map discovered nodes to our configured nodes by IP address
        const ipAddress = extractIpAddress(nodeConfig.host);
        
        // Find the matching node in the API response
        const matchingNode = apiNodes.find((node: any) => {
          // Try to match by IP address if available in the API response
          if (node.ip && node.ip === ipAddress) {
            return true;
          }
          
          // Otherwise, try to match by node ID or name
          return node.id === nodeConfig.id || node.name === nodeConfig.name;
        });
        
        if (matchingNode) {
          discoveredNodes.push({
            id: nodeConfig.id,
            name: nodeConfig.name,
            nodeName: matchingNode.node, // This is the actual ProxMox node name (e.g., 'pve')
            host: nodeConfig.host,
            ipAddress
          });
          logger.info(`Mapped configured node ${nodeConfig.name} to ProxMox node ${matchingNode.node}`);
        } else {
          // If we can't find a direct match, try to match by position in the list
          // This is a fallback and not ideal
          const nodeIndex = nodes.findIndex(n => n.id === nodeConfig.id);
          if (nodeIndex >= 0 && nodeIndex < apiNodes.length) {
            discoveredNodes.push({
              id: nodeConfig.id,
              name: nodeConfig.name,
              nodeName: apiNodes[nodeIndex].node,
              host: nodeConfig.host,
              ipAddress
            });
            logger.warn(`Mapped configured node ${nodeConfig.name} to ProxMox node ${apiNodes[nodeIndex].node} by position (fallback)`);
          } else {
            logger.error(`Could not map configured node ${nodeConfig.name} to any ProxMox node`);
          }
        }
        
        // We've successfully discovered nodes, so we can break out of the loop
        break;
      }
    } catch (error) {
      logger.warn(`Failed to discover nodes from ${nodeConfig.host}`, { error });
    }
  }
  
  // If we couldn't discover any nodes, try a different approach
  if (discoveredNodes.length === 0) {
    logger.warn('Could not discover nodes from the cluster API, trying individual node APIs...');
    
    for (const nodeConfig of nodes) {
      try {
        const client = createApiClient(nodeConfig);
        const response = await client.get('/nodes');
        
        if (response.data && response.data.data) {
          const apiNodes = response.data.data;
          const ipAddress = extractIpAddress(nodeConfig.host);
          
          // Find the node that matches our IP address
          for (const apiNode of apiNodes) {
            try {
              // Try to access the node's status endpoint
              const statusResponse = await client.get(`/nodes/${apiNode.node}/status`);
              if (statusResponse.data && statusResponse.data.data) {
                discoveredNodes.push({
                  id: nodeConfig.id,
                  name: nodeConfig.name,
                  nodeName: apiNode.node,
                  host: nodeConfig.host,
                  ipAddress
                });
                logger.info(`Discovered node ${apiNode.node} from ${nodeConfig.host}`);
                break;
              }
            } catch (error) {
              logger.debug(`Failed to access status for node ${apiNode.node}`, { error });
            }
          }
        }
      } catch (error) {
        logger.warn(`Failed to discover nodes from ${nodeConfig.host}`, { error });
      }
    }
  }
  
  return discoveredNodes;
}

// Test a specific API endpoint
async function testEndpoint(
  client: AxiosInstance, 
  endpoint: string, 
  description: string
): Promise<TestResult> {
  logger.info(`Testing endpoint: ${endpoint} (${description})`);
  
  const startTime = Date.now();
  try {
    const response = await client.get(endpoint);
    const endTime = Date.now();
    
    logger.info(`✅ Successfully tested ${endpoint}`, {
      statusCode: response.status,
      responseTime: endTime - startTime,
      dataSize: JSON.stringify(response.data).length
    });
    
    return {
      endpoint,
      success: true,
      responseTime: endTime - startTime,
      statusCode: response.status,
      data: response.data
    };
  } catch (error: any) {
    const endTime = Date.now();
    
    logger.error(`❌ Failed to test ${endpoint}`, {
      error: error.message,
      responseTime: endTime - startTime,
      statusCode: error.response?.status
    });
    
    return {
      endpoint,
      success: false,
      responseTime: endTime - startTime,
      statusCode: error.response?.status,
      error: error.message
    };
  }
}

// Test all endpoints for a node
async function testNodeEndpoints(
  nodeConfig: NodeConfig, 
  discoveredNode: DiscoveredNode
): Promise<NodeTestReport> {
  logger.info(`Testing endpoints for node ${discoveredNode.name} (${discoveredNode.nodeName})`);
  
  const client = createApiClient(nodeConfig);
  const testResults: TestResult[] = [];
  
  // Define the endpoints to test
  const endpoints = [
    { path: `/nodes/${discoveredNode.nodeName}/status`, description: 'Node status' },
    { path: `/nodes/${discoveredNode.nodeName}/qemu`, description: 'List VMs' },
    { path: `/nodes/${discoveredNode.nodeName}/lxc`, description: 'List containers' },
    { path: `/nodes/${discoveredNode.nodeName}/storage`, description: 'List storage' },
    { path: `/nodes/${discoveredNode.nodeName}/network`, description: 'Network configuration' },
    { path: `/nodes/${discoveredNode.nodeName}/tasks`, description: 'Recent tasks' },
    { path: `/nodes/${discoveredNode.nodeName}/subscription`, description: 'Subscription info' },
    { path: `/nodes/${discoveredNode.nodeName}/version`, description: 'ProxMox version' }
  ];
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    const result = await testEndpoint(client, endpoint.path, endpoint.description);
    testResults.push(result);
  }
  
  // Calculate statistics
  const successfulTests = testResults.filter(result => result.success).length;
  const failedTests = testResults.length - successfulTests;
  const totalResponseTime = testResults.reduce((total, result) => total + result.responseTime, 0);
  const averageResponseTime = totalResponseTime / testResults.length;
  
  return {
    nodeConfig,
    discoveredNode,
    testResults,
    overallSuccess: failedTests === 0,
    totalTests: testResults.length,
    successfulTests,
    failedTests,
    averageResponseTime
  };
}

// Generate a test report
function generateTestReport(nodeReports: NodeTestReport[]): TestReport {
  const totalTests = nodeReports.reduce((total, report) => total + report.totalTests, 0);
  const successfulTests = nodeReports.reduce((total, report) => total + report.successfulTests, 0);
  const failedTests = totalTests - successfulTests;
  const totalResponseTime = nodeReports.reduce((total, report) => total + (report.averageResponseTime * report.totalTests), 0);
  const averageResponseTime = totalResponseTime / totalTests;
  
  return {
    timestamp: new Date().toISOString(),
    nodes: nodeReports,
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
  logger.info(`Test report saved to ${filePath}`);
}

// Print a summary of the test report
function printTestReportSummary(report: TestReport): void {
  logger.info('=== ProxMox API Test Report Summary ===');
  logger.info(`Timestamp: ${report.timestamp}`);
  logger.info(`Overall Success: ${report.overallSuccess ? '✅ Yes' : '❌ No'}`);
  logger.info(`Total Tests: ${report.totalTests}`);
  logger.info(`Successful Tests: ${report.successfulTests}`);
  logger.info(`Failed Tests: ${report.failedTests}`);
  logger.info(`Average Response Time: ${report.averageResponseTime.toFixed(2)}ms`);
  
  logger.info('\nNode Reports:');
  report.nodes.forEach(nodeReport => {
    logger.info(`\n  Node: ${nodeReport.discoveredNode.name} (${nodeReport.discoveredNode.nodeName})`);
    logger.info(`  Host: ${nodeReport.discoveredNode.host}`);
    logger.info(`  Success: ${nodeReport.overallSuccess ? '✅ Yes' : '❌ No'}`);
    logger.info(`  Tests: ${nodeReport.successfulTests}/${nodeReport.totalTests} successful`);
    logger.info(`  Average Response Time: ${nodeReport.averageResponseTime.toFixed(2)}ms`);
    
    if (nodeReport.failedTests > 0) {
      logger.info('\n  Failed Endpoints:');
      nodeReport.testResults
        .filter(result => !result.success)
        .forEach(result => {
          logger.info(`    - ${result.endpoint}: ${result.error}`);
        });
    }
  });
}

// Print API patterns and response structures
function printApiPatterns(report: TestReport): void {
  logger.info('\n=== ProxMox API Patterns and Response Structures ===');
  
  // Get a successful node report to use as an example
  const exampleNodeReport = report.nodes.find(nodeReport => nodeReport.successfulTests > 0);
  if (!exampleNodeReport) {
    logger.warn('No successful API calls to show patterns for.');
    return;
  }
  
  // Print example response structures for each endpoint
  logger.info('\nExample Response Structures:');
  exampleNodeReport.testResults
    .filter(result => result.success && result.data)
    .forEach(result => {
      logger.info(`\nEndpoint: ${result.endpoint}`);
      logger.info('Response Structure:');
      
      // Print a simplified version of the response structure
      const structure = simplifyResponseStructure(result.data);
      logger.info(JSON.stringify(structure, null, 2));
    });
  
  // Print API patterns
  logger.info('\nAPI Patterns:');
  logger.info('1. All endpoints return a data object with the actual response data.');
  logger.info('2. Most list endpoints return an array of objects in the data property.');
  logger.info('3. Status endpoints return a single object with status information.');
  logger.info('4. Error responses include a message property with error details.');
  logger.info('5. Authentication is done via PVEAPIToken in the Authorization header.');
  logger.info('6. Node names must be used in the URL path for node-specific endpoints.');
}

// Simplify a response structure for display
function simplifyResponseStructure(data: any): any {
  if (Array.isArray(data)) {
    return data.length > 0 ? [simplifyResponseStructure(data[0])] : [];
  } else if (typeof data === 'object' && data !== null) {
    const result: Record<string, any> = {};
    for (const key in data) {
      if (key === 'data' && Array.isArray(data[key]) && data[key].length > 0) {
        result[key] = [simplifyResponseStructure(data[key][0])];
      } else if (key === 'data' && typeof data[key] === 'object' && data[key] !== null) {
        result[key] = simplifyResponseStructure(data[key]);
      } else {
        result[key] = typeof data[key];
      }
    }
    return result;
  } else {
    return typeof data;
  }
}

// Main function
async function main() {
  logger.info('Starting ProxMox API Test');
  
  // Parse node configurations
  const nodeConfigs = parseNodeConfigs();
  logger.info(`Found ${nodeConfigs.length} node configurations in .env file`);
  
  if (nodeConfigs.length === 0) {
    logger.error('No valid node configurations found. Please check your .env file.');
    process.exit(1);
  }
  
  // Discover node names
  const discoveredNodes = await discoverNodes(nodeConfigs);
  logger.info(`Discovered ${discoveredNodes.length} node names`);
  
  if (discoveredNodes.length === 0) {
    logger.error('Failed to discover any node names. Please check your ProxMox API configuration.');
    process.exit(1);
  }
  
  // Test endpoints for each node
  const nodeReports: NodeTestReport[] = [];
  for (const discoveredNode of discoveredNodes) {
    const nodeConfig = nodeConfigs.find(config => config.id === discoveredNode.id);
    if (nodeConfig) {
      const nodeReport = await testNodeEndpoints(nodeConfig, discoveredNode);
      nodeReports.push(nodeReport);
    }
  }
  
  // Generate and save the test report
  const testReport = generateTestReport(nodeReports);
  saveTestReport(testReport);
  
  // Print the test report summary
  printTestReportSummary(testReport);
  
  // Print API patterns and response structures
  printApiPatterns(testReport);
  
  // Exit with appropriate code
  if (testReport.overallSuccess) {
    logger.info('✅ All tests completed successfully!');
    process.exit(0);
  } else {
    logger.warn('⚠️ Some tests failed. See report for details.');
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unexpected error during API test', { error });
  process.exit(1);
}); 