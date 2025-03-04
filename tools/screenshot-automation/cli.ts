#!/usr/bin/env node

import path from 'path';
import { program } from 'commander';
import ScreenshotTool from './screenshot';
import { logger } from './logger';

// Set up command line interface
program
  .name('screenshot-tool')
  .description('Automated screenshot tool for ProxMox Pulse')
  .version('1.0.0')
  .option('-c, --config <path>', 'Path to config file', './screenshot-config.json')
  .option('-u, --url <url>', 'Base URL to use (overrides config file)')
  .option('-o, --output <dir>', 'Output directory (overrides config file)')
  .parse(process.argv);

const options = program.opts();

// Resolve config path
const configPath = path.resolve(process.cwd(), options.config);

async function run() {
  try {
    logger.info('Starting screenshot tool');
    logger.info(`Using config file: ${configPath}`);
    
    const screenshotTool = new ScreenshotTool(configPath);
    
    // Override baseUrl if provided
    if (options.url) {
      screenshotTool.setBaseUrl(options.url);
      logger.info(`Overriding base URL: ${options.url}`);
    }
    
    // Override output directory if provided
    if (options.output) {
      const outputDir = path.resolve(process.cwd(), options.output);
      screenshotTool.setOutputDir(outputDir);
      logger.info(`Overriding output directory: ${outputDir}`);
    }
    
    await screenshotTool.captureAllScreenshots();
    
    logger.info('Screenshot capture completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error(`Error running screenshot tool: ${error}`);
    process.exit(1);
  }
}

run(); 