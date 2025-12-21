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

export default function StreamResultsClient({ stockData, segments }: StreamResultsClientProps) {
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
    
    const results: Array<{ time: number; value: number; color: string; segmentId: string; isExtremity?: boolean }> = [];
    let currentY = 0; // Commence à 0
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
            // Si toutes les valeurs sont >= 0.5, c'est juste
            previousWasCorrect = prevValues.every(v => v >= 0.5);
          }
        }
      }
      
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
      let currentTime = startTime;
      let currentSegmentY = startY;
      
      for (let i = 0; i < maxLength; i++) {
        const interval = normalizedIntervals[i];
        const result = normalizedResults[i];
        const isCorrect = normalizedCorrect[i];
        
        // Convertir l'intervalle en millisecondes (on suppose que c'est en minutes)
        const intervalMs = interval * 60 * 1000;
        
        // Point de départ de ce sous-segment
        const subSegmentStartY = currentSegmentY;
        // C'est une extrémité seulement si c'est le premier sous-segment
        const isStartExtremity = i === 0;
        results.push({
          time: currentTime,
          value: subSegmentStartY,
          color: isCorrect >= 0.5 ? '#ef4444' : '#000000', // Rouge si juste, noir si faux
          segmentId: segment.id,
          isExtremity: isStartExtremity,
        });
        
        // Point d'arrivée de ce sous-segment
        const endTime = currentTime + intervalMs;
        const endY = subSegmentStartY + result;
        // C'est une extrémité seulement si c'est le dernier sous-segment
        const isEndExtremity = i === maxLength - 1;
        results.push({
          time: endTime,
          value: endY,
          color: isCorrect >= 0.5 ? '#ef4444' : '#000000',
          segmentId: segment.id,
          isExtremity: isEndExtremity,
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
      const segmentWasCorrect = normalizedCorrect.every(v => v >= 0.5);
      if (segmentWasCorrect) {
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

  // Calculer le domaine Y pour le premier graphique (avec marge de 15%)
  const chart1YDomain = useMemo(() => {
    if (allPointsData.length === 0) return ['auto', 'auto'];
    
    const prices = allPointsData.map(p => p.price);
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
  }, [allPointsData]);

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

  // Calculer le domaine X pour le premier graphique (commence au dernier point du dernier segment)
  const chart1XDomain = useMemo(() => {
    if (allPointsData.length === 0) return ['dataMin', 'dataMax'];
    
    // Trouver le dernier segment (celui avec le segmentEnd le plus récent)
    let lastSegmentEndTime: number | null = null;
    if (segments.length > 0) {
      // Trier les segments par segmentEnd pour trouver le plus récent
      const sortedSegments = [...segments].sort((a, b) => {
        const timeA = new Date(a.segmentEnd).getTime();
        const timeB = new Date(b.segmentEnd).getTime();
        return timeB - timeA; // Ordre décroissant
      });
      lastSegmentEndTime = new Date(sortedSegments[0].segmentEnd).getTime();
    }
    
    // Si on a un dernier segment, commencer à son segmentEnd
    // Sinon, commencer au premier point
    const startTime = lastSegmentEndTime ?? allPointsData[0].timestamp;
    const endTime = allPointsData[allPointsData.length - 1].timestamp;
    
    return [startTime, endTime];
  }, [allPointsData, segments]);

  // Calculer le domaine X pour le deuxième graphique (commence au dernier point du segment le plus ancien mais affiche depuis le début)
  const chart2XDomain = useMemo(() => {
    if (allPointsData.length === 0) return ['dataMin', 'dataMax'];
    
    // Trouver le segment le plus ancien (celui avec le segmentEnd le plus ancien)
    let oldestSegmentEndTime: number | null = null;
    if (segments.length > 0) {
      // Trier les segments par segmentEnd pour trouver le plus ancien
      const sortedSegments = [...segments].sort((a, b) => {
        const timeA = new Date(a.segmentEnd).getTime();
        const timeB = new Date(b.segmentEnd).getTime();
        return timeA - timeB; // Ordre croissant (le plus ancien en premier)
      });
      oldestSegmentEndTime = new Date(sortedSegments[0].segmentEnd).getTime();
    }
    
    // Le domaine commence au segmentEnd du segment le plus ancien (pour les données)
    // Mais l'affichage des abscisses commence depuis le début
    const dataStartTime = oldestSegmentEndTime ?? allPointsData[0].timestamp;
    const displayStartTime = allPointsData[0].timestamp; // Affichage depuis le début
    const endTime = allPointsData[allPointsData.length - 1].timestamp;
    
    // Le domaine pour l'affichage commence depuis le début, mais les données commencent au segmentEnd du segment le plus ancien
    return [displayStartTime, endTime];
  }, [allPointsData, segments]);

  // Fonction pour télécharger le premier graphique
  const handleDownloadChart1 = () => {
    const svgElement = document.querySelector('#chart1 .recharts-wrapper svg') as SVGElement;
    if (!svgElement) {
      alert('Graphique non trouvé');
      return;
    }
    
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('width', svgElement.clientWidth.toString());
    svgClone.setAttribute('height', svgElement.clientHeight.toString());
    
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `stream-all-points-${stockData.id}-${new Date().toISOString()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Fonction pour télécharger le second graphique
  const handleDownloadChart2 = () => {
    const svgElement = document.querySelector('#chart2 .recharts-wrapper svg') as SVGElement;
    if (!svgElement) {
      alert('Graphique non trouvé');
      return;
    }
    
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('width', svgElement.clientWidth.toString());
    svgClone.setAttribute('height', svgElement.clientHeight.toString());
    
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `stream-results-${stockData.id}-${new Date().toISOString()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Fonction pour télécharger le graphique combiné
  const handleDownloadChart3 = () => {
    const svgElement = document.querySelector('#chart3 .recharts-wrapper svg') as SVGElement;
    if (!svgElement) {
      alert('Graphique non trouvé');
      return;
    }
    
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('width', svgElement.clientWidth.toString());
    svgClone.setAttribute('height', svgElement.clientHeight.toString());
    
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `stream-combined-${stockData.id}-${new Date().toISOString()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Formater le temps pour l'axe X
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
  };

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
              Graphique de tous les points
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
          <Box id="chart1" width="100%" height={400}>
            {allPointsData.length === 0 ? (
              <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                <Text color="fg.muted">Aucune donnée à afficher ({Object.keys(stockData.data || {}).length} clés dans data)</Text>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={allPointsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={chart1XDomain}
                    tickFormatter={formatTime}
                  />
                  <YAxis 
                    domain={chart1YDomain}
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
            )}
          </Box>
        </Card.Body>
      </Card.Root>

      {/* Second graphique : Résultats des segments */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between" align="center" w="100%">
            <Heading size="md" color="fg.default">
              Résultats des segments
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
          <Box id="chart2" width="100%" height={400}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={segmentResultsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  type="number"
                  scale="linear"
                  domain={chart2XDomain}
                  tickFormatter={formatTime}
                  allowDataOverflow={false}
                />
                <YAxis domain={chart2YDomain} />
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
                          const { cx, cy, payload } = props;
                          if (!cx || !cy || !payload) return <g />;
                          // Afficher un point seulement si c'est une extrémité du segment
                          if (!payload.isExtremity) return <g />;
                          return (
                            <Dot
                              cx={cx}
                              cy={cy}
                              r={2}
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
        </Card.Body>
      </Card.Root>

      {/* Troisième graphique : Graphique combiné */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between" align="center" w="100%">
            <Heading size="md" color="fg.default">
              Graphique combiné (Prix + Résultats)
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
          <Box id="chart3" width="100%" height={400}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  type="number"
                  scale="linear"
                  domain={chart2XDomain}
                  tickFormatter={formatTime}
                  allowDataOverflow={false}
                />
                {/* Axe Y gauche pour les prix */}
                <YAxis 
                  yAxisId="left"
                  domain={chart1YDomain}
                  label={{ value: 'Prix', angle: -90, position: 'insideLeft' }}
                />
                {/* Axe Y droit pour les valeurs des segments */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  domain={chart2YDomain}
                  label={{ value: 'Valeur', angle: 90, position: 'insideRight' }}
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
                {/* Ligne des prix - filtrer pour commencer au segmentEnd du segment le plus ancien */}
                {(() => {
                  // Trouver le segment le plus ancien
                  let oldestSegmentEndTime: number | null = null;
                  if (segments.length > 0) {
                    const sortedSegments = [...segments].sort((a, b) => {
                      const timeA = new Date(a.segmentEnd).getTime();
                      const timeB = new Date(b.segmentEnd).getTime();
                      return timeA - timeB; // Ordre croissant
                    });
                    oldestSegmentEndTime = new Date(sortedSegments[0].segmentEnd).getTime();
                  }
                  
                  // Filtrer les données pour commencer au segmentEnd du segment le plus ancien
                  // Convertir timestamp en time pour la compatibilité avec l'axe X
                  const filteredPriceData = (oldestSegmentEndTime !== null
                    ? allPointsData.filter(p => p.timestamp >= oldestSegmentEndTime!)
                    : allPointsData
                  ).map(p => ({ time: p.timestamp, price: p.price }));
                  
                  return filteredPriceData.length > 0 ? (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="price"
                      data={filteredPriceData}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      name="price"
                      connectNulls={false}
                    />
                  ) : null;
                })()}
                {/* Lignes des résultats des segments */}
                {(() => {
                  // Trier tous les points par temps pour assurer la continuité
                  const sortedPoints = [...segmentResultsData].sort((a, b) => a.time - b.time);
                  
                  // Créer des groupes de points consécutifs avec la même couleur
                  type LineGroup = { points: Array<{ time: number; value: number; color: string; isExtremity?: boolean }>; color: string };
                  const lineGroups: LineGroup[] = [];
                  let currentGroup: LineGroup | null = null;
                  
                  sortedPoints.forEach((point) => {
                    // Vérifier si on doit créer un nouveau groupe (uniquement changement de couleur)
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
                      // Même groupe, ajouter le point
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
                    // Les données utilisent déjà time, pas besoin de conversion
                    const sortedGroupPoints = [...group.points]
                      .sort((a, b) => a.time - b.time);
                    
                    return (
                      <Line
                        key={`combined-line-group-${groupIndex}`}
                        yAxisId="right"
                        type="linear"
                        dataKey="value"
                        stroke={group.color}
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (!cx || !cy || !payload) return <g />;
                          // Afficher un point seulement si c'est une extrémité du segment
                          if (!payload.isExtremity) return <g />;
                          return (
                            <Dot
                              cx={cx}
                              cy={cy}
                              r={2}
                              fill={payload.color}
                              stroke={payload.color}
                              strokeWidth={2}
                            />
                          );
                        }}
                        activeDot={false}
                        data={sortedGroupPoints}
                        connectNulls={false}
                        name="value"
                      />
                    );
                  });
                })()}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}

