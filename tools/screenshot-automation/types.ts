export interface ViewportSize {
  width: number;
  height: number;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SplitViewConfig {
  type: 'diagonal' | 'vertical';
  addLabels?: boolean;
  addIcons?: boolean;
  cleanupIndividualScreenshots?: boolean;
}

export interface MockDataConfig {
  enabled: boolean;
  mockDataUrl?: string;
  setupScript?: string;
}

export interface ScreenshotDefinition {
  path: string;
  name: string;
  viewportSize?: ViewportSize;
  waitForSelector?: string;
  cropRegion?: CropRegion;
  createSplitView?: boolean;
  splitViewConfig?: SplitViewConfig;
  enableFilters?: boolean;
  lightModeOnly?: boolean;
  darkModeOnly?: boolean;
  beforeScreenshot?: string;
  cleanupIndividualScreenshots?: boolean;
}

export interface ScreenshotConfig {
  baseUrl?: string;
  outputDir?: string;
  mockData?: MockDataConfig;
  screenshots: ScreenshotDefinition[];
} 