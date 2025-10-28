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
      .last-point { fill: #3b82f6; stroke: #2563eb; stroke-width: 2; }
      .pattern-point { fill: #10b981; stroke: #059669; stroke-width: 3; }
      .equal-price-point { fill: #f59e0b; stroke: #d97706; stroke-width: 1; }
      .equal-price-segment { stroke: #f59e0b; stroke-width: 4; }
      .peak-point { fill: #ef4444; stroke: #dc2626; stroke-width: 1; }
      .peak-segment { stroke: #ef4444; stroke-width: 3; }
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
      
      // Label du temps (format français sans décalage horaire)
      // Utilise directement les valeurs UTC de la date pour éviter le changement d'heure
      const date = new Date(point.timestamp);
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      const timeLabel = `${hours}:${minutes}`;
      svg += `<text x="${xPos}" y="${chartHeight + 20}" class="label" text-anchor="middle">${timeLabel}</text>`;
    }
    
    // Préparation des données avec coordonnées et métadonnées
    const pointsXY = pointsData.map((p, idx) => ({
      x: getXPosition(p.timestamp),
      y: getYPosition(p.close),
      close: p.close,
      timestamp: p.timestamp,
      index: idx,
    }));
    
    // Détection des caractéristiques de chaque point
    const pointFeatures = pointsXY.map((pt, i) => {
      const isEqualToPrev = i > 0 && pointsXY[i - 1].close === pt.close;
      const isEqualToNext = i < pointsXY.length - 1 && pointsXY[i + 1].close === pt.close;
      
      // Détection de pic (sommet haut ou bas)
      let isPeak = false;
      if (i > 0 && i < pointsXY.length - 1) {
        const prev = pointsXY[i - 1].close;
        const curr = pt.close;
        const next = pointsXY[i + 1].close;
        // Pic haut : prix > précédent ET prix > suivant
        // Pic bas : prix < précédent ET prix < suivant
        isPeak = (curr > prev && curr > next) || (curr < prev && curr < next);
      }
      
      return {
        isEqualPrice: isEqualToPrev || isEqualToNext,
        isPeak,
        isEqualToPrev,
      };
    });
    
    // Création du chemin principal (ligne bleue de base)
    let path = `<path d="M`;
    pointsXY.forEach((pt, index) => {
      if (index === 0) {
        path += `${pt.x},${pt.y}`;
      } else {
        path += ` L${pt.x},${pt.y}`;
      }
    });
    path += `" class="data-line" />`;
    svg += path;

    // Segments jaunes entre points consécutifs avec exactement le même prix de clôture
    for (let i = 0; i < pointsXY.length - 1; i++) {
      const a = pointsXY[i];
      const b = pointsXY[i + 1];
      if (a.close === b.close) {
        svg += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="equal-price-segment" />`;
      }
    }
    
    // Segments rouges partant des pics
    for (let i = 0; i < pointsXY.length; i++) {
      if (!pointFeatures[i].isPeak) continue;
      
      const peakPt = pointsXY[i];
      
      // Direction vers l'avant (si existe)
      if (i < pointsXY.length - 1) {
        let endIdx = i + 1;
        let shouldStop = false;
        
        // Chercher jusqu'où dessiner le segment rouge
        while (endIdx < pointsXY.length && !shouldStop) {
          const currClose = pointsXY[endIdx].close;
          const prevClose = pointsXY[endIdx - 1].close;
          
          // Stop si point jaune (prix égal avec voisin)
          if (pointFeatures[endIdx].isEqualPrice) {
            shouldStop = true;
            break;
          }
          
          // Stop si changement de variation
          if (endIdx >= i + 2) {
            const beforeClose = pointsXY[endIdx - 2].close;
            const variation1 = prevClose - beforeClose;
            const variation2 = currClose - prevClose;
            // Changement de signe = changement de variation
            if ((variation1 > 0 && variation2 < 0) || (variation1 < 0 && variation2 > 0)) {
              shouldStop = true;
              break;
            }
          }
          
          endIdx++;
        }
        
        // Dessiner segment rouge du pic jusqu'à endIdx-1
        for (let j = i; j < Math.min(endIdx, pointsXY.length); j++) {
          if (j < pointsXY.length - 1) {
            const from = pointsXY[j];
            const to = pointsXY[j + 1];
            svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="peak-segment" />`;
          }
        }
      }
      
      // Direction vers l'arrière (si existe)
      if (i > 0) {
        let startIdx = i - 1;
        let shouldStop = false;
        
        // Chercher jusqu'où dessiner le segment rouge
        while (startIdx >= 0 && !shouldStop) {
          const currClose = pointsXY[startIdx].close;
          const nextClose = pointsXY[startIdx + 1].close;
          
          // Stop si point jaune (prix égal avec voisin)
          if (pointFeatures[startIdx].isEqualPrice) {
            shouldStop = true;
            break;
          }
          
          // Stop si changement de variation
          if (startIdx <= i - 2) {
            const afterClose = pointsXY[startIdx + 2].close;
            const variation1 = nextClose - currClose;
            const variation2 = afterClose - nextClose;
            // Changement de signe = changement de variation
            if ((variation1 > 0 && variation2 < 0) || (variation1 < 0 && variation2 > 0)) {
              shouldStop = true;
              break;
            }
          }
          
          startIdx--;
        }
        
        // Dessiner segment rouge de startIdx+1 jusqu'au pic
        for (let j = Math.max(startIdx + 1, 0); j < i; j++) {
          const from = pointsXY[j];
          const to = pointsXY[j + 1];
          svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="peak-segment" />`;
        }
      }
    }
    
    // Ajout des points sur la ligne
    // Ordre de superposition: gris < vert < jaune/rouge/bleu
    // (dessinés en couches pour contrôler l'ordre Z)
    
    // Couche 1: Points normaux gris (r=3)
    pointsData.forEach((point, index) => {
      const x = getXPosition(point.timestamp);
      const y = getYPosition(point.close);
      const isLastPoint = index === pointsData.length - 1;
      const isPatternPoint = patternPoint && point.timestamp === patternPoint;
      const feature = pointFeatures[index];
      
      if (!feature.isPeak && !feature.isEqualPrice && !isPatternPoint && !isLastPoint) {
        svg += `<circle cx="${x}" cy="${y}" r="3" class="data-point" />`;
      }
    });
    
    // Couche 2: Pattern points verts (r=6) - dessinés EN PREMIER pour être derrière
    pointsData.forEach((point, index) => {
      const x = getXPosition(point.timestamp);
      const y = getYPosition(point.close);
      const isPatternPoint = patternPoint && point.timestamp === patternPoint;
      
      if (isPatternPoint) {
        svg += `<circle cx="${x}" cy="${y}" r="6" class="pattern-point" />`;
      }
    });
    
    // Couche 3: Points à prix égal jaunes (r=3) - par-dessus tout y compris vert
    pointsData.forEach((point, index) => {
      const x = getXPosition(point.timestamp);
      const y = getYPosition(point.close);
      const feature = pointFeatures[index];
      
      // Afficher le point jaune MÊME s'il y a un pattern point au même endroit
      if (feature.isEqualPrice) {
        svg += `<circle cx="${x}" cy="${y}" r="3" class="equal-price-point" />`;
      }
    });
    
    // Couche 4: Points pics rouges (r=3) - par-dessus tout y compris vert
    pointsData.forEach((point, index) => {
      const x = getXPosition(point.timestamp);
      const y = getYPosition(point.close);
      const feature = pointFeatures[index];
      
      // Afficher le point rouge MÊME s'il y a un pattern point au même endroit
      if (feature.isPeak) {
        svg += `<circle cx="${x}" cy="${y}" r="3" class="peak-point" />`;
      }
    });
    
    // Couche 5: Dernier point X0 bleu (r=6) - tout devant
    pointsData.forEach((point, index) => {
      const x = getXPosition(point.timestamp);
      const y = getYPosition(point.close);
      const isLastPoint = index === pointsData.length - 1;
      const isPatternPoint = patternPoint && point.timestamp === patternPoint;
      
      if (isLastPoint && !isPatternPoint) {
        svg += `<circle cx="${x}" cy="${y}" r="6" class="last-point" />`;
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

