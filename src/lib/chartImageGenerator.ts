/**
 * Chart Image Generator Service
 * ==============================
 * 
 * Service pour générer des images base64 des graphiques de segments
 * Ces images sont générées côté serveur et stockées dans la base de données
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Interface pour les données d'un point du graphique
 */
export interface ChartPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Interface pour les données d'analyse d'un segment
 */
export interface SegmentAnalysisData {
  id: string;
  pointsData: ChartPoint[];
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  x0: number;
  patternPoint?: string | null;
}

/**
 * Génère un graphique SVG pour un segment
 * @param segmentData Données du segment à visualiser
 * @param width Largeur du graphique (défaut: 800)
 * @param height Hauteur du graphique (défaut: 400)
 * @returns Contenu SVG sous forme de chaîne
 */
function generateSVGChart(
  segmentData: SegmentAnalysisData,
  width = 800,
  height = 400
): string {
  const { pointsData, minPrice, maxPrice, averagePrice, id, patternPoint } = segmentData;

  // Calcul du domaine de l'axe Y avec padding de 7%
  const priceRange = maxPrice - minPrice;
  const paddingPercentage = 0.07;
  const padding = priceRange * paddingPercentage;
  const yAxisMin = minPrice - padding;
  const yAxisMax = maxPrice + padding;

  // En-tête SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;
  
  // Styles CSS
  svg += `
    <style>
      .chart-title { font-family: Arial, sans-serif; font-size: 14px; fill: #333; font-weight: 600; }
      .axis { stroke: #ccc; stroke-width: 1; }
      .grid { stroke: #e5e5e5; stroke-width: 0.5; stroke-dasharray: 3,3; }
      .data-line { stroke: #3b82f6; stroke-width: 2; fill: none; }
      .avg-line { stroke: #8b5cf6; stroke-width: 1.5; stroke-dasharray: 5,5; }
      .min-line { stroke: #ef4444; stroke-width: 1; stroke-dasharray: 3,3; }
      .max-line { stroke: #10b981; stroke-width: 1; stroke-dasharray: 3,3; }
      .label { font-family: Arial, sans-serif; font-size: 11px; fill: #666; }
      .label-bold { font-family: Arial, sans-serif; font-size: 11px; fill: #333; font-weight: 600; }
      .data-point { fill: #94a3b8; stroke: #64748b; stroke-width: 1; }
      .last-point { fill: #ef4444; stroke: #dc2626; stroke-width: 2; }
      .pattern-point { fill: #10b981; stroke: #059669; stroke-width: 3; }
    </style>
  `;
  
  // Fond du graphique
  svg += `<rect width="${width}" height="${height}" fill="white" />`;
  
  // Calcul des dimensions avec marges
  const margin = { top: 30, right: 50, left: 70, bottom: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Zone du graphique
  svg += `<g transform="translate(${margin.left},${margin.top})">`;
  
  // Grille de fond
  svg += `<rect x="0" y="0" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#e5e5e5" stroke-width="1" />`;
  
  // Fonction pour calculer la position Y
  const getYPosition = (value: number): number => {
    const range = yAxisMax - yAxisMin;
    const normalized = (value - yAxisMin) / range;
    return chartHeight - (normalized * chartHeight);
  };
  
  // Grille horizontale et labels de l'axe Y (prix)
  const yAxisSteps = 5; // Nombre de lignes sur l'axe Y
  for (let i = 0; i <= yAxisSteps; i++) {
    const priceValue = yAxisMin + (yAxisMax - yAxisMin) * (i / yAxisSteps);
    const yPos = getYPosition(priceValue);
    
    // Ligne de grille
    svg += `<line x1="0" y1="${yPos}" x2="${chartWidth}" y2="${yPos}" class="grid" />`;
    
    // Label du prix
    svg += `<text x="-10" y="${yPos + 4}" class="label" text-anchor="end">$${priceValue.toFixed(2)}</text>`;
  }
  
  // Dessin de la ligne de données si des points existent
  if (pointsData.length > 0) {
    // Échelle X basée sur les timestamps
    const timestamps = pointsData.map(p => new Date(p.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime || 1; // Éviter division par zéro
    
    // Fonction pour calculer la position X
    const getXPosition = (timestamp: string): number => {
      const time = new Date(timestamp).getTime();
      const normalized = (time - minTime) / timeRange;
      return normalized * chartWidth;
    };
    
    // Grille verticale et labels de l'axe X (temps)
    const xAxisSteps = Math.min(6, pointsData.length - 1); // Nombre de labels sur l'axe X
    for (let i = 0; i <= xAxisSteps; i++) {
      const pointIndex = Math.floor((pointsData.length - 1) * (i / xAxisSteps));
      const point = pointsData[pointIndex];
      const xPos = getXPosition(point.timestamp);
      
      // Ligne de grille verticale
      svg += `<line x1="${xPos}" y1="0" x2="${xPos}" y2="${chartHeight}" class="grid" />`;
      
      // Label du temps
      const timeLabel = new Date(point.timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      svg += `<text x="${xPos}" y="${chartHeight + 20}" class="label" text-anchor="middle">${timeLabel}</text>`;
    }
    
    // Création du chemin pour la ligne
    let path = `<path d="M`;
    
    pointsData.forEach((point, index) => {
      const x = getXPosition(point.timestamp);
      const y = getYPosition(point.close);
      
      if (index === 0) {
        path += `${x},${y}`;
      } else {
        path += ` L${x},${y}`;
      }
    });
    
    path += `" class="data-line" />`;
    svg += path;
    
    // Ajout des points sur la ligne
    pointsData.forEach((point, index) => {
      const x = getXPosition(point.timestamp);
      const y = getYPosition(point.close);
      const isLastPoint = index === pointsData.length - 1;
      const isPatternPoint = patternPoint && point.timestamp === patternPoint;
      
      if (isPatternPoint) {
        // Point pattern (jaune)
        svg += `<circle cx="${x}" cy="${y}" r="8" class="pattern-point" />`;
      } else if (isLastPoint) {
        // Dernier point X0 (rouge)
        svg += `<circle cx="${x}" cy="${y}" r="6" class="last-point" />`;
      } else {
        // Points normaux
        svg += `<circle cx="${x}" cy="${y}" r="3" class="data-point" />`;
      }
    });
  } else {
    svg += `<text x="${chartWidth / 2}" y="${chartHeight / 2}" class="chart-title" text-anchor="middle">Aucune donnée disponible</text>`;
  }
  
  // Labels des axes
  svg += `<text x="${chartWidth / 2}" y="${chartHeight + 40}" class="label" text-anchor="middle" font-weight="600">Temps</text>`;
  svg += `<text x="-${chartHeight / 2}" y="-50" class="label" text-anchor="middle" transform="rotate(-90)" font-weight="600">Prix ($)</text>`;
  
  // Titre du segment
  svg += `<text x="${chartWidth / 2}" y="-10" class="chart-title" text-anchor="middle">Segment ${id.split('_').pop()}</text>`;
  
  // Fermeture du groupe
  svg += `</g>`;
  
  // Fermeture du SVG
  svg += `</svg>`;
  
  return svg;
}

/**
 * Convertit un contenu SVG en base64
 * @param svgContent Contenu SVG sous forme de chaîne
 * @returns Chaîne base64 de l'image SVG
 */
function svgToBase64(svgContent: string): string {
  // Encode le SVG en base64
  const base64 = Buffer.from(svgContent, 'utf-8').toString('base64');
  // Retourne avec le préfixe data URL
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Génère une image base64 pour un segment
 * @param segmentData Données du segment
 * @param width Largeur du graphique (défaut: 800)
 * @param height Hauteur du graphique (défaut: 400)
 * @returns Image base64
 */
export function generateSegmentImageBase64(
  segmentData: SegmentAnalysisData,
  width = 800,
  height = 400
): string {
  const svgContent = generateSVGChart(segmentData, width, height);
  return svgToBase64(svgContent);
}

/**
 * Crée un objet d'image prêt à être inséré dans la base de données
 * @param analysisResultId ID du résultat d'analyse (segment)
 * @param segmentData Données du segment
 * @param width Largeur du graphique (défaut: 800)
 * @param height Hauteur du graphique (défaut: 400)
 * @returns Objet prêt pour l'insertion
 */
export function createAnalysisResultImage(
  analysisResultId: string,
  segmentData: SegmentAnalysisData,
  width = 800,
  height = 400
): {
  id: string;
  analysisResultId: string;
  imgData: string;
} {
  const imageId = `${analysisResultId}_img_${uuidv4().substring(0, 8)}`;
  const imgData = generateSegmentImageBase64(segmentData, width, height);
  
  return {
    id: imageId,
    analysisResultId,
    imgData,
  };
}

