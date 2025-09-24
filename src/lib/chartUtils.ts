/**
 * Chart Utilities
 * ==============
 * 
 * Utilities for chart generation, SVG manipulation, and database integration
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a chart SVG using the server API
 * @param segmentId The ID of the segment to generate a chart for
 * @param width Optional width of the chart (default: 800)
 * @param height Optional height of the chart (default: 400)
 * @returns The URL of the generated SVG
 */
export async function generateChartSVG(segmentId: string, width = 800, height = 400): Promise<string> {
  try {
    const response = await fetch('/api/generate-chart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ segmentId, width, height }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate chart');
    }

    // Return SVG content
    return await response.text();
  } catch (error) {
    console.error('Error generating chart SVG:', error);
    throw error;
  }
}

/**
 * Save an SVG string to a file
 * @param svgContent The SVG content as a string
 * @param fileName The file name to save as
 */
export function downloadSVG(svgContent: string, fileName: string): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convert SVG string to PNG using browser APIs
 * @param svgContent The SVG content as a string
 * @param width The width of the PNG
 * @param height The height of the PNG
 * @returns Promise resolving to a data URL of the PNG
 */
/**
 * Save a chart SVG to the database
 * @param segmentId The segment ID the chart is for
 * @param svgContent SVG content as string
 * @param width Chart width
 * @param height Chart height
 * @returns The saved chart ID
 */
export async function saveChartToDatabase(
  segmentId: string,
  svgContent: string,
  width = 800,
  height = 400
): Promise<string> {
  try {
    const response = await fetch('/api/save-chart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        segmentId,
        svgContent,
        width,
        height,
        format: 'svg',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save chart to database');
    }

    const data = await response.json();
    return data.chartId;
  } catch (error) {
    console.error('Error saving chart to database:', error);
    throw error;
  }
}

/**
 * Get chart URL for a segment
 * @param segmentId The segment ID to get a chart for
 * @returns URL to the chart image
 */
export function getChartUrl(segmentId: string): string {
  return `/api/chart/${encodeURIComponent(segmentId)}`;
}

/**
 * Get chart HTML img tag for a segment
 * @param segmentId The segment ID to get a chart for
 * @param alt Alt text for the image
 * @param className Optional CSS class name
 * @returns HTML string for the image tag
 */
export function getChartImgTag(
  segmentId: string,
  alt = 'Chart',
  className = ''
): string {
  const chartUrl = getChartUrl(segmentId);
  return `<img src="${chartUrl}" alt="${alt}" class="${className}" />`;
}

/**
 * Generate and save a chart for a segment
 * @param segmentId The segment ID to generate a chart for
 * @returns The ID of the saved chart
 */
export async function generateAndSaveChart(segmentId: string): Promise<string> {
  try {
    // First generate the SVG
    const svgContent = await generateChartSVG(segmentId);
    
    // Then save it to the database
    return await saveChartToDatabase(segmentId, svgContent);
  } catch (error) {
    console.error('Error generating and saving chart:', error);
    throw error;
  }
}

export function svgToPng(svgContent: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create an SVG element
    const svg = new DOMParser().parseFromString(svgContent, 'image/svg+xml').documentElement;
    
    // Create a canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    
    if (!context) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    // Create an image from SVG
    const image = new Image();
    image.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svg));
    
    image.onload = () => {
      // Draw the image onto the canvas
      context.drawImage(image, 0, 0, width, height);
      
      // Convert canvas to PNG
      const pngDataUrl = canvas.toDataURL('image/png');
      resolve(pngDataUrl);
    };
    
    image.onerror = (error) => {
      reject(error);
    };
  });
}
