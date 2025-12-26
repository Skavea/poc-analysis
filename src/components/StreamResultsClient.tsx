/**
 * Client Component: Stream Results Client
 * ========================================
 * 
 * Composant client pour afficher les graphiques des résultats d'un stream
 */

'use client';

import { useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  Button,
  Heading,
  Spinner,
} from "@chakra-ui/react";
import { Download } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { StockData, AnalysisResult } from '@/lib/schema';

interface StreamResultsClientProps {
  stockData: StockData;
  segments: AnalysisResult[];
  predictionStats?: {
    totalTests: number;
    testsCorrect: number;
    testsIncorrect: number;
    testsUnanswered: number;
    successRate: number;
  };
  resultStats06?: {
    totalResults: number;
    resultsCorrect: number;
    resultsIncorrect: number;
    successRate: number;
  };
}

interface PointData {
  timestamp: number;
  price: number;
  time: string;
}

interface SegmentResultData {
  time: number;
  value: number;
  color: string;
  segmentId: string;
  isExtremity?: boolean; // Indique si c'est une extrémité du segment (début ou fin)
}

// Fonction helper pour déterminer si un segment doit être violet (résultat >= 0.9 ou <= -0.9)
function shouldBePurple(resultValues: number[]): boolean {
  return resultValues.some(result => result >= 0.9 || result <= -0.9);
}

// Fonction helper pour déterminer la couleur d'un segment
// isCorrect == 0 → faux (noir)
// isCorrect != 0 → juste (rouge ou violet selon result)
function getSegmentColor(isCorrect: number, resultValues: number[]): string {
  if (isCorrect === 0) {
    // Si isCorrect == 0, c'est faux → noir
    return '#000000'; // Noir
  }
  // Si isCorrect != 0 (peut être 0.125, 0.25, etc.), c'est juste
  // On regarde result pour déterminer la couleur
  if (shouldBePurple(resultValues)) {
    return '#9333ea'; // Violet
  }
  return '#ef4444'; // Rouge
}

// Fonction helper pour déterminer si un segment est juste
// isCorrect == 0 → faux
// isCorrect != 0 → juste
function isSegmentCorrect(isCorrectValues: number[]): boolean {
  if (isCorrectValues.length === 0) return false;
  // Un segment est juste si au moins une valeur est != 0
  return isCorrectValues.some(v => v !== 0);
}

export default function StreamResultsClient({ stockData, segments, predictionStats, resultStats06 }: StreamResultsClientProps) {
  // Préparer les données pour le premier graphique (tous les points)
  const allPointsData = useMemo(() => {
    if (!stockData.data || typeof stockData.data !== 'object') {
      return [];
    }
    
    // Les données peuvent être un objet avec des clés timestamp ou déjà un tableau
    let data: Record<string, { open: number; high: number; low: number; close: number }>;
    
    if (Array.isArray(stockData.data)) {
      // Si c'est un tableau, le convertir en objet
      data = {};
      stockData.data.forEach((item: any) => {
        if (item.timestamp) {
          data[item.timestamp] = {
            open: item.open || 0,
            high: item.high || 0,
            low: item.low || 0,
            close: item.close || 0,
          };
        }
      });
    } else {
      data = stockData.data as Record<string, { open: number; high: number; low: number; close: number }>;
    }
    
    const points: PointData[] = [];
    
    // Trier les timestamps
    const sortedTimestamps = Object.keys(data).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
    
    sortedTimestamps.forEach(timestamp => {
      const point = data[timestamp];
      if (!point || typeof point !== 'object') return;
      
      // Gérer différents formats de données (Alpha Vantage utilise '1. open', '2. high', etc.)
      let closePrice: number | null = null;
      
      // Essayer d'abord le format standard
      if ('close' in point && typeof point.close === 'number') {
        closePrice = point.close;
      }
      // Sinon, essayer le format Alpha Vantage avec clés numérotées
      else if ('4. close' in point && typeof point['4. close'] === 'number') {
        closePrice = point['4. close'] as number;
      }
      // Sinon, essayer si c'est directement un nombre
      else if (typeof point === 'number') {
        closePrice = point;
      }
      
      if (closePrice === null || isNaN(closePrice)) return;
      
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return;
      
      points.push({
        timestamp: date.getTime(),
        price: closePrice,
        time: `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`,
      });
    });
    
    return points;
  }, [stockData.data]);

  // Calculer les données pour le second graphique (résultats des segments)
  const segmentResultsData = useMemo(() => {
    if (segments.length === 0) return [];
    
    // Trouver le segment le plus ancien (celui avec le segmentEnd le plus ancien)
    let oldestSegmentEndTime: number | null = null;
    if (segments.length > 0) {
      const sortedSegments = [...segments].sort((a, b) => {
        const timeA = new Date(a.segmentEnd).getTime();
        const timeB = new Date(b.segmentEnd).getTime();
        return timeA - timeB; // Ordre croissant (le plus ancien en premier)
      });
      oldestSegmentEndTime = new Date(sortedSegments[0].segmentEnd).getTime();
    }
    
    const results: Array<{ time: number; value: number; color: string; segmentId: string; isExtremity?: boolean; pointId?: string }> = [];
    let currentY = 0; // Commence à 0
    let pointCounter = 0; // Compteur pour créer des IDs uniques
    // Le premier segment commence au segmentEnd du segment le plus ancien (ou au début s'il n'y a pas de segment)
    const firstSegmentStartTime = oldestSegmentEndTime ?? (allPointsData.length > 0 ? allPointsData[0].timestamp : new Date(segments[0].segmentEnd).getTime());
    
    // Stocker les Y de départ de chaque segment pour gérer les discontinuités
    const segmentStartY: Record<string, number> = {};
    // Stocker le temps de fin réel de chaque segment (après tous les sous-segments)
    const segmentActualEndTime: Record<string, number> = {};
    
    segments.forEach((segment, index) => {
      
      // Parser is_result_correct (peut être une chaîne avec plusieurs valeurs)
      const isCorrectValues = segment.isResultCorrect 
        ? segment.isResultCorrect.trim().split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v))
        : [];
      
      // Parser result_interval (peut être une chaîne avec plusieurs valeurs)
      const intervalValues = segment.resultInterval
        ? segment.resultInterval.trim().split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v))
        : [];
      
      // Parser result (peut être une chaîne avec plusieurs valeurs)
      const resultValues = segment.result
        ? segment.result.trim().split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v))
        : [];
      
      // Si pas de valeurs, on passe au segment suivant
      if (isCorrectValues.length === 0 || intervalValues.length === 0 || resultValues.length === 0) {
        return;
      }
      
      // S'assurer que toutes les listes ont la même longueur (prendre le max)
      const maxLength = Math.max(isCorrectValues.length, intervalValues.length, resultValues.length);
      
      // Normaliser les listes (répéter la première valeur si nécessaire)
      const normalizedIntervals: number[] = [];
      const normalizedResults: number[] = [];
      const normalizedCorrect: number[] = [];
      
      for (let i = 0; i < maxLength; i++) {
        normalizedIntervals.push(intervalValues[i] ?? intervalValues[0] ?? 0);
        normalizedResults.push(resultValues[i] ?? resultValues[0] ?? 0);
        normalizedCorrect.push(isCorrectValues[i] ?? isCorrectValues[0] ?? 0);
      }
      
      // Déterminer si le segment précédent était juste
      let previousWasCorrect = true;
      if (index > 0) {
        const prevSegment = segments[index - 1];
        if (prevSegment.isResultCorrect) {
          const prevValues = prevSegment.isResultCorrect.trim().split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
          if (prevValues.length > 0) {
            // Un segment est juste si au moins une valeur est != 0
            previousWasCorrect = isSegmentCorrect(prevValues);
          }
        }
      }
      
      // Déterminer si ce segment est juste
      const segmentIsCorrect = isSegmentCorrect(normalizedCorrect);
      
      // Déterminer le Y de départ
      let startY: number;
      if (index === 0) {
        // Premier segment : commence à 0
        startY = 0;
      } else if (previousWasCorrect) {
        // Si le précédent était juste, on commence là où il s'est arrêté
        startY = currentY;
      } else {
        // Si le précédent était faux, on commence là où il a commencé (discontinuité)
        const prevSegmentId = segments[index - 1].id;
        startY = segmentStartY[prevSegmentId] ?? currentY;
      }
      
      // Stocker le Y de départ de ce segment
      segmentStartY[segment.id] = startY;
      
      // Point de départ du segment
      // Le premier segment commence à l'origine, les autres au temps de fin réel du précédent
      let startTime: number;
      if (index === 0) {
        startTime = firstSegmentStartTime;
      } else {
        // Utiliser le temps de fin réel du segment précédent (après tous ses sous-segments)
        const prevSegmentId = segments[index - 1].id;
        startTime = segmentActualEndTime[prevSegmentId] ?? new Date(segments[index - 1].segmentEnd).getTime();
      }
      
      // Traiter chaque paire (interval, result, isCorrect) pour créer les sous-segments
      // Les segments noirs sont calculés de la même manière que les segments justes
      let currentTime = startTime;
      let currentSegmentY = startY;
      
      for (let i = 0; i < maxLength; i++) {
        const interval = normalizedIntervals[i];
        const result = normalizedResults[i];
        const isCorrect = normalizedCorrect[i];
        
        // Convertir l'intervalle en millisecondes (on suppose que c'est en minutes)
        const intervalMs = interval * 60 * 1000;
        
        // Déterminer la couleur pour ce sous-segment
        const segmentColor = getSegmentColor(isCorrect, normalizedResults);
        
        // Point de départ de ce sous-segment
        const subSegmentStartY = currentSegmentY;
        // C'est une extrémité seulement si c'est le premier sous-segment
        const isStartExtremity = i === 0;
        results.push({
          time: currentTime,
          value: subSegmentStartY,
          color: segmentColor,
          segmentId: segment.id,
          isExtremity: isStartExtremity,
          pointId: `${segment.id}-${pointCounter++}`,
        });
        
        // Point d'arrivée de ce sous-segment
        // Les segments noirs sont calculés de la même manière que les segments justes
        // en utilisant les intervalles et résultats pour la représentation
        const endTime = currentTime + intervalMs;
        // Appliquer un poids logarithmique à l'intervalle : result * log(interval + 1)
        // Cela donne plus de poids aux intervalles supérieurs à 1, mais sans atteindre result * interval
        const weightedResult = result * Math.log(interval + 1);
        const endY = subSegmentStartY + weightedResult;
        // C'est une extrémité seulement si c'est le dernier sous-segment
        const isEndExtremity = i === maxLength - 1;
        results.push({
          time: endTime,
          value: endY,
          color: segmentColor,
          segmentId: segment.id,
          isExtremity: isEndExtremity,
          pointId: `${segment.id}-${pointCounter++}`,
        });
        
        // Mettre à jour pour le prochain sous-segment
        currentTime = endTime;
        currentSegmentY = endY;
      }
      
      // Stocker le temps de fin réel de ce segment (après tous les sous-segments)
      segmentActualEndTime[segment.id] = currentTime;
      
      // Mettre à jour currentY pour le prochain segment
      // Si ce segment était juste, on continue depuis là où il s'est arrêté
      // Si ce segment était faux, on garde currentY (pas de modification)
      if (segmentIsCorrect) {
        currentY = currentSegmentY;
      }
      // Sinon, currentY reste inchangé (discontinuité)
    });
    
    // Filtrer les résultats pour ne garder que ceux qui commencent après le segmentEnd du segment le plus ancien
    // (mais l'axe X affichera quand même depuis le début)
    if (oldestSegmentEndTime !== null) {
      return results.filter(r => r.time >= oldestSegmentEndTime!);
    }
    
    return results;
  }, [segments, allPointsData]);

  // Calculer les données complètes pour le troisième graphique (sans filtre)
  const segmentResultsDataComplete = useMemo(() => {
    if (segments.length === 0) return [];
    
    const results: Array<{ time: number; value: number; color: string; segmentId: string; isExtremity?: boolean; pointId?: string }> = [];
    let currentY = 0; // Commence à 0
    let pointCounter = 0; // Compteur pour créer des IDs uniques
    // Le premier segment commence au début des données
    const firstSegmentStartTime = allPointsData.length > 0 ? allPointsData[0].timestamp : new Date(segments[0].segmentEnd).getTime();
    
    // Stocker les Y de départ de chaque segment pour gérer les discontinuités
    const segmentStartY: Record<string, number> = {};
    // Stocker le temps de fin réel de chaque segment (après tous les sous-segments)
    const segmentActualEndTime: Record<string, number> = {};
    
    segments.forEach((segment, index) => {
      
      // Parser is_result_correct (peut être une chaîne avec plusieurs valeurs)
      const isCorrectValues = segment.isResultCorrect 
        ? segment.isResultCorrect.trim().split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v))
        : [];
      
      // Parser result_interval (peut être une chaîne avec plusieurs valeurs)
      const intervalValues = segment.resultInterval
        ? segment.resultInterval.trim().split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v))
        : [];
      
      // Parser result (peut être une chaîne avec plusieurs valeurs)
      const resultValues = segment.result
        ? segment.result.trim().split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v))
        : [];
      
      // Si pas de valeurs, on passe au segment suivant
      if (isCorrectValues.length === 0 || intervalValues.length === 0 || resultValues.length === 0) {
        return;
      }
      
      // S'assurer que toutes les listes ont la même longueur (prendre le max)
      const maxLength = Math.max(isCorrectValues.length, intervalValues.length, resultValues.length);
      
      // Normaliser les listes (répéter la première valeur si nécessaire)
      const normalizedIntervals: number[] = [];
      const normalizedResults: number[] = [];
      const normalizedCorrect: number[] = [];
      
      for (let i = 0; i < maxLength; i++) {
        normalizedIntervals.push(intervalValues[i] ?? intervalValues[0] ?? 0);
        normalizedResults.push(resultValues[i] ?? resultValues[0] ?? 0);
        normalizedCorrect.push(isCorrectValues[i] ?? isCorrectValues[0] ?? 0);
      }
      
      // Déterminer si le segment précédent était juste
      let previousWasCorrect = true;
      if (index > 0) {
        const prevSegment = segments[index - 1];
        if (prevSegment.isResultCorrect) {
          const prevValues = prevSegment.isResultCorrect.trim().split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
          if (prevValues.length > 0) {
            // Un segment est juste si au moins une valeur est != 0
            previousWasCorrect = isSegmentCorrect(prevValues);
          }
        }
      }
      
      // Déterminer si ce segment est juste
      const segmentIsCorrect = isSegmentCorrect(normalizedCorrect);
      
      // Déterminer le Y de départ
      let startY: number;
      if (index === 0) {
        // Premier segment : commence à 0
        startY = 0;
      } else if (previousWasCorrect) {
        // Si le précédent était juste, on commence là où il s'est arrêté
        startY = currentY;
      } else {
        // Si le précédent était faux, on commence là où il a commencé (discontinuité)
        const prevSegmentId = segments[index - 1].id;
        startY = segmentStartY[prevSegmentId] ?? currentY;
      }
      
      // Stocker le Y de départ de ce segment
      segmentStartY[segment.id] = startY;
      
      // Point de départ du segment
      // Le premier segment commence au début, les autres au temps de fin réel du précédent
      let startTime: number;
      if (index === 0) {
        startTime = firstSegmentStartTime;
      } else {
        // Utiliser le temps de fin réel du segment précédent (après tous ses sous-segments)
        const prevSegmentId = segments[index - 1].id;
        startTime = segmentActualEndTime[prevSegmentId] ?? new Date(segments[index - 1].segmentEnd).getTime();
      }
      
      // Traiter chaque paire (interval, result, isCorrect) pour créer les sous-segments
      // Les segments noirs sont calculés de la même manière que les segments justes
      let currentTime = startTime;
      let currentSegmentY = startY;
      
      for (let i = 0; i < maxLength; i++) {
        const interval = normalizedIntervals[i];
        const result = normalizedResults[i];
        const isCorrect = normalizedCorrect[i];
        
        // Convertir l'intervalle en millisecondes (on suppose que c'est en minutes)
        const intervalMs = interval * 60 * 1000;
        
        // Déterminer la couleur pour ce sous-segment
        const segmentColor = getSegmentColor(isCorrect, normalizedResults);
        
        // Point de départ de ce sous-segment
        const subSegmentStartY = currentSegmentY;
        // C'est une extrémité seulement si c'est le premier sous-segment
        const isStartExtremity = i === 0;
        results.push({
          time: currentTime,
          value: subSegmentStartY,
          color: segmentColor,
          segmentId: segment.id,
          isExtremity: isStartExtremity,
          pointId: `${segment.id}-${pointCounter++}`,
        });
        
        // Point d'arrivée de ce sous-segment
        // Les segments noirs sont calculés de la même manière que les segments justes
        // en utilisant les intervalles et résultats pour la représentation
        const endTime = currentTime + intervalMs;
        // Appliquer un poids logarithmique à l'intervalle : result * log(interval + 1)
        // Cela donne plus de poids aux intervalles supérieurs à 1, mais sans atteindre result * interval
        const weightedResult = result * Math.log(interval + 1);
        const endY = subSegmentStartY + weightedResult;
        // C'est une extrémité seulement si c'est le dernier sous-segment
        const isEndExtremity = i === maxLength - 1;
        results.push({
          time: endTime,
          value: endY,
          color: segmentColor,
          segmentId: segment.id,
          isExtremity: isEndExtremity,
          pointId: `${segment.id}-${pointCounter++}`,
        });
        
        // Mettre à jour pour le prochain sous-segment
        currentTime = endTime;
        currentSegmentY = endY;
      }
      
      // Stocker le temps de fin réel de ce segment (après tous les sous-segments)
      segmentActualEndTime[segment.id] = currentTime;
      
      // Mettre à jour currentY pour le prochain segment
      // Si ce segment était juste, on continue depuis là où il s'est arrêté
      // Si ce segment était faux, on garde currentY (pas de modification)
      if (segmentIsCorrect) {
        currentY = currentSegmentY;
      }
      // Sinon, currentY reste inchangé (discontinuité)
    });
    
    // Retourner tous les résultats sans filtre pour le graphique 3
    return results;
  }, [segments, allPointsData]);

  // Calculer le domaine Y pour le deuxième graphique (avec marge de 15%)
  const chart2YDomain = useMemo(() => {
    if (segmentResultsData.length === 0) return ['auto', 'auto'];
    
    const values = segmentResultsData.map(p => p.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    if (minValue === maxValue) {
      // Si toutes les valeurs sont identiques, ajouter une petite marge
      const margin = Math.abs(minValue) * 0.15 || 1;
      return [minValue - margin, maxValue + margin];
    }
    
    // Calculer la marge pour avoir 15% en haut et 15% en bas
    // La plage visible représente 70% (100% - 15% - 15%)
    const range = maxValue - minValue;
    const margin = range * 0.15 / 0.7;
    
    return [minValue - margin, maxValue + margin];
  }, [segmentResultsData]);

  // Trouver le premier point du graphique 2 (t0 = origine de l'abscisse)
  const t0Time = useMemo(() => {
    if (segmentResultsData.length === 0) {
      // Si pas de données de segments, utiliser le premier point de prix
      return allPointsData.length > 0 ? allPointsData[0].timestamp : 0;
    }
    // Trouver le temps minimum dans segmentResultsData
    const times = segmentResultsData.map(r => r.time);
    return Math.min(...times);
  }, [segmentResultsData, allPointsData]);

  // Filtrer les données du graphique 1 pour commencer à t0
  const chart1Data = useMemo(() => {
    if (allPointsData.length === 0) return [];
    return allPointsData.filter(p => p.timestamp >= t0Time);
  }, [allPointsData, t0Time]);

  // Calculer le domaine Y pour le premier graphique (avec marge de 15%)
  // Utiliser chart1Data (données filtrées) pour calculer le domaine
  const chart1YDomain = useMemo(() => {
    if (chart1Data.length === 0) return ['auto', 'auto'];
    
    const prices = chart1Data.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
      // Si tous les prix sont identiques, ajouter une petite marge
      const margin = Math.abs(minPrice) * 0.15 || 1;
      return [minPrice - margin, maxPrice + margin];
    }
    
    // Calculer la marge pour avoir 15% en haut et 15% en bas
    // La plage visible représente 70% (100% - 15% - 15%)
    const range = maxPrice - minPrice;
    const margin = range * 0.15 / 0.7;
    
    return [minPrice - margin, maxPrice + margin];
  }, [chart1Data]);

  // Calculer les données pour le graphique 3 : préserver la forme exacte du graphique 2
  // mais positionner chaque segment au prix correspondant en préservant les différences relatives
  const segmentResultsDataForChart3 = useMemo(() => {
    if (segmentResultsData.length === 0 || chart2YDomain[0] === 'auto' || chart2YDomain[1] === 'auto' || chart1YDomain[0] === 'auto' || chart1YDomain[1] === 'auto') {
      return segmentResultsData;
    }
    
    // Grouper les points par segmentId
    const pointsBySegment = new Map<string, Array<{ time: number; value: number; color: string; segmentId: string; isExtremity?: boolean; pointId?: string }>>();
    segmentResultsData.forEach(point => {
      if (!pointsBySegment.has(point.segmentId)) {
        pointsBySegment.set(point.segmentId, []);
      }
      pointsBySegment.get(point.segmentId)!.push(point);
    });
    
    const results: Array<{ time: number; value: number; color: string; segmentId: string; isExtremity?: boolean; pointId?: string }> = [];
    
    // Domaines pour la transformation
    const chart2Min = typeof chart2YDomain[0] === 'number' ? chart2YDomain[0] : 0;
    const chart2Max = typeof chart2YDomain[1] === 'number' ? chart2YDomain[1] : 1;
    const chart2Range = chart2Max - chart2Min;
    
    const chart1Min = typeof chart1YDomain[0] === 'number' ? chart1YDomain[0] : 0;
    const chart1Max = typeof chart1YDomain[1] === 'number' ? chart1YDomain[1] : 1;
    const chart1Range = chart1Max - chart1Min;
    
    // Pour chaque segment, trouver le prix au point de départ et calculer la transformation
    pointsBySegment.forEach((segmentPoints, segmentId) => {
      if (segmentPoints.length === 0) return;
      
      // Trier par temps pour trouver le premier point (point de départ)
      const sortedPoints = [...segmentPoints].sort((a, b) => a.time - b.time);
      const firstPoint = sortedPoints[0];
      const segmentStartTime = firstPoint.time;
      
      // Trouver le prix du graphique 1 au point de départ
      let pricePoint = allPointsData.find(p => {
        return Math.abs(p.timestamp - segmentStartTime) < 1000;
      });
      
      if (!pricePoint) {
        let minDistance = Infinity;
        for (const point of allPointsData) {
          const distance = Math.abs(point.timestamp - segmentStartTime);
          if (distance < minDistance) {
            minDistance = distance;
            pricePoint = point;
          }
        }
      }
      
      if (!pricePoint || chart2Range === 0) {
        // Si pas de prix trouvé ou domaine invalide, utiliser les valeurs originales
        segmentPoints.forEach(point => results.push(point));
        return;
      }
      
      // Calculer l'offset pour positionner le premier point au prix
      // On normalise d'abord la première valeur dans le domaine du graphique 2, puis on la mappe au domaine du graphique 1
      const firstValueNormalized = (firstPoint.value - chart2Min) / chart2Range;
      const targetPriceNormalized = (pricePoint.price - chart1Min) / chart1Range;
      const offset = (targetPriceNormalized - firstValueNormalized) * chart1Range;
      
      // Transformer toutes les valeurs du segment
      segmentPoints.forEach(point => {
        // Normaliser la valeur dans le domaine du graphique 2
        const normalizedValue = (point.value - chart2Min) / chart2Range;
        // Mapper au domaine du graphique 1 en préservant la position relative
        const mappedValue = chart1Min + normalizedValue * chart1Range;
        // Appliquer l'offset pour positionner le segment au prix
        const finalValue = mappedValue + offset;
        
        results.push({
          time: point.time,
          value: finalValue,
          color: point.color,
          segmentId: point.segmentId,
          isExtremity: point.isExtremity,
          pointId: point.pointId,
        });
      });
    });
    
    return results;
  }, [segmentResultsData, allPointsData, chart2YDomain, chart1YDomain]);

  // Calculer les segments de courbe lissée pour le graphique 4
  // Chaque série continue de segments justes (rouges/violets) forme une courbe qui :
  // - Démarre du point de départ du premier segment juste
  // - Passe par les points moyens entre chaque paire de segments justes
  // - Se termine au point de fin du dernier segment juste
  const chart4AverageDataSegments = useMemo(() => {
    if (segmentResultsDataForChart3.length === 0) return [];
    
    // Grouper les points par segmentId
    const pointsBySegment = new Map<string, Array<{ time: number; value: number; color: string; isExtremity?: boolean }>>();
    segmentResultsDataForChart3.forEach(point => {
      if (!pointsBySegment.has(point.segmentId)) {
        pointsBySegment.set(point.segmentId, []);
      }
      pointsBySegment.get(point.segmentId)!.push(point);
    });
    
    // Trier les segments par temps de début (premier point de chaque segment)
    const sortedSegments = Array.from(pointsBySegment.entries())
      .map(([segmentId, points]) => {
        const sortedPoints = [...points].sort((a, b) => a.time - b.time);
        return {
          segmentId,
          points: sortedPoints,
          startTime: sortedPoints[0]?.time ?? 0,
          isRed: sortedPoints[0]?.color === '#ef4444',
          isPurple: sortedPoints[0]?.color === '#9333ea',
        };
      })
      .sort((a, b) => a.startTime - b.startTime);
    
    // Identifier les séries continues de segments justes (rouges OU violets)
    // Les segments rouges et violets sont traités comme une seule série continue
    // On garde aussi l'information du segment noir suivant (s'il existe) pour ajuster la fin de la courbe
    const correctSeries: Array<{ segments: Array<typeof sortedSegments[0]>, nextBlackSegment?: typeof sortedSegments[0] }> = [];
    let currentSeries: Array<typeof sortedSegments[0]> = [];
    
    sortedSegments.forEach((segment, index) => {
      if (segment.isRed || segment.isPurple) {
        // Si c'est un segment rouge ou violet (juste), l'ajouter à la série actuelle
        currentSeries.push(segment);
      } else {
        // Si c'est un segment noir, terminer la série actuelle avec l'info du segment noir suivant
        if (currentSeries.length > 0) {
          correctSeries.push({
            segments: currentSeries,
            nextBlackSegment: segment
          });
          currentSeries = [];
        }
      }
    });
    
    // Ajouter la dernière série si elle existe (sans segment noir suivant)
    if (currentSeries.length > 0) {
      correctSeries.push({
        segments: currentSeries
      });
    }
    
    // Pour chaque série continue de segments justes (rouges/violets), créer une courbe
    // La courbe doit passer par des points fictifs (non affichés) :
    // - Au niveau de chaque départ et fin de segment juste
    // - Quand il y a un départ et une fin au même timestamp, utiliser la moyenne
    // - Si un segment noir suit, ajuster le dernier point pour qu'il soit entre l'avant-dernier point et le premier point noir
    const curveSegments: Array<Array<{ time: number; average: number }>> = [];
    
    correctSeries.forEach((seriesData) => {
      const series = seriesData.segments;
      if (series.length === 0) return;
      
      // Collecter tous les points de départ et de fin des segments justes (rouges/violets)
      // Grouper par timestamp pour gérer les cas où départ et fin sont au même timestamp
      const pointsByTime = new Map<number, Array<{ value: number; isStart: boolean; isEnd: boolean }>>();
      
      series.forEach((segment) => {
        const sortedPoints = segment.points.sort((a, b) => a.time - b.time);
        
        // Point de départ (premier point)
        if (sortedPoints.length > 0) {
          const startPoint = sortedPoints[0];
          if (!pointsByTime.has(startPoint.time)) {
            pointsByTime.set(startPoint.time, []);
          }
          pointsByTime.get(startPoint.time)!.push({
            value: startPoint.value,
            isStart: true,
            isEnd: false,
          });
        }
        
        // Point de fin (dernier point)
        if (sortedPoints.length > 0) {
          const endPoint = sortedPoints[sortedPoints.length - 1];
          if (!pointsByTime.has(endPoint.time)) {
            pointsByTime.set(endPoint.time, []);
          }
          pointsByTime.get(endPoint.time)!.push({
            value: endPoint.value,
            isStart: false,
            isEnd: true,
          });
        }
      });
      
      // Créer les points fictifs pour la courbe
      // Si un timestamp a plusieurs points (départ et fin), calculer la moyenne
      const curvePoints: Array<{ time: number; average: number }> = [];
      const sortedTimes = Array.from(pointsByTime.keys()).sort((a, b) => a - b);
      
      sortedTimes.forEach((time) => {
        const points = pointsByTime.get(time)!;
        if (points.length === 1) {
          // Un seul point : utiliser sa valeur
          curvePoints.push({ time, average: points[0].value });
        } else {
          // Plusieurs points au même timestamp : calculer la moyenne
          const average = points.reduce((sum, p) => sum + p.value, 0) / points.length;
          curvePoints.push({ time, average });
        }
      });
      
      // Trier par temps pour s'assurer que l'ordre est correct
      curvePoints.sort((a, b) => a.time - b.time);
      
      // Si un segment noir suit, ajuster le dernier point de la courbe
      // La courbe doit se terminer entre le dernier point rouge et le premier point noir
      // (moyenne entre les deux) sans passer par le dernier point rouge
      if (seriesData.nextBlackSegment && curvePoints.length > 0) {
        const blackSegmentPoints = seriesData.nextBlackSegment.points.sort((a, b) => a.time - b.time);
        
        if (blackSegmentPoints.length > 0) {
          const firstBlackPoint = blackSegmentPoints[0];
          const lastRedPoint = curvePoints[curvePoints.length - 1];
          
          // Calculer le point intermédiaire entre le dernier point rouge et le premier point noir
          // (moyenne entre les deux) - cela représente la vraie fin de la courbe
          const intermediateTime = (lastRedPoint.time + firstBlackPoint.time) / 2;
          const intermediateValue = (lastRedPoint.average + firstBlackPoint.value) / 2;
          
          // Remplacer le dernier point de la courbe par le point intermédiaire
          // Cela fait que la courbe se termine entre le dernier point rouge et le premier point noir
          // sans passer par le dernier point rouge lui-même
          curvePoints[curvePoints.length - 1] = {
            time: intermediateTime,
            average: intermediateValue
          };
        }
      }
      
      if (curvePoints.length > 0) {
        curveSegments.push(curvePoints);
      }
    });
    
    return curveSegments;
  }, [segmentResultsDataForChart3]);

  // Calculer le domaine X pour le premier graphique (commence à t0)
  const chart1XDomain = useMemo(() => {
    if (allPointsData.length === 0) return ['dataMin', 'dataMax'];
    
    const startTime = t0Time;
    const endTime = allPointsData[allPointsData.length - 1].timestamp;
    
    return [startTime, endTime];
  }, [allPointsData, t0Time]);

  // Calculer le domaine X pour le deuxième graphique (commence à t0)
  const chart2XDomain = useMemo(() => {
    if (allPointsData.length === 0) return ['dataMin', 'dataMax'];
    
    const startTime = t0Time;
    const endTime = allPointsData[allPointsData.length - 1].timestamp;
    
    return [startTime, endTime];
  }, [allPointsData, t0Time]);

  // Calculer le domaine X pour le troisième graphique (combiné) - commence à t0
  const chart3XDomain = useMemo(() => {
    if (allPointsData.length === 0) return ['dataMin', 'dataMax'];
    
    const startTime = t0Time;
    const endTime = allPointsData[allPointsData.length - 1].timestamp;
    
    return [startTime, endTime];
  }, [allPointsData, t0Time]);

  // Fonction helper pour diviser un titre en 2 lignes de manière intelligente
  const splitTitleIntoTwoLines = (title: string, maxWidth: number, fontSize: number = 16): [string, string] => {
    // Estimation approximative : ~6 pixels par caractère pour font-size 12, ~8 pour font-size 16
    const charWidth = fontSize <= 12 ? 6 : fontSize * 0.5;
    const maxCharsPerLine = Math.max(10, Math.floor(maxWidth / charWidth)); // Minimum 10 caractères
    
    // Si le titre est assez court, le mettre sur une seule ligne
    if (title.length <= maxCharsPerLine) {
      return [title, ''];
    }
    
    // Diviser le titre en mots
    const words = title.split(' ');
    
    // Si un seul mot est plus long que maxCharsPerLine, le couper
    if (words.length === 1 && words[0].length > maxCharsPerLine) {
      const midPoint = Math.floor(words[0].length / 2);
      return [words[0].substring(0, midPoint), words[0].substring(midPoint)];
    }
    
    // Trouver le meilleur point de coupure (au milieu)
    let firstLine = '';
    let secondLine = '';
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      
      // Si on peut ajouter ce mot à la première ligne
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        // On a atteint la limite, mettre le reste sur la deuxième ligne
        if (currentLine) {
          firstLine = currentLine;
          secondLine = words.slice(i).join(' ');
        } else {
          // Le mot seul est trop long, le couper
          const midPoint = Math.floor(words[i].length / 2);
          firstLine = words[i].substring(0, midPoint);
          secondLine = words[i].substring(midPoint) + (i < words.length - 1 ? ' ' + words.slice(i + 1).join(' ') : '');
        }
        break;
      }
    }
    
    // Si on n'a pas rempli la première ligne, équilibrer
    if (!firstLine && currentLine) {
      firstLine = currentLine;
    }
    
    // Si la deuxième ligne est vide mais qu'on a plusieurs mots, essayer de mieux équilibrer
    if (!secondLine && words.length > 1 && firstLine) {
      // Si la première ligne est trop courte, rééquilibrer
      if (firstLine.length < title.length * 0.3) {
        const midPoint = Math.floor(words.length / 2);
        firstLine = words.slice(0, midPoint).join(' ');
        secondLine = words.slice(midPoint).join(' ');
      } else {
        // La première ligne est bonne, mettre le reste sur la deuxième
        const firstLineWords = firstLine.split(' ');
        const firstLineWordCount = firstLineWords.length;
        if (firstLineWordCount < words.length) {
          secondLine = words.slice(firstLineWordCount).join(' ');
        }
      }
    }
    
    // Vérifier que la deuxième ligne n'est pas trop longue
    if (secondLine && secondLine.length > maxCharsPerLine) {
      // Si la deuxième ligne est trop longue, essayer de mieux équilibrer
      const allWords = title.split(' ');
      const midPoint = Math.floor(allWords.length / 2);
      firstLine = allWords.slice(0, midPoint).join(' ');
      secondLine = allWords.slice(midPoint).join(' ');
    }
    
    return [firstLine || title, secondLine];
  };

  // Fonction helper pour créer un SVG complet avec titre et légendes
  const createCompleteSVG = (
    chartId: string,
    title: string,
    xAxisLabel: string,
    yAxisLabel: string,
    legends: Array<{ color: string; text: string }>,
    correlationStats?: {
      averageRate?: number;
      highIntensityRate?: number;
    }
  ): string => {
    const svgElement = document.querySelector(`#${chartId} .recharts-wrapper svg`) as SVGElement;
    if (!svgElement) {
      throw new Error('Graphique non trouvé');
    }
    
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    const chartWidth = svgElement.clientWidth || 800;
    const chartHeight = svgElement.clientHeight || 400;
    
    // Espace pour le titre en haut (augmenté pour 2 lignes)
    const titleHeight = 60;
    // Espace pour les légendes en bas (sera calculé dynamiquement)
    const baseLegendHeight = 40;
    // Espace pour le label Y à gauche
    const yLabelWidth = 80;
    // Espace pour le label X en bas
    const xLabelHeight = 30;
    
    // Maximum de légendes par ligne
    const maxLegendsPerLine = 3;
    
    // Calculer la hauteur nécessaire pour les légendes
    const calcLegendStartX = yLabelWidth + 20;
    const calcAvailableWidthPerLegend = ((chartWidth + yLabelWidth) - calcLegendStartX - 20) / maxLegendsPerLine;
    const calcAvailableTextWidthPerLegend = calcAvailableWidthPerLegend - 40 - 8 - 15; // ligne + espace + spacing
    const calcLegendLineHeight = 18;
    
    let legendHeight = baseLegendHeight;
    let calcLegendsInCurrentLine = 0;
    let calcCurrentLegendY = 0;
    
    legends.forEach((legend) => {
      // Si on a déjà 3 légendes sur cette ligne, passer à la ligne suivante
      if (calcLegendsInCurrentLine >= maxLegendsPerLine) {
        calcCurrentLegendY += calcLegendLineHeight * 2 + 5; // 2 lignes max par légende + espacement
        calcLegendsInCurrentLine = 0;
      }
      
      const legendTextLines = splitTitleIntoTwoLines(legend.text, calcAvailableTextWidthPerLegend, 12);
      const hasSecondLine = legendTextLines[1] !== '';
      
      // Mettre à jour la hauteur totale nécessaire
      const neededHeight = calcCurrentLegendY + calcLegendLineHeight * (hasSecondLine ? 2 : 1) + 20;
      if (neededHeight > legendHeight) {
        legendHeight = neededHeight;
      }
      
      calcLegendsInCurrentLine++;
    });
    
    // Ajouter de l'espace pour les stats de corrélation si présentes
    let statsHeight = 0;
    if (correlationStats && (correlationStats.averageRate !== undefined || correlationStats.highIntensityRate !== undefined)) {
      statsHeight = 50; // Espace pour les 2 lignes de stats + espacement
    }
    
    const totalWidth = chartWidth + yLabelWidth;
    const totalHeight = titleHeight + chartHeight + xLabelHeight + legendHeight + statsHeight;
    
    // Créer un nouveau SVG wrapper
    const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    wrapper.setAttribute('width', totalWidth.toString());
    wrapper.setAttribute('height', totalHeight.toString());
    wrapper.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
    
    // Diviser le titre en 2 lignes
    const availableWidth = totalWidth - 40; // Marge de 20px de chaque côté
    const [firstLine, secondLine] = splitTitleIntoTwoLines(title, availableWidth, 16);
    
    // Ajouter la première ligne du titre
    const titleElement1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleElement1.setAttribute('x', (totalWidth / 2).toString());
    titleElement1.setAttribute('y', '20');
    titleElement1.setAttribute('text-anchor', 'middle');
    titleElement1.setAttribute('font-size', '16');
    titleElement1.setAttribute('font-weight', 'bold');
    titleElement1.setAttribute('fill', '#000000');
    titleElement1.textContent = firstLine;
    wrapper.appendChild(titleElement1);
    
    // Ajouter la deuxième ligne du titre si elle existe
    if (secondLine) {
      const titleElement2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleElement2.setAttribute('x', (totalWidth / 2).toString());
      titleElement2.setAttribute('y', '40');
      titleElement2.setAttribute('text-anchor', 'middle');
      titleElement2.setAttribute('font-size', '16');
      titleElement2.setAttribute('font-weight', 'bold');
      titleElement2.setAttribute('fill', '#000000');
      titleElement2.textContent = secondLine;
      wrapper.appendChild(titleElement2);
    }
    
    // Déplacer le graphique SVG original
    svgClone.setAttribute('x', yLabelWidth.toString());
    svgClone.setAttribute('y', titleHeight.toString());
    wrapper.appendChild(svgClone);
    
    // Ajouter le label Y (renversé)
    const yLabelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    yLabelGroup.setAttribute('transform', `translate(${yLabelWidth / 2}, ${titleHeight + chartHeight / 2}) rotate(-90)`);
    const yLabelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yLabelText.setAttribute('text-anchor', 'middle');
    yLabelText.setAttribute('font-size', '12');
    yLabelText.setAttribute('fill', '#666666');
    yLabelText.textContent = yAxisLabel;
    yLabelGroup.appendChild(yLabelText);
    wrapper.appendChild(yLabelGroup);
    
    // Ajouter le label X
    const xLabelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLabelText.setAttribute('x', (totalWidth / 2).toString());
    xLabelText.setAttribute('y', (titleHeight + chartHeight + xLabelHeight / 2 + 5).toString());
    xLabelText.setAttribute('text-anchor', 'middle');
    xLabelText.setAttribute('font-size', '12');
    xLabelText.setAttribute('fill', '#666666');
    xLabelText.textContent = xAxisLabel;
    wrapper.appendChild(xLabelText);
    
    // Ajouter les légendes avec gestion du retour à la ligne
    let legendX = yLabelWidth + 20;
    let currentLegendY = titleHeight + chartHeight + xLabelHeight + 20;
    const legendLineLength = 40;
    const legendSpacing = 15;
    const legendLineHeight = 18; // Hauteur d'une ligne de légende
    const legendStartX = yLabelWidth + 20;
    
    // Calculer la largeur disponible pour chaque légende (en divisant par le nombre max de légendes par ligne)
    const availableWidthPerLegend = (totalWidth - legendStartX - 20) / maxLegendsPerLine; // Marge droite de 20px
    const availableTextWidthPerLegend = availableWidthPerLegend - legendLineLength - 8 - legendSpacing;
    
    let legendsInCurrentLine = 0;
    
    legends.forEach((legend, index) => {
      // Si on a déjà 3 légendes sur cette ligne, passer à la ligne suivante
      if (legendsInCurrentLine >= maxLegendsPerLine) {
        legendX = legendStartX;
        currentLegendY += legendLineHeight * 2 + 5; // Espacement entre les lignes (2 lignes max par légende)
        legendsInCurrentLine = 0;
      }
      
      // Diviser le texte de la légende en lignes si nécessaire
      // Utiliser la largeur disponible pour une légende
      const legendTextLines = splitTitleIntoTwoLines(legend.text, availableTextWidthPerLegend, 12);
      
      // Ligne de couleur (alignée avec la première ligne de texte)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', legendX.toString());
      line.setAttribute('y1', (currentLegendY + 4).toString());
      line.setAttribute('x2', (legendX + legendLineLength).toString());
      line.setAttribute('y2', (currentLegendY + 4).toString());
      line.setAttribute('stroke', legend.color);
      line.setAttribute('stroke-width', '2');
      wrapper.appendChild(line);
      
      // Première ligne du texte de la légende
      const legendText1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      legendText1.setAttribute('x', (legendX + legendLineLength + 8).toString());
      legendText1.setAttribute('y', (currentLegendY + 4).toString());
      legendText1.setAttribute('font-size', '12');
      legendText1.setAttribute('fill', '#666666');
      legendText1.textContent = legendTextLines[0];
      wrapper.appendChild(legendText1);
      
      // Deuxième ligne du texte de la légende si nécessaire
      if (legendTextLines[1]) {
        const legendText2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        legendText2.setAttribute('x', (legendX + legendLineLength + 8).toString());
        legendText2.setAttribute('y', (currentLegendY + legendLineHeight + 4).toString());
        legendText2.setAttribute('font-size', '12');
        legendText2.setAttribute('fill', '#666666');
        legendText2.textContent = legendTextLines[1];
        wrapper.appendChild(legendText2);
      }
      
      // Passer à la prochaine position (largeur fixe par légende)
      legendX += availableWidthPerLegend;
      legendsInCurrentLine++;
    });
    
    // Ajouter les stats de corrélation si fournies (uniquement pour le graphique 4)
    if (correlationStats) {
      const statsY = currentLegendY + legendLineHeight + 10;
      let statsOffset = 0;
      
      if (correlationStats.averageRate !== undefined) {
        const statsLabel1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        statsLabel1.setAttribute('x', (yLabelWidth + 20).toString());
        statsLabel1.setAttribute('y', (statsY + statsOffset).toString());
        statsLabel1.setAttribute('font-size', '12');
        statsLabel1.setAttribute('fill', '#666666');
        statsLabel1.setAttribute('font-weight', '500');
        statsLabel1.textContent = 'Taux de corrélation moyen :';
        wrapper.appendChild(statsLabel1);
        
        const statsValue1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const value1X = yLabelWidth + 20 + 200; // Position après le label
        statsValue1.setAttribute('x', value1X.toString());
        statsValue1.setAttribute('y', (statsY + statsOffset).toString());
        statsValue1.setAttribute('font-size', '12');
        statsValue1.setAttribute('fill', correlationStats.averageRate >= 50 ? '#16a34a' : '#dc2626');
        statsValue1.setAttribute('font-weight', 'bold');
        statsValue1.textContent = `${correlationStats.averageRate.toFixed(2)}%`;
        wrapper.appendChild(statsValue1);
        
        statsOffset += 20;
      }
      
      if (correlationStats.highIntensityRate !== undefined) {
        const statsLabel2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        statsLabel2.setAttribute('x', (yLabelWidth + 20).toString());
        statsLabel2.setAttribute('y', (statsY + statsOffset).toString());
        statsLabel2.setAttribute('font-size', '12');
        statsLabel2.setAttribute('fill', '#666666');
        statsLabel2.setAttribute('font-weight', '500');
        statsLabel2.textContent = 'Taux de corrélation à forte intensité :';
        wrapper.appendChild(statsLabel2);
        
        const statsValue2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const value2X = yLabelWidth + 20 + 280; // Position après le label
        statsValue2.setAttribute('x', value2X.toString());
        statsValue2.setAttribute('y', (statsY + statsOffset).toString());
        statsValue2.setAttribute('font-size', '12');
        statsValue2.setAttribute('fill', correlationStats.highIntensityRate >= 50 ? '#16a34a' : '#dc2626');
        statsValue2.setAttribute('font-weight', 'bold');
        statsValue2.textContent = `${correlationStats.highIntensityRate.toFixed(2)}%`;
        wrapper.appendChild(statsValue2);
      }
    }
    
    return new XMLSerializer().serializeToString(wrapper);
  };

  // Fonction pour télécharger le premier graphique
  const handleDownloadChart1 = () => {
    try {
      const title = `Graphique 1 : Graphique du cours de ${stockData.symbol} le ${stockData.date}`;
      const xAxisLabel = 'Temps en Heure:Minutes';
      const yAxisLabel = 'Prix du cours en Dollars US ($)';
      const legends = [
        { color: '#3b82f6', text: 'prix du cours du marché en fonction du temps' }
      ];
      
      const svgString = createCompleteSVG('chart1', title, xAxisLabel, yAxisLabel, legends);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `stream-all-points-${stockData.id}-${new Date().toISOString()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors du téléchargement du graphique');
      console.error(error);
    }
  };

  // Fonction pour télécharger le second graphique
  const handleDownloadChart2 = () => {
    try {
      const title = `Graphique 2 : Graphique des anticipations du cours de ${stockData.symbol} le ${stockData.date}`;
      const xAxisLabel = 'Temps en Heure:Minutes';
      const yAxisLabel = 'Intensité des prédictions (unité arbitraire)';
      const legends = [
        { color: '#ef4444', text: 'prédiction juste avec une tendance faible' },
        { color: '#9333ea', text: 'prédiction juste avec une tendance forte' },
        { color: '#000000', text: 'prédiction non vérifiable nécessitant un ajustement' }
      ];
      
      const svgString = createCompleteSVG('chart2', title, xAxisLabel, yAxisLabel, legends);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `stream-results-${stockData.id}-${new Date().toISOString()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors du téléchargement du graphique');
      console.error(error);
    }
  };

  // Fonction pour télécharger le graphique combiné
  const handleDownloadChart3 = () => {
    try {
      const title = `Graphique 3 : Graphique du cours de ${stockData.symbol} le ${stockData.date} avec les anticipations réalisées et représentée dans le graphique 2, reportées sur le moment du cours où elles ont eu lieu`;
      const xAxisLabel = 'Temps en Heure:Minutes';
      const yAxisLabel = 'Prix du cours en Dollars US ($)';
      const legends = [
        { color: '#3b82f6', text: 'prix du cours du marché en fonction du temps' },
        { color: '#ef4444', text: 'prédiction juste avec une tendance faible' },
        { color: '#9333ea', text: 'prédiction juste avec une tendance forte' },
        { color: '#000000', text: 'prédiction non vérifiable nécessitant un ajustement' }
      ];
      
      const svgString = createCompleteSVG('chart3', title, xAxisLabel, yAxisLabel, legends);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `stream-combined-${stockData.id}-${new Date().toISOString()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors du téléchargement du graphique');
      console.error(error);
    }
  };

  // Fonction pour télécharger le quatrième graphique
  const handleDownloadChart4 = () => {
    try {
      const title = `Graphique 4 : Corrélation comportementale a l'actif ${stockData.symbol} le ${stockData.date}`;
      const xAxisLabel = 'Temps en Heure:Minutes';
      const yAxisLabel = 'Prix du cours en Dollars US ($)';
      const legends = [
        { color: '#3b82f6', text: 'prix du cours du marché en fonction du temps' },
        { color: '#ef4444', text: 'Corrélation comportementale vérifiée à la courbe' }
      ];
      
      const correlationStats = {
        averageRate: predictionStats?.successRate,
        highIntensityRate: resultStats06?.successRate,
      };
      
      const svgString = createCompleteSVG('chart4', title, xAxisLabel, yAxisLabel, legends, correlationStats);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `stream-smoothed-${stockData.id}-${new Date().toISOString()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors du téléchargement du graphique');
      console.error(error);
    }
  };

  // Formater le temps pour l'axe X
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
  };

  // Calculer des ticks réguliers pour les axes X
  // Toujours inclure le premier et le dernier point, puis répartir les autres de manière homogène
  // Le nombre de ticks est ajusté pour éviter le chevauchement des labels
  const calculateXAxisTicks = useMemo(() => {
    if (allPointsData.length === 0) return [];
    
    const startTime = t0Time;
    const endTime = allPointsData[allPointsData.length - 1].timestamp;
    const range = endTime - startTime;
    
    if (range === 0) {
      return [startTime];
    }
    
    // Estimer la largeur nécessaire pour chaque label (format "HH:MM" = ~50-60px)
    // En supposant une largeur de graphique d'environ 800-1000px (avec padding de 60px à gauche)
    const estimatedLabelWidth = 55; // pixels par label
    const estimatedChartWidth = 850; // pixels disponibles pour les ticks (approximation)
    const maxTicks = Math.max(2, Math.floor(estimatedChartWidth / estimatedLabelWidth));
    
    // Utiliser un nombre raisonnable de ticks (entre 6 et maxTicks)
    // Cela garantit un bon remplissage sans chevauchement
    const targetTicks = Math.min(Math.max(6, maxTicks), 20); // Entre 6 et 20 ticks maximum
    
    // Si on a seulement 1 ou 2 ticks, retourner juste le début et la fin
    if (targetTicks <= 2) {
      return [startTime, endTime];
    }
    
    // Calculer l'intervalle pour répartir les ticks de manière homogène
    const interval = range / (targetTicks - 1);
    
    // Générer les ticks réguliers, en s'assurant que le premier et le dernier sont toujours inclus
    const ticks: number[] = [startTime]; // Toujours inclure la première valeur
    
    // Générer les ticks intermédiaires
    for (let i = 1; i < targetTicks - 1; i++) {
      const tickTime = startTime + (interval * i);
      ticks.push(Math.round(tickTime));
    }
    
    ticks.push(endTime); // Toujours inclure la dernière valeur
    
    // S'assurer qu'il n'y a pas de doublons et que les ticks sont triés
    const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);
    
    return uniqueTicks;
  }, [allPointsData, t0Time]);

  // Calculer des ticks réguliers pour l'axe Y du graphique 1 (prix)
  // Toujours inclure le premier et le dernier point, puis répartir les autres de manière homogène
  // Le nombre de ticks est ajusté pour éviter le chevauchement des labels
  const calculateChart1YTicks = useMemo(() => {
    if (chart1Data.length === 0) return [];
    
    const prices = chart1Data.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) return [minPrice];
    
    // Utiliser le domaine Y pour obtenir les valeurs min/max avec marges
    const domain = chart1YDomain;
    const domainMin = typeof domain[0] === 'number' ? domain[0] : minPrice;
    const domainMax = typeof domain[1] === 'number' ? domain[1] : maxPrice;
    
    const range = domainMax - domainMin;
    
    if (range === 0) {
      return [domainMin];
    }
    
    // Estimer la hauteur nécessaire pour chaque label (format "$XX.XX" = ~20-25px)
    // En supposant une hauteur de graphique d'environ 400px
    const estimatedLabelHeight = 22; // pixels par label
    const estimatedChartHeight = 380; // pixels disponibles pour les ticks (approximation, avec marges)
    const maxTicks = Math.max(2, Math.floor(estimatedChartHeight / estimatedLabelHeight));
    
    // Utiliser un nombre raisonnable de ticks (entre 6 et maxTicks)
    // Cela garantit un bon remplissage sans chevauchement
    const targetTicks = Math.min(Math.max(6, maxTicks), 18); // Entre 6 et 18 ticks maximum
    
    // Si on a seulement 1 ou 2 ticks, retourner juste le début et la fin
    if (targetTicks <= 2) {
      return [domainMin, domainMax];
    }
    
    // Calculer l'intervalle pour répartir les ticks de manière homogène
    const interval = range / (targetTicks - 1);
    
    // Générer les ticks réguliers, en s'assurant que le premier et le dernier sont toujours inclus
    const ticks: number[] = [domainMin]; // Toujours inclure la première valeur
    
    // Générer les ticks intermédiaires
    for (let i = 1; i < targetTicks - 1; i++) {
      const tickValue = domainMin + (interval * i);
      // Arrondir à 2 décimales pour les prix
      ticks.push(Math.round(tickValue * 100) / 100);
    }
    
    ticks.push(domainMax); // Toujours inclure la dernière valeur
    
    // S'assurer qu'il n'y a pas de doublons et que les ticks sont triés
    const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);
    
    return uniqueTicks;
  }, [chart1Data, chart1YDomain]);

  // Calculer des ticks réguliers pour l'axe Y du graphique 2 (valeurs)
  // Toujours inclure le min, le max du domaine et le 0 (centré visuellement)
  const calculateChart2YTicks = useMemo(() => {
    if (segmentResultsData.length === 0) return [];
    
    const values = segmentResultsData.map(p => p.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    if (minValue === maxValue) return [minValue];
    
    // Utiliser le domaine Y pour obtenir les valeurs min/max avec marges
    const domain = chart2YDomain;
    const domainMin = typeof domain[0] === 'number' ? domain[0] : minValue;
    const domainMax = typeof domain[1] === 'number' ? domain[1] : maxValue;
    
    const range = domainMax - domainMin;
    
    if (range === 0) {
      return [domainMin];
    }
    
    // Estimer la hauteur nécessaire pour chaque label
    const estimatedLabelHeight = 22; // pixels par label
    const estimatedChartHeight = 380; // pixels disponibles pour les ticks
    const maxTicks = Math.max(2, Math.floor(estimatedChartHeight / estimatedLabelHeight));
    
    // Utiliser un nombre raisonnable de ticks (entre 6 et maxTicks)
    const targetTicks = Math.min(Math.max(6, maxTicks), 18);
    
    // Ticks fixes : toujours inclure min, max et 0 (si dans le domaine)
    const ticks: number[] = [domainMin, domainMax];
    
    // Ajouter 0 s'il est dans le domaine
    const hasZero = 0 >= domainMin && 0 <= domainMax;
    if (hasZero) {
      ticks.push(0);
    }
    
    // Si on a seulement les ticks fixes, les retourner triés
    if (ticks.length >= targetTicks) {
      return Array.from(new Set(ticks)).sort((a, b) => a - b);
    }
    
    // Calculer combien de ticks supplémentaires on peut ajouter
    const remainingTicks = targetTicks - ticks.length;
    
    if (hasZero) {
      // Répartir les ticks de manière symétrique autour de 0 pour le centrer visuellement
      const rangeBeforeZero = Math.abs(0 - domainMin);
      const rangeAfterZero = Math.abs(domainMax - 0);
      const totalRange = rangeBeforeZero + rangeAfterZero;
      
      // Calculer le nombre de ticks de chaque côté de 0
      const ticksBeforeZero = Math.max(1, Math.floor((rangeBeforeZero / totalRange) * remainingTicks));
      const ticksAfterZero = remainingTicks - ticksBeforeZero;
      
      // Ajouter les ticks avant 0
      if (ticksBeforeZero > 0 && rangeBeforeZero > 0) {
        const intervalBefore = rangeBeforeZero / (ticksBeforeZero + 1);
        for (let i = 1; i <= ticksBeforeZero; i++) {
          const tickValue = domainMin + (intervalBefore * i);
          if (tickValue < 0 && tickValue > domainMin) {
            ticks.push(Math.round(tickValue * 100) / 100);
          }
        }
      }
      
      // Ajouter les ticks après 0
      if (ticksAfterZero > 0 && rangeAfterZero > 0) {
        const intervalAfter = rangeAfterZero / (ticksAfterZero + 1);
        for (let i = 1; i <= ticksAfterZero; i++) {
          const tickValue = 0 + (intervalAfter * i);
          if (tickValue > 0 && tickValue < domainMax) {
            ticks.push(Math.round(tickValue * 100) / 100);
          }
        }
      }
    } else {
      // Pas de 0 dans le domaine, répartir uniformément
      const interval = range / (remainingTicks + 1);
      for (let i = 1; i <= remainingTicks; i++) {
        const tickValue = domainMin + (interval * i);
        if (tickValue < domainMax) {
          ticks.push(Math.round(tickValue * 100) / 100);
        }
      }
    }
    
    // S'assurer qu'il n'y a pas de doublons et que les ticks sont triés
    const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);
    
    return uniqueTicks;
  }, [segmentResultsData, chart2YDomain]);

  if (allPointsData.length === 0) {
    return (
      <Card.Root>
        <Card.Body textAlign="center" py={12}>
          <Spinner size="lg" />
          <Text mt={4} color="fg.muted">
            Chargement des données...
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Informations du stream */}
      <Card.Root>
        <Card.Header>
          <Heading size="lg" color="fg.default">
            {stockData.symbol} - {stockData.date}
          </Heading>
        </Card.Header>
        <Card.Body>
          <HStack gap={4}>
            <Text color="fg.muted">
              {allPointsData.length} points
            </Text>
            <Text color="fg.muted">
              {segments.length} segments
            </Text>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Premier graphique : Tous les points */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between" align="center" w="100%">
            <Heading size="md" color="fg.default">
              Graphique 1 : Graphique du cours de {stockData.symbol} le {stockData.date}
            </Heading>
            <Button
              size="sm"
              colorPalette="blue"
              variant="outline"
              onClick={handleDownloadChart1}
            >
              <Download size={16} style={{ marginRight: '8px' }} />
              Télécharger
            </Button>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack gap={2} align="stretch">
            {/* Graphique avec labels */}
            <Box position="relative" width="100%" height={400}>
              {allPointsData.length === 0 ? (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <Text color="fg.muted">Aucune donnée à afficher ({Object.keys(stockData.data || {}).length} clés dans data)</Text>
                </Box>
              ) : (
                <>
                  {/* Label Y (renversé, de bas en haut) */}
                  <Box
                    position="absolute"
                    left="-60px"
                    top="50%"
                    transform="translateY(-50%) rotate(-90deg)"
                    transformOrigin="center"
                    whiteSpace="nowrap"
                  >
                    <Text fontSize="sm" color="fg.muted">
                      Prix du cours en Dollars US ($)
                    </Text>
                  </Box>
                  <Box id="chart1" width="100%" height="100%" pl="60px">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart1Data}>
                        <XAxis
                          dataKey="timestamp"
                          type="number"
                          scale="time"
                          domain={chart1XDomain}
                          tickFormatter={formatTime}
                          ticks={calculateXAxisTicks}
                        />
                        <YAxis 
                          domain={chart1YDomain}
                          tickFormatter={(value) => `$${value.toFixed(2)}`}
                          ticks={calculateChart1YTicks}
                        />
                        <Tooltip
                          labelFormatter={(value) => formatTime(Number(value))}
                          formatter={(value: number) => [value.toFixed(2), 'Prix']}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </>
              )}
            </Box>
            {/* Label X */}
            <Box textAlign="center" mt={-2}>
              <Text fontSize="sm" color="fg.muted">
                Temps en Heure:Minutes
              </Text>
            </Box>
            {/* Légende */}
            <HStack gap={4} mt={2} pl="60px">
              <HStack gap={2}>
                <Box width="40px" height="2px" bg="#3b82f6" />
                <Text fontSize="sm" color="fg.muted">
                  prix du cours du marché en fonction du temps
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Second graphique : Résultats des segments */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between" align="center" w="100%">
            <Heading size="md" color="fg.default">
              Graphique 2 : Graphique des anticipations du cours de {stockData.symbol} le {stockData.date}
            </Heading>
            <Button
              size="sm"
              colorPalette="blue"
              variant="outline"
              onClick={handleDownloadChart2}
            >
              <Download size={16} style={{ marginRight: '8px' }} />
              Télécharger
            </Button>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack gap={2} align="stretch">
            {/* Graphique avec labels */}
            <Box position="relative" width="100%" height={400}>
              {/* Label Y (renversé, de bas en haut) */}
              <Box
                position="absolute"
                left="-60px"
                top="50%"
                transform="translateY(-50%) rotate(-90deg)"
                transformOrigin="center"
                whiteSpace="nowrap"
              >
                <Text fontSize="sm" color="fg.muted">
                  Intensité des prédictions (unité arbitraire)
                </Text>
              </Box>
              <Box id="chart2" width="100%" height="100%" pl="60px">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={segmentResultsData}>
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="linear"
                      domain={chart2XDomain}
                      tickFormatter={formatTime}
                      allowDataOverflow={false}
                      ticks={calculateXAxisTicks}
                    />
                    <YAxis 
                      domain={chart2YDomain}
                      tickFormatter={(value) => value.toFixed(2)}
                      ticks={calculateChart2YTicks}
                    />
                    <Tooltip
                      labelFormatter={(value) => formatTime(Number(value))}
                      formatter={(value: number) => [value.toFixed(2), 'Valeur']}
                    />
                {/* Dessiner une ligne continue avec changement de couleur par segment */}
                {(() => {
                  // Trier tous les points par temps pour assurer la continuité
                  const sortedPoints = [...segmentResultsData].sort((a, b) => a.time - b.time);
                  
                  // Créer des groupes de points consécutifs avec la même couleur
                  type LineGroup = { points: Array<{ time: number; value: number; color: string; isExtremity?: boolean }>; color: string };
                  const lineGroups: LineGroup[] = [];
                  let currentGroup: LineGroup | null = null;
                  
                  sortedPoints.forEach((point, index) => {
                    // Vérifier si on doit créer un nouveau groupe (uniquement changement de couleur)
                    // Ne pas créer de nouveau groupe pour les discontinuités temporelles, seulement pour les changements de couleur
                    const shouldStartNewGroup = !currentGroup || currentGroup.color !== point.color;
                    
                    if (shouldStartNewGroup) {
                      // Nouveau groupe
                      if (currentGroup && currentGroup.points.length > 0) {
                        lineGroups.push(currentGroup);
                      }
                      currentGroup = {
                        points: [point],
                        color: point.color,
                      };
                    } else {
                      // Même groupe, ajouter le point (currentGroup ne peut pas être null ici)
                      if (currentGroup) {
                        currentGroup.points.push(point);
                      }
                    }
                  });
                  
                  // Ajouter le dernier groupe
                  if (currentGroup !== null) {
                    const group: LineGroup = currentGroup;
                    if (group.points.length > 0) {
                      lineGroups.push(group);
                    }
                  }
                  
                  // Dessiner une ligne pour chaque groupe
                  return lineGroups.map((group, groupIndex) => {
                    // S'assurer que les points sont triés par temps dans le groupe
                    const sortedGroupPoints = [...group.points].sort((a, b) => a.time - b.time);
                    
                    return (
                      <Line
                        key={`line-group-${groupIndex}`}
                        type="linear"
                        dataKey="value"
                        stroke={group.color}
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload, index } = props;
                          // Utiliser pointId si disponible, sinon créer une clé unique avec groupIndex, segmentId, time et index
                          const uniqueKey = payload.pointId ?? `${groupIndex}-${payload.segmentId}-${payload.time}-${index ?? 'unknown'}`;
                          if (!cx || !cy || !payload) return <g key={`empty-${uniqueKey}`} />;
                          // Afficher un point seulement si c'est une extrémité du segment
                          if (!payload.isExtremity) return <g key={`non-extremity-${uniqueKey}`} />;
                          return (
                            <Dot
                              key={`dot-${uniqueKey}`}
                              cx={cx}
                              cy={cy}
                              r={1}
                              fill={payload.color}
                              stroke={payload.color}
                              strokeWidth={2}
                            />
                          );
                        }}
                        activeDot={false}
                        data={sortedGroupPoints}
                        connectNulls={false}
                      />
                    );
                  });
                })()}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
            {/* Label X */}
            <Box textAlign="center" mt={-2}>
              <Text fontSize="sm" color="fg.muted">
                Temps en Heure:Minutes
              </Text>
            </Box>
            {/* Légende */}
            <HStack gap={4} mt={2} pl="60px" flexWrap="wrap">
              <HStack gap={2}>
                <Box width="40px" height="2px" bg="#ef4444" />
                <Text fontSize="sm" color="fg.muted">
                  prédiction juste avec une tendance faible
                </Text>
              </HStack>
              <HStack gap={2}>
                <Box width="40px" height="2px" bg="#9333ea" />
                <Text fontSize="sm" color="fg.muted">
                  prédiction juste avec une tendance forte
                </Text>
              </HStack>
              <HStack gap={2}>
                <Box width="40px" height="2px" bg="#000000" />
                <Text fontSize="sm" color="fg.muted">
                  prédiction non vérifiable nécessitant un ajustement
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Troisième graphique : Graphique combiné */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between" align="center" w="100%">
            <Heading size="md" color="fg.default">
              Graphique 3 : Graphique du cours de {stockData.symbol} le {stockData.date} avec les anticipations réalisées et représentée dans le graphique 2, reportées sur le moment du cours où elles ont eu lieu
            </Heading>
            <Button
              size="sm"
              colorPalette="blue"
              variant="outline"
              onClick={handleDownloadChart3}
            >
              <Download size={16} style={{ marginRight: '8px' }} />
              Télécharger
            </Button>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack gap={2} align="stretch">
            {/* Graphique avec labels */}
            <Box position="relative" width="100%" height={400}>
              {/* Label Y (renversé, de bas en haut) */}
              <Box
                position="absolute"
                left="-60px"
                top="50%"
                transform="translateY(-50%) rotate(-90deg)"
                transformOrigin="center"
                whiteSpace="nowrap"
              >
                <Text fontSize="sm" color="fg.muted">
                  Prix du cours en Dollars US ($)
                </Text>
              </Box>
              <Box id="chart3" width="100%" height="100%" pl="60px">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={chart3XDomain}
                      tickFormatter={formatTime}
                      allowDataOverflow={false}
                      ticks={calculateXAxisTicks}
                    />
                    {/* Axe Y gauche pour les prix (utilisé aussi pour les segments positionnés) */}
                    <YAxis 
                      yAxisId="left"
                      domain={chart1YDomain}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                      ticks={calculateChart1YTicks}
                    />
                <Tooltip
                  labelFormatter={(value) => formatTime(Number(value))}
                  formatter={(value: number, name: string) => {
                    if (name === 'price') {
                      return [value.toFixed(2), 'Prix'];
                    } else {
                      return [value.toFixed(2), 'Valeur'];
                    }
                  }}
                />
                {/* Ligne des prix - filtrer pour commencer à t0 */}
                {(() => {
                  // Filtrer les points de prix pour commencer à t0 et convertir en format compatible avec l'axe X
                  const allPriceData = allPointsData
                    .filter(p => p.timestamp >= t0Time)
                    .map(p => ({ time: p.timestamp, price: p.price }));
                  
                  return allPriceData.length > 0 ? (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="price"
                      data={allPriceData}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      name="price"
                      connectNulls={false}
                    />
                  ) : null;
                })()}
                {/* Lignes des résultats des segments - utiliser les données repositionnées pour le graphique 3 */}
                {(() => {
                  // Grouper les points par segmentId pour que chaque segment soit indépendant
                  const pointsBySegment = new Map<string, Array<{ time: number; value: number; color: string; isExtremity?: boolean }>>();
                  
                  segmentResultsDataForChart3.forEach(point => {
                    if (!pointsBySegment.has(point.segmentId)) {
                      pointsBySegment.set(point.segmentId, []);
                    }
                    pointsBySegment.get(point.segmentId)!.push(point);
                  });
                  
                  // Dessiner une ligne pour chaque segment indépendamment
                  return Array.from(pointsBySegment.entries()).map(([segmentId, segmentPoints], segmentIndex) => {
                    // Trier les points par temps pour ce segment
                    const sortedSegmentPoints = [...segmentPoints].sort((a, b) => a.time - b.time);
                    
                    // Utiliser la couleur du premier point (tous les points d'un segment ont la même couleur)
                    const segmentColor = sortedSegmentPoints.length > 0 ? sortedSegmentPoints[0].color : '#000000';
                    
                    return (
                      <Line
                        key={`combined-segment-${segmentId}-${segmentIndex}`}
                        yAxisId="left"
                        type="linear"
                        dataKey="value"
                        stroke={segmentColor}
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload, index } = props;
                          // Utiliser pointId si disponible, sinon créer une clé unique avec segmentId, time et index
                          const uniqueKey = payload.pointId ?? `${segmentId}-${payload.time}-${index ?? 'unknown'}`;
                          if (!cx || !cy || !payload) return <g key={`empty-${uniqueKey}`} />;
                          // Afficher un point seulement si c'est une extrémité du segment
                          if (!payload.isExtremity) return <g key={`non-extremity-${uniqueKey}`} />;
                          return (
                            <Dot
                              key={`dot-${uniqueKey}`}
                              cx={cx}
                              cy={cy}
                              r={1}
                              fill={payload.color}
                              stroke={payload.color}
                              strokeWidth={2}
                            />
                          );
                        }}
                        activeDot={false}
                        data={sortedSegmentPoints}
                        connectNulls={false}
                        name="value"
                      />
                    );
                  });
                })()}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
            {/* Label X */}
            <Box textAlign="center" mt={-2}>
              <Text fontSize="sm" color="fg.muted">
                Temps en Heure:Minutes
              </Text>
            </Box>
            {/* Légende */}
            <HStack gap={4} mt={2} pl="60px" flexWrap="wrap">
              <HStack gap={2}>
                <Box width="40px" height="2px" bg="#3b82f6" />
                <Text fontSize="sm" color="fg.muted">
                  prix du cours du marché en fonction du temps
                </Text>
              </HStack>
              <HStack gap={2}>
                <Box width="40px" height="2px" bg="#ef4444" />
                <Text fontSize="sm" color="fg.muted">
                  prédiction juste avec une tendance faible
                </Text>
              </HStack>
              <HStack gap={2}>
                <Box width="40px" height="2px" bg="#9333ea" />
                <Text fontSize="sm" color="fg.muted">
                  prédiction juste avec une tendance forte
                </Text>
              </HStack>
              <HStack gap={2}>
                <Box width="40px" height="2px" bg="#000000" />
                <Text fontSize="sm" color="fg.muted">
                  prédiction non vérifiable nécessitant un ajustement
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Quatrième graphique : Graphique avec courbe lissée */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between" align="center" w="100%">
            <Heading size="md" color="fg.default">
              Graphique 4 : Corrélation comportementale a l'actif {stockData.symbol} le {stockData.date}
            </Heading>
            <Button
              size="sm"
              colorPalette="blue"
              variant="outline"
              onClick={handleDownloadChart4}
            >
              <Download size={16} style={{ marginRight: '8px' }} />
              Télécharger
            </Button>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack gap={2} align="stretch">
            {/* Graphique avec labels */}
            <Box position="relative" width="100%" height={400}>
              {/* Label Y (renversé, de bas en haut) */}
              <Box
                position="absolute"
                left="-60px"
                top="50%"
                transform="translateY(-50%) rotate(-90deg)"
                transformOrigin="center"
                whiteSpace="nowrap"
              >
                <Text fontSize="sm" color="fg.muted">
                  Prix du cours en Dollars US ($)
                </Text>
              </Box>
              <Box id="chart4" width="100%" height="100%" pl="60px">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={chart3XDomain}
                      tickFormatter={formatTime}
                      allowDataOverflow={false}
                      ticks={calculateXAxisTicks}
                    />
                    {/* Axe Y gauche pour les prix */}
                    <YAxis 
                      yAxisId="left"
                      domain={chart1YDomain}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                      ticks={calculateChart1YTicks}
                    />
                <Tooltip
                  labelFormatter={(value) => formatTime(Number(value))}
                  formatter={(value: number, name: string) => {
                    if (name === 'price') {
                      return [value.toFixed(2), 'Prix'];
                    } else if (name === 'average') {
                      return [value.toFixed(2), 'Moyenne'];
                    } else {
                      return [value.toFixed(2), 'Valeur'];
                    }
                  }}
                />
                {/* Ligne des prix - filtrer pour commencer à t0 */}
                {(() => {
                  const allPriceData = allPointsData
                    .filter(p => p.timestamp >= t0Time)
                    .map(p => ({ time: p.timestamp, price: p.price }));
                  
                  return allPriceData.length > 0 ? (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="price"
                      data={allPriceData}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      name="price"
                      connectNulls={false}
                    />
                  ) : null;
                })()}
                {/* Courbe lissée passant par les points moyens (sans points verts, seulement sur segments rouges, discontinue) */}
                {chart4AverageDataSegments.map((segment, segmentIndex) => (
                  segment.length > 0 && (
                    <Line
                      key={`average-segment-${segmentIndex}`}
                      yAxisId="left"
                      type="monotone"
                      dataKey="average"
                      data={segment}
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive={false}
                      name="average"
                      connectNulls={false}
                    />
                  )
                ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
            {/* Label X */}
            <Box textAlign="center" mt={-2}>
              <Text fontSize="sm" color="fg.muted">
                Temps en Heure:Minutes
              </Text>
            </Box>
            {/* Légende */}
            <HStack gap={4} mt={2} pl="60px" flexWrap="wrap">
              <HStack gap={2}>
                <Box width="40px" height="2px" bg="#3b82f6" />
                <Text fontSize="sm" color="fg.muted">
                  prix du cours du marché en fonction du temps
                </Text>
              </HStack>
              <HStack gap={2}>
                <Box width="40px" height="2px" bg="#ef4444" />
                <Text fontSize="sm" color="fg.muted">
                  Corrélation comportementale vérifiée à la courbe
                </Text>
              </HStack>
            </HStack>
            {/* Stats de corrélation */}
            {(predictionStats || resultStats06) && (
              <VStack gap={2} mt={4} pl="60px" align="flex-start">
                {predictionStats && (
                  <HStack gap={2}>
                    <Text fontSize="sm" color="fg.muted" fontWeight="medium">
                      Taux de corrélation moyen :
                    </Text>
                    <Text fontSize="sm" fontWeight="bold" color={predictionStats.successRate >= 50 ? "green.600" : "red.600"}>
                      {predictionStats.successRate.toFixed(2)}%
                    </Text>
                  </HStack>
                )}
                {resultStats06 && (
                  <HStack gap={2}>
                    <Text fontSize="sm" color="fg.muted" fontWeight="medium">
                      Taux de corrélation à forte intensité :
                    </Text>
                    <Text fontSize="sm" fontWeight="bold" color={resultStats06.successRate >= 50 ? "green.600" : "red.600"}>
                      {resultStats06.successRate.toFixed(2)}%
                    </Text>
                  </HStack>
                )}
              </VStack>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}

