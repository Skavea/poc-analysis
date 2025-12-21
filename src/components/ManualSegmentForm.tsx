/**
 * Client Component: Manual Segment Form
 * =====================================
 * 
 * Formulaire pour créer des segments manuellement avec graphique interactif
 */

'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  Button,
  Field,
  Heading,
  Badge,
  Spinner,
  Input,
} from "@chakra-ui/react";
import { Save, ArrowRight, Copy, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
  Area,
  ComposedChart,
} from "recharts";
import { AnalysisResult } from '@/lib/schema';

interface ManualSegmentFormProps {
  stockDataId: string;
  symbol: string;
  date: string;
  data: Record<string, unknown>;
  firstDate: string;
  lastDate: string;
  totalPoints: number;
  processedPoints: number;
  segmentsCount: number;
  existingSegments: AnalysisResult[];
}

interface Point {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function ManualSegmentForm({
  stockDataId,
  symbol,
  date,
  data,
  firstDate,
  lastDate,
  totalPoints,
  processedPoints,
  segmentsCount,
  existingSegments,
}: ManualSegmentFormProps) {
  // Convertir les données en tableau de points triés
  const allPoints: Point[] = useMemo(() => {
    const timestamps = Object.keys(data).sort();
    return timestamps.map(ts => {
      const pointData = data[ts] as Record<string, unknown>;
      return {
        timestamp: ts,
        open: parseFloat(pointData['1. open'] as string),
        high: parseFloat(pointData['2. high'] as string),
        low: parseFloat(pointData['3. low'] as string),
        close: parseFloat(pointData['4. close'] as string),
        volume: parseFloat(pointData['5. volume'] as string),
      };
    });
  }, [data]);

  // Trouver le segment le plus récemment créé (basé sur createdAt) pour reprendre là où on s'est arrêté
  const getLastSegmentByCreatedAt = useCallback(() => {
    if (existingSegments.length === 0) return null;
    
    // Trouver le segment avec le createdAt le plus récent (timestamp le plus grand)
    // Cela permet de reprendre là où on s'est arrêté (le dernier segment créé)
    return existingSegments.reduce((latest, current) => {
      const currentCreatedAt = new Date(current.createdAt).getTime();
      const latestCreatedAt = new Date(latest.createdAt).getTime();
      return currentCreatedAt > latestCreatedAt ? current : latest;
    });
  }, [existingSegments]);

  // Déterminer le point de départ pour l'affichage
  const getStartIndex = useCallback(() => {
    if (existingSegments.length === 0) {
      return 0; // Commencer au début
    }
    
    // Trouver le segment le plus récemment créé et commencer au premier point du segment
    const lastSegment = getLastSegmentByCreatedAt();
    if (!lastSegment) return 0;
    
    const lastSegmentStart = new Date(lastSegment.segmentStart);
    
    // Trouver l'index du premier point du dernier segment
    for (let i = 0; i < allPoints.length; i++) {
      const pointTime = new Date(allPoints[i].timestamp);
      if (pointTime.getTime() >= lastSegmentStart.getTime()) {
        // Afficher 60 points à partir de ce point, ou jusqu'à la fin si moins de 60 points
        const remainingPoints = allPoints.length - i;
        if (remainingPoints < 60) {
          // Afficher les 60 derniers points si on est proche de la fin
          return Math.max(0, allPoints.length - 60);
        }
        return i;
      }
    }
    
    // Si on arrive ici, on est à la fin
    return Math.max(0, allPoints.length - 60);
  }, [existingSegments, allPoints, getLastSegmentByCreatedAt]);

  const [startIndex, setStartIndex] = useState(getStartIndex);
  const [pointsToDisplay, setPointsToDisplay] = useState(60); // Nombre de points à afficher (30-180)
  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const [schemaType, setSchemaType] = useState<'R' | 'V' | 'UNCLASSIFIED'>('UNCLASSIFIED');
  const [patternPoint, setPatternPoint] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // État pour le curseur de sélection
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [isHoveringChart, setIsHoveringChart] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs pour stocker les coordonnées réelles des points d'extrémité
  const selectedPointsCoordinates = useRef<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({ start: null, end: null });
  const lastSegmentCoordinates = useRef<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({ start: null, end: null });
  
  // État pour forcer le re-rendu après capture des coordonnées
  const [coordinatesReady, setCoordinatesReady] = useState(false);
  
  // États pour le feedback du segment précédent
  const [isResultCorrect, setIsResultCorrect] = useState<boolean | null>(null);
  const [resultInterval, setResultInterval] = useState<string>('');
  
  // État pour l'écran de confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastCreatedSegment, setLastCreatedSegment] = useState<AnalysisResult | null>(null);
  
  // État pour le bouton de fin
  const [showEndDialog, setShowEndDialog] = useState(false);

  // Points à afficher (pointsToDisplay points à partir de startIndex)
  const displayPoints = useMemo(() => {
    const endIndex = Math.min(startIndex + pointsToDisplay, allPoints.length);
    return allPoints.slice(startIndex, endIndex);
  }, [allPoints, startIndex, pointsToDisplay]);
  
  // Réinitialiser les coordonnées SVG quand les points affichés changent
  useEffect(() => {
    // Réinitialiser les coordonnées pour forcer la recapture
    selectedPointsCoordinates.current = { start: null, end: null };
    lastSegmentCoordinates.current = { start: null, end: null };
    setCoordinatesReady(false);
    // Forcer un petit délai pour permettre au graphique de se mettre à jour
    const timer = setTimeout(() => {
      setCoordinatesReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [displayPoints]);
  
  // Calculer l'index minimum de fin pour inclure le dernier segment si nécessaire
  const getMinEndIndex = useCallback(() => {
    if (existingSegments.length === 0) return startIndex + 30; // Minimum 30 points
    
    const lastSegment = getLastSegmentByCreatedAt();
    if (!lastSegment) return startIndex + 30;
    
    const lastSegmentEnd = new Date(lastSegment.segmentEnd);
    
    // Trouver l'index du dernier point du dernier segment
    for (let i = allPoints.length - 1; i >= 0; i--) {
      const pointTime = new Date(allPoints[i].timestamp);
      if (pointTime.getTime() <= lastSegmentEnd.getTime()) {
        // On doit afficher au moins jusqu'à ce point
        return Math.max(i + 1, startIndex + 30);
      }
    }
    
    return startIndex + 30; // Fallback
  }, [existingSegments, allPoints, startIndex, getLastSegmentByCreatedAt]);
  
  // Fonction pour réduire la plage (chevron gauche)
  const handleDecreaseRange = () => {
    const newPointsToDisplay = Math.max(30, pointsToDisplay - 30);
    const minEndIndex = getMinEndIndex();
    const currentEndIndex = startIndex + pointsToDisplay;
    
    // Vérifier qu'on ne va pas en dessous du minimum requis
    if (startIndex + newPointsToDisplay < minEndIndex) {
      // Ajuster pour respecter le minimum
      const adjustedPoints = minEndIndex - startIndex;
      if (adjustedPoints >= 30) {
        setPointsToDisplay(adjustedPoints);
      }
      return;
    }
    
    setPointsToDisplay(newPointsToDisplay);
  };
  
  // Fonction pour augmenter la plage (chevron droit)
  const handleIncreaseRange = () => {
    const newPointsToDisplay = Math.min(180, pointsToDisplay + 30);
    const maxEndIndex = allPoints.length;
    
    // Vérifier qu'on ne dépasse pas la fin des données
    if (startIndex + newPointsToDisplay > maxEndIndex) {
      setPointsToDisplay(maxEndIndex - startIndex);
      return;
    }
    
    setPointsToDisplay(newPointsToDisplay);
  };
  
  // Vérifier si les boutons doivent être désactivés
  const canDecrease = pointsToDisplay > 30 && (startIndex + pointsToDisplay - 30) >= getMinEndIndex();
  const canIncrease = pointsToDisplay < 180 && (startIndex + pointsToDisplay + 30) <= allPoints.length;

  // Trouver les points extrêmes du dernier segment pour l'affichage
  const lastSegmentPoints = useMemo(() => {
    if (existingSegments.length === 0) return [];
    
    const lastSegment = getLastSegmentByCreatedAt();
    if (!lastSegment) return [];
    
    const startTime = new Date(lastSegment.segmentStart).getTime();
    const endTime = new Date(lastSegment.segmentEnd).getTime();
    
    return allPoints.filter(p => {
      const pointTime = new Date(p.timestamp).getTime();
      return pointTime === startTime || pointTime === endTime;
    });
  }, [existingSegments, allPoints, getLastSegmentByCreatedAt]);

  // Trouver l'index du point le plus proche d'une position X
  const findNearestPointIndex = useCallback((mouseX: number, chartWidth: number): number | null => {
    if (displayPoints.length === 0) return null;
    
    // Si chartWidth n'est pas disponible, utiliser la largeur du conteneur
    let effectiveWidth = chartWidth;
    if (effectiveWidth === 0 && chartContainerRef.current) {
      effectiveWidth = chartContainerRef.current.clientWidth - 50; // Soustraire les marges
    }
    
    if (effectiveWidth === 0) return null;
    
    const chartXDomain = [
      displayPoints.length > 0 ? new Date(displayPoints[0].timestamp).getTime() : 0,
      displayPoints.length > 0 ? new Date(displayPoints[displayPoints.length - 1].timestamp).getTime() : 0
    ];
    
    // Convertir la position X de la souris en timestamp
    const xRatio = mouseX / effectiveWidth;
    const mouseTimestamp = chartXDomain[0] + (chartXDomain[1] - chartXDomain[0]) * xRatio;
    
    // Trouver le point le plus proche
    let nearestIndex = 0;
    let minDistance = Math.abs(new Date(displayPoints[0].timestamp).getTime() - mouseTimestamp);
    
    for (let i = 1; i < displayPoints.length; i++) {
      const distance = Math.abs(new Date(displayPoints[i].timestamp).getTime() - mouseTimestamp);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    return nearestIndex;
  }, [displayPoints]);

  // Fonction utilitaire pour sélectionner/désélectionner un point
  const togglePointSelection = useCallback((timestamp: string) => {
    // Réinitialiser les coordonnées quand la sélection change
    selectedPointsCoordinates.current = { start: null, end: null };
    setCoordinatesReady(false);
    setSelectedPoints(prev => {
      if (prev.includes(timestamp)) {
        // Désélectionner
        const newSelection = prev.filter(t => t !== timestamp);
        if (newSelection.length < 2) {
          // Si on passe à moins de 2 points, réinitialiser R/V et pattern
          setSchemaType('UNCLASSIFIED');
          setPatternPoint(null);
        }
        return newSelection;
      } else {
        // Sélectionner (max 2 points)
        if (prev.length >= 2) {
          return prev; // Ne pas ajouter si déjà 2 points
        }
        return [...prev, timestamp].sort((a, b) => 
          new Date(a).getTime() - new Date(b).getTime()
        );
      }
    });
  }, []);

  // Gérer le clic sur le graphique
  const handleChartClick = useCallback((e: any) => {
    if (!e) return;
    
    // Priorité 1 : utiliser hoveredPointIndex (curseur visible)
    if (hoveredPointIndex !== null && displayPoints[hoveredPointIndex]) {
      const point = displayPoints[hoveredPointIndex];
      togglePointSelection(point.timestamp);
      return;
    }
    
    // Priorité 2 : utiliser activePayload (source de vérité de Recharts)
    if (e.activePayload && e.activePayload[0] && e.activePayload[0].payload) {
      const payload = e.activePayload[0].payload;
      const timestamp = payload.originalTimestamp || payload.timestamp;
      togglePointSelection(timestamp);
      return;
    }
    
    // Priorité 3 : utiliser activeLabel (timestamp de l'axe X)
    if (e.activeLabel) {
      const clickedTimestamp = new Date(e.activeLabel).getTime();
      const index = displayPoints.findIndex(p => {
        const pointTime = new Date(p.timestamp).getTime();
        // Trouver le point le plus proche (tolérance de 1 minute)
        return Math.abs(pointTime - clickedTimestamp) < 60000;
      });
      
      if (index !== -1) {
        togglePointSelection(displayPoints[index].timestamp);
      }
    }
  }, [displayPoints, hoveredPointIndex, togglePointSelection]);

  // Gérer le survol de la souris pour déplacer le curseur
  const handleChartMouseMove = useCallback((e: any) => {
    if (!e) {
      setHoveredPointIndex(null);
      setIsHoveringChart(false);
      return;
    }
    
    setIsHoveringChart(true);
    
    // Utiliser uniquement activePayload (source de vérité de Recharts)
    // Ne pas utiliser de calcul manuel qui cause des décalages
    if (e.activePayload && e.activePayload[0] && e.activePayload[0].payload) {
      const payload = e.activePayload[0].payload;
      const timestamp = payload.originalTimestamp || payload.timestamp;
      const index = displayPoints.findIndex(p => p.timestamp === timestamp);
      if (index !== -1) {
        setHoveredPointIndex(index);
        return;
      }
    }
    
    // Si activePayload n'est pas disponible, ne pas afficher de curseur mais garder isHoveringChart
    setHoveredPointIndex(null);
  }, [displayPoints]);

  // Gérer la sortie de la souris
  const handleChartMouseLeave = useCallback(() => {
    setHoveredPointIndex(null);
    setIsHoveringChart(false);
  }, []);

  // Préparer les données pour le graphique avec sélection
  const chartData = useMemo(() => {
    const [startTime, endTime] = selectedPoints.length === 2 
      ? selectedPoints.map(t => new Date(t).getTime()).sort((a, b) => a - b)
      : [0, 0];
    
    // Calculer les timestamps du dernier segment pour l'affichage
    const lastSegment = getLastSegmentByCreatedAt();
    const lastSegmentStartTime = lastSegment 
      ? new Date(lastSegment.segmentStart).getTime()
      : 0;
    const lastSegmentEndTime = lastSegment
      ? new Date(lastSegment.segmentEnd).getTime()
      : 0;
    
    return displayPoints.map(point => {
      const isSelected = selectedPoints.includes(point.timestamp);
      const isLastSegmentPoint = lastSegmentPoints.some(
        p => p.timestamp === point.timestamp
      );
      
      const pointTime = new Date(point.timestamp).getTime();
      const isInSelectedArea = selectedPoints.length === 2 && pointTime >= startTime && pointTime <= endTime;
      const isInLastSegment = existingSegments.length > 0 && pointTime >= lastSegmentStartTime && pointTime <= lastSegmentEndTime;
      
      return {
        ...point,
        timestamp: new Date(point.timestamp).getTime(),
        originalTimestamp: point.timestamp, // Garder le timestamp original pour les comparaisons
        isSelected,
        isLastSegmentPoint,
        isInLastSegment,
        // Valeur pour l'aire sélectionnée (null si en dehors de la sélection)
        selectedAreaClose: isInSelectedArea ? point.close : null,
        // Valeur pour l'aire du dernier segment (null si en dehors du segment)
        lastSegmentAreaClose: isInLastSegment ? point.close : null,
      };
    });
  }, [displayPoints, selectedPoints, lastSegmentPoints, existingSegments]);

  // Calculer la zone sélectionnée pour l'aire sous la courbe
  // Créer une série de données avec null pour les points en dehors de la sélection
  // Créer des données pour l'aire avec null pour les points en dehors de la sélection
  const areaData = useMemo(() => {
    if (selectedPoints.length !== 2) return [];
    
    const [startTime, endTime] = selectedPoints.map(t => new Date(t).getTime()).sort((a, b) => a - b);
    
    // Utiliser chartData et mettre null pour les points en dehors de la sélection
    return chartData.map(point => {
      const timestamp = point.originalTimestamp || new Date(point.timestamp).toISOString();
      const pointTime = new Date(timestamp).getTime();
      const isInSelection = pointTime >= startTime && pointTime <= endTime;
      
      return {
        ...point,
        areaClose: isInSelection ? point.close : null,
      };
    });
  }, [selectedPoints, chartData]);

  // Calculer les prix min/max pour l'axe Y
  const priceRange = useMemo(() => {
    if (displayPoints.length === 0) return { min: 0, max: 100 };
    
    const prices = displayPoints.map(p => [p.low, p.high]).flat();
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    
    return { min: min - padding, max: max + padding };
  }, [displayPoints]);

  // Récupérer le segment précédent pour le feedback
  const previousSegment = useMemo(() => {
    if (existingSegments.length === 0) return null;
    return getLastSegmentByCreatedAt();
  }, [existingSegments, getLastSegmentByCreatedAt]);

  // Sauvegarder le segment
  const handleSaveSegment = async () => {
    if (selectedPoints.length !== 2) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/create-manual-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockDataId,
          symbol,
          date,
          startTimestamp: selectedPoints[0],
          endTimestamp: selectedPoints[1],
          schemaType: schemaType !== 'UNCLASSIFIED' ? schemaType : null,
          patternPoint: patternPoint || null,
          // Envoyer le feedback du segment précédent si fourni
          previousSegmentId: previousSegment?.id || null,
          isResultCorrect: isResultCorrect !== null ? isResultCorrect : null,
          resultInterval: resultInterval ? parseFloat(resultInterval) : null,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Afficher l'écran de confirmation avec les données du segment créé
        setLastCreatedSegment(result.data.segment);
        setShowConfirmation(true);
        
        // Réinitialiser les états pour le prochain segment
        setSelectedPoints([]);
        setSchemaType('UNCLASSIFIED');
        setPatternPoint(null);
        setIsResultCorrect(null);
        setResultInterval('');
        const newStartIndex = getStartIndex();
        setStartIndex(newStartIndex);
        setPointsToDisplay(60); // Réinitialiser à 60 points
      } else {
        alert(result.error || 'Erreur lors de la création du segment');
      }
    } catch (error) {
      console.error('Error saving segment:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Passer à la suite (prochain formulaire)
  const handleContinue = () => {
    setShowConfirmation(false);
    setLastCreatedSegment(null);
    // Recharger pour avoir les nouveaux segments
    window.location.reload();
  };

  // Copier les données dans le presse-papier
  const handleCopyToClipboard = () => {
    if (!lastCreatedSegment) return;
    
    const rvValue = lastCreatedSegment.schemaType === 'R' ? '0' : lastCreatedSegment.schemaType === 'V' ? '1' : '?';
    const trendValue = lastCreatedSegment.trendDirection === 'DOWN' ? '0' : '1';
    const uValue = lastCreatedSegment.u ? Number(lastCreatedSegment.u).toFixed(2) : '0.00';
    const segmentId = lastCreatedSegment.id;
    const x0Date = new Date(lastCreatedSegment.segmentEnd);
    const x0DateStr = `${x0Date.getUTCDate().toString().padStart(2, '0')}/${(x0Date.getUTCMonth() + 1).toString().padStart(2, '0')}/${x0Date.getUTCFullYear()} ${x0Date.getUTCHours().toString().padStart(2, '0')}:${x0Date.getUTCMinutes().toString().padStart(2, '0')}`;
    
    const data = `${rvValue} ${trendValue} ${uValue} ${segmentId} ${x0DateStr}\n${lastCreatedSegment.redPointsFormatted || ''}\n${lastCreatedSegment.greenPointsFormatted || ''}`;
    
    navigator.clipboard.writeText(data).then(() => {
      alert('Données copiées dans le presse-papier !');
    }).catch(err => {
      console.error('Erreur lors de la copie:', err);
      alert('Erreur lors de la copie');
    });
  };

  // Gérer la fin (ne plus générer de segments)
  const handleEnd = async () => {
    if (!previousSegment || isResultCorrect === null) return;
    
    if (!confirm('Êtes-vous sûr de vouloir terminer ? Le feedback du segment précédent sera enregistré.')) {
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/update-segment-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: previousSegment.id,
          isResultCorrect,
          resultInterval: resultInterval ? parseFloat(resultInterval) : null,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert('Feedback enregistré avec succès !');
        window.location.href = '/';
      } else {
        alert(result.error || 'Erreur lors de l\'enregistrement du feedback');
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = selectedPoints.length === 2 && schemaType !== 'UNCLASSIFIED';

  // Si on affiche l'écran de confirmation
  if (showConfirmation && lastCreatedSegment) {
    const rvValue = lastCreatedSegment.schemaType === 'R' ? '0' : lastCreatedSegment.schemaType === 'V' ? '1' : '?';
    const trendValue = lastCreatedSegment.trendDirection === 'DOWN' ? '0' : '1';
    const uValue = lastCreatedSegment.u ? Number(lastCreatedSegment.u).toFixed(2) : '0.00';
    const segmentId = lastCreatedSegment.id;
    const x0Date = new Date(lastCreatedSegment.segmentEnd);
    const x0DateStr = `${x0Date.getUTCDate().toString().padStart(2, '0')}/${(x0Date.getUTCMonth() + 1).toString().padStart(2, '0')}/${x0Date.getUTCFullYear()} ${x0Date.getUTCHours().toString().padStart(2, '0')}:${x0Date.getUTCMinutes().toString().padStart(2, '0')}`;
    
    return (
      <VStack gap={6} align="stretch">
        <Card.Root>
          <Card.Header>
            <Heading size="lg" color="fg.default">
              Segment créé avec succès
            </Heading>
          </Card.Header>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <Box
                p={4}
                bg="transparent"
                rounded="lg"
                fontFamily="monospace"
                fontSize="sm"
                whiteSpace="pre-wrap"
                border="1px solid"
                borderColor="border.default"
                color="fg.default"
              >
                <Text>{rvValue} {trendValue} {uValue} {segmentId} {x0DateStr}</Text>
                <Text>{lastCreatedSegment.redPointsFormatted || ''}</Text>
                <Text>{lastCreatedSegment.greenPointsFormatted || ''}</Text>
              </Box>
              
              <HStack gap={3}>
                <Button
                  onClick={handleCopyToClipboard}
                  colorPalette="blue"
                  variant="outline"
                  flex={1}
                >
                  <Copy size={16} style={{ marginRight: '8px' }} />
                  Copier dans le presse-papier
                </Button>
                <Button
                  onClick={handleContinue}
                  colorPalette="green"
                  flex={1}
                >
                  <ArrowRight size={16} style={{ marginRight: '8px' }} />
                  Continuer
                </Button>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      {/* En-tête avec informations */}
      <Card.Root>
        <Card.Header>
          <VStack align="start" gap={2}>
            <Heading size="lg" color="fg.default">
              {symbol} - {date}
            </Heading>
            <HStack gap={4} flexWrap="wrap">
              <Badge colorPalette="blue" variant="subtle">
                Plage: {firstDate ? (() => {
                  const date = new Date(firstDate);
                  return `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCFullYear()}`;
                })() : 'N/A'} - {lastDate ? (() => {
                  const date = new Date(lastDate);
                  return `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCFullYear()}`;
                })() : 'N/A'}
              </Badge>
              <Badge colorPalette="green" variant="subtle">
                Points traités: {processedPoints} / {totalPoints}
              </Badge>
              <Badge colorPalette="purple" variant="subtle">
                Segments traités: {segmentsCount}
              </Badge>
              {(() => {
                // Calculer le pourcentage de réussite basé sur les segments avec feedback
                const segmentsWithFeedback = existingSegments.filter(seg => seg.isResultCorrect !== null);
                const successfulSegments = segmentsWithFeedback.filter(seg => seg.isResultCorrect === true);
                const totalFeedbackSegments = segmentsWithFeedback.length;
                const successRate = totalFeedbackSegments > 0 
                  ? ((successfulSegments.length / totalFeedbackSegments) * 100).toFixed(1) 
                  : '0';
                const successFraction = `${successfulSegments.length} / ${totalFeedbackSegments}`;
                
                return (
                  <Badge colorPalette="orange" variant="subtle">
                    Réussite: {successRate}% ({successFraction})
                  </Badge>
                );
              })()}
            </HStack>
          </VStack>
        </Card.Header>
      </Card.Root>

      {/* Section de feedback du segment précédent */}
      {previousSegment && (
        <Card.Root>
          <Card.Header>
            <Text fontSize="lg" fontWeight="bold" color="fg.default">
              Feedback sur le segment précédent
            </Text>
          </Card.Header>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>Le résultat du segment précédent est-il correct ?</Field.Label>
                <HStack gap={3}>
                  <Button
                    variant={isResultCorrect === true ? 'solid' : 'outline'}
                    colorPalette={isResultCorrect === true ? 'green' : 'gray'}
                    onClick={() => setIsResultCorrect(true)}
                    flex={1}
                  >
                    <CheckCircle size={16} style={{ marginRight: '8px' }} />
                    Oui
                  </Button>
                  <Button
                    variant={isResultCorrect === false ? 'solid' : 'outline'}
                    colorPalette={isResultCorrect === false ? 'red' : 'gray'}
                    onClick={() => setIsResultCorrect(false)}
                    flex={1}
                  >
                    <XCircle size={16} style={{ marginRight: '8px' }} />
                    Non
                  </Button>
                </HStack>
              </Field.Root>

              {isResultCorrect !== null && (
                <Field.Root>
                  <Field.Label>Intervalle de temps (en minutes) pour que le résultat se réalise</Field.Label>
                  <Input
                    type="number"
                    value={resultInterval}
                    onChange={(e) => setResultInterval(e.target.value)}
                    placeholder="Ex: 15"
                    min="0"
                    step="0.1"
                  />
                  <Field.HelperText>
                    Durée en minutes entre la fin du segment et la réalisation du résultat
                  </Field.HelperText>
                </Field.Root>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Graphique interactif */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between" align="center" w="100%">
            <Button
              onClick={handleDecreaseRange}
              disabled={!canDecrease}
              size="sm"
              variant="ghost"
              colorPalette="gray"
            >
              <ChevronLeft size={20} />
            </Button>
            <Text fontSize="lg" fontWeight="bold" color="fg.default">
              Sélection des points du segment
            </Text>
            <Button
              onClick={handleIncreaseRange}
              disabled={!canIncrease}
              size="sm"
              variant="ghost"
              colorPalette="gray"
            >
              <ChevronRight size={20} />
            </Button>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Box ref={chartContainerRef} height="400px" position="relative">
            {/* SVG overlay pour l'aire sous la courbe du dernier segment (rouge) */}
            {existingSegments.length > 0 && lastSegmentCoordinates.current.start && lastSegmentCoordinates.current.end && (() => {
              const lastSegment = getLastSegmentByCreatedAt();
              if (!lastSegment) return null;
              const lastSegmentStartTime = new Date(lastSegment.segmentStart).getTime();
              const lastSegmentEndTime = new Date(lastSegment.segmentEnd).getTime();
              
              // Filtrer les points du dernier segment dans displayPoints
              const lastSegmentPointsData = displayPoints.filter(point => {
                const pointTime = new Date(point.timestamp).getTime();
                return pointTime >= lastSegmentStartTime && pointTime <= lastSegmentEndTime;
              });
              
              if (lastSegmentPointsData.length === 0) return null;
              
              // Utiliser les coordonnées réelles des points d'extrémité
              const startX = lastSegmentCoordinates.current.start.x;
              const endX = lastSegmentCoordinates.current.end.x;
              const startY = lastSegmentCoordinates.current.start.y;
              const endY = lastSegmentCoordinates.current.end.y;
              
              // Calculer la largeur réelle basée sur les positions X des extrémités
              const actualWidth = Math.abs(endX - startX);
              const minX = Math.min(startX, endX);
              
              // Calculer les coordonnées Y pour tous les points du segment
              const yDomain = [priceRange.min, priceRange.max];
              const marginTop = 5;
              const chartHeight = 340 - marginTop - 5;
              const plotHeight = chartHeight;
              
              // Créer le path SVG pour le dernier segment
              const points = lastSegmentPointsData.map((point, index) => {
                // Calculer la position X relative dans le segment
                const pointTime = new Date(point.timestamp).getTime();
                const segmentStartTime = lastSegmentStartTime;
                const segmentEndTime = lastSegmentEndTime;
                const segmentDuration = segmentEndTime - segmentStartTime;
                const relativePosition = segmentDuration > 0 ? (pointTime - segmentStartTime) / segmentDuration : 0;
                
                // Position X basée sur la largeur réelle
                const x = minX + (relativePosition * actualWidth);
                
                // Position Y basée sur le prix
                const y = marginTop + plotHeight - ((point.close - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotHeight;
                return { x, y };
              });
              
              if (points.length === 0) return null;
              
              let path = `M ${points[0].x},${points[0].y}`;
              for (let i = 1; i < points.length; i++) {
                path += ` L ${points[i].x},${points[i].y}`;
              }
              // Fermer le path en allant au bas du graphique
              const bottomY = marginTop + plotHeight;
              path += ` L ${points[points.length - 1].x},${bottomY} L ${points[0].x},${bottomY} Z`;
              
              const actualChartWidth = chartContainerRef.current?.clientWidth || 800;
              
              return (
                <svg
                  width={actualChartWidth}
                  height={400}
                  style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
                >
                  <defs>
                    <linearGradient id="lastSegmentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  <path
                    d={path}
                    fill="url(#lastSegmentGradient)"
                    stroke="none"
                  />
                </svg>
              );
            })()}
            
            {/* SVG overlay pour l'aire sous la courbe de la sélection (cyan) */}
            {selectedPoints.length === 2 && coordinatesReady && selectedPointsCoordinates.current.start && selectedPointsCoordinates.current.end && (() => {
              const [startTime, endTime] = selectedPoints.map(t => new Date(t).getTime()).sort((a, b) => a - b);
              const selectedPointsData = chartData.filter(point => {
                const timestamp = point.originalTimestamp || new Date(point.timestamp).toISOString();
                const pointTime = new Date(timestamp).getTime();
                return pointTime >= startTime && pointTime <= endTime && point.selectedAreaClose !== null;
              });
              
              if (selectedPointsData.length === 0) return null;
              
              // Utiliser les coordonnées réelles des points d'extrémité
              const startX = selectedPointsCoordinates.current.start.x;
              const endX = selectedPointsCoordinates.current.end.x;
              const startY = selectedPointsCoordinates.current.start.y;
              const endY = selectedPointsCoordinates.current.end.y;
              
              // Calculer la largeur réelle basée sur les positions X des extrémités
              const actualWidth = Math.abs(endX - startX);
              const minX = Math.min(startX, endX);
              
              // Calculer les coordonnées Y pour tous les points de la sélection
              const yDomain = [priceRange.min, priceRange.max];
              const marginTop = 5;
              const chartHeight = 340 - marginTop - 5;
              const plotHeight = chartHeight;
              
              // Créer le path SVG pour la sélection
              const points = selectedPointsData.map((point) => {
                // Calculer la position X relative dans la sélection
                const pointTime = new Date(point.originalTimestamp || point.timestamp).getTime();
                const selectionDuration = endTime - startTime;
                const relativePosition = selectionDuration > 0 ? (pointTime - startTime) / selectionDuration : 0;
                
                // Position X basée sur la largeur réelle
                const x = minX + (relativePosition * actualWidth);
                
                // Position Y basée sur le prix
                const y = marginTop + plotHeight - ((point.selectedAreaClose! - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotHeight;
                return { x, y };
              });
              
              if (points.length === 0) return null;
              
              let path = `M ${points[0].x},${points[0].y}`;
              for (let i = 1; i < points.length; i++) {
                path += ` L ${points[i].x},${points[i].y}`;
              }
              // Fermer le path en allant au bas du graphique
              const bottomY = marginTop + plotHeight;
              path += ` L ${points[points.length - 1].x},${bottomY} L ${points[0].x},${bottomY} Z`;
              
              const actualChartWidth = chartContainerRef.current?.clientWidth || 800;
              
              return (
                <svg
                  width={actualChartWidth}
                  height={400}
                  style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  <path
                    d={path}
                    fill="url(#areaGradient)"
                    stroke="none"
                  />
                </svg>
              );
            })()}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                key={`chart-${startIndex}-${pointsToDisplay}`}
                data={chartData} 
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                onClick={handleChartClick}
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
                style={{ cursor: (hoveredPointIndex !== null || isHoveringChart) ? 'pointer' : 'default' }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                
                {/* Curseur de sélection vertical (blanc) qui suit le point le plus proche */}
                {hoveredPointIndex !== null && displayPoints[hoveredPointIndex] && (
                  <ReferenceLine
                    x={new Date(displayPoints[hoveredPointIndex].timestamp).getTime()}
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeOpacity={0.8}
                  />
                )}
                
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={[
                    displayPoints.length > 0 ? new Date(displayPoints[0].timestamp).getTime() : 'dataMin',
                    displayPoints.length > 0 ? new Date(displayPoints[displayPoints.length - 1].timestamp).getTime() : 'dataMax'
                  ]}
                  ticks={displayPoints.length > 0 ? displayPoints.map(p => new Date(p.timestamp).getTime()) : undefined}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    const hours = date.getUTCHours().toString().padStart(2, '0');
                    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                    return `${hours}:${minutes}`;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[priceRange.min, priceRange.max]}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  id="y-axis"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null;
                    
                    const data = payload[0].payload;
                    const date = new Date(data.timestamp || data.originalTimestamp);
                    const hours = date.getUTCHours().toString().padStart(2, '0');
                    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                    const price = payload[0].value as number;
                    
                    return (
                      <Box
                        bg="bg.default"
                        border="1px solid"
                        borderColor="border.default"
                        rounded="md"
                        p={2}
                        boxShadow="md"
                      >
                        <Text fontWeight="bold" fontSize="sm" mb={1}>
                          {hours}:{minutes}
                        </Text>
                        <Text fontSize="sm" color="fg.muted">
                          ${price.toFixed(2)}
                        </Text>
                      </Box>
                    );
                  }}
                />
                
                {/* Zone sous la courbe pour la sélection (cyan clair transparent) - avant la ligne principale */}
                {selectedPoints.length === 2 && (
                  <Area
                    type="linear"
                    dataKey="selectedAreaClose"
                    stroke="none"
                    fill="#06b6d4"
                    fillOpacity={0.8}
                    data={chartData}
                    isAnimationActive={false}
                    connectNulls={false}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                
                {/* Ligne principale avec points */}
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload || !cx || !cy) {
                      return <g />;
                    }
                    
                    const timestamp = payload.originalTimestamp || new Date(payload.timestamp).toISOString();
                    const isSelected = selectedPoints.includes(timestamp);
                    const isLastSegmentPoint = lastSegmentPoints.some(
                      p => p.timestamp === timestamp
                    );
                    
                    // Capturer les coordonnées des points sélectionnés
                    if (isSelected && selectedPoints.length === 2) {
                      const [startTime, endTime] = selectedPoints.map(t => new Date(t).getTime()).sort((a, b) => a - b);
                      const pointTime = new Date(timestamp).getTime();
                      if (pointTime === startTime) {
                        selectedPointsCoordinates.current.start = { x: cx, y: cy };
                      } else if (pointTime === endTime) {
                        selectedPointsCoordinates.current.end = { x: cx, y: cy };
                      }
                    }
                    
                    // Capturer les coordonnées des points du dernier segment
                    if (isLastSegmentPoint && existingSegments.length > 0) {
                      const lastSegment = getLastSegmentByCreatedAt();
                      if (!lastSegment) return <g />;
                      const startTime = new Date(lastSegment.segmentStart).getTime();
                      const endTime = new Date(lastSegment.segmentEnd).getTime();
                      const pointTime = new Date(timestamp).getTime();
                      if (pointTime === startTime) {
                        lastSegmentCoordinates.current.start = { x: cx, y: cy };
                      } else if (pointTime === endTime) {
                        lastSegmentCoordinates.current.end = { x: cx, y: cy };
                      }
                    }
                    
                    // Point sélectionné
                    if (isSelected) {
                      return (
                        <Dot
                          key={`selected-${timestamp}`}
                          cx={cx}
                          cy={cy}
                          r={10}
                          fill="#3b82f6"
                          stroke="#1e40af"
                          strokeWidth={3}
                        />
                      );
                    }
                    
                    // Point du dernier segment (rouge pâle)
                    if (isLastSegmentPoint) {
                      return (
                        <Dot
                          key={`last-segment-${timestamp}`}
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill="#fca5a5"
                          stroke="#ef4444"
                          strokeWidth={2}
                          strokeOpacity={0.5}
                        />
                      );
                    }
                    
                    // Point normal
                    return (
                      <Dot
                        key={`normal-${timestamp}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#94a3b8"
                        stroke="#64748b"
                        strokeWidth={1}
                      />
                    );
                  }}
                />
                
                {/* Ligne en surbrillance cyan entre les points sélectionnés */}
                {selectedPoints.length === 2 && areaData.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey="areaClose"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={false}
                    data={areaData}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Box>
          
          <Text fontSize="sm" color="fg.muted" mt={2}>
            Cliquez sur les points pour sélectionner le début et la fin du segment (2 points maximum)
          </Text>
        </Card.Body>
      </Card.Root>

      {/* Formulaire de configuration */}
      <Card.Root>
        <Card.Header>
          <Text fontSize="lg" fontWeight="bold" color="fg.default">
            Configuration du segment
          </Text>
        </Card.Header>
        <Card.Body>
          <VStack gap={4} align="stretch">
            <Field.Root>
              <Field.Label>Type de schéma (R ou V)</Field.Label>
              <select
                value={schemaType}
                onChange={(e) => setSchemaType(e.target.value as 'R' | 'V' | 'UNCLASSIFIED')}
                disabled={selectedPoints.length !== 2}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid var(--chakra-colors-border-default)',
                  borderRadius: 'var(--chakra-radii-md)',
                  background: 'var(--chakra-colors-bg-default)',
                  color: 'var(--chakra-colors-fg-default)',
                  width: '100%',
                  cursor: selectedPoints.length !== 2 ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="UNCLASSIFIED">Non classé</option>
                <option value="R">R</option>
                <option value="V">V</option>
              </select>
              <Field.HelperText>
                Sélectionnez 2 points pour activer cette option
              </Field.HelperText>
            </Field.Root>

            <Field.Root>
              <Field.Label>Point de pattern (optionnel)</Field.Label>
              <select
                value={patternPoint || ''}
                onChange={(e) => setPatternPoint(e.target.value || null)}
                disabled={selectedPoints.length !== 2}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid var(--chakra-colors-border-default)',
                  borderRadius: 'var(--chakra-radii-md)',
                  background: 'var(--chakra-colors-bg-default)',
                  color: 'var(--chakra-colors-fg-default)',
                  width: '100%',
                  cursor: selectedPoints.length !== 2 ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="">Aucun</option>
                {selectedPoints.length === 2 && displayPoints
                  .filter(p => {
                    const pointTime = new Date(p.timestamp).getTime();
                    const startTime = new Date(selectedPoints[0]).getTime();
                    const endTime = new Date(selectedPoints[1]).getTime();
                    return pointTime >= startTime && pointTime <= endTime;
                  })
                    .map(point => {
                      const date = new Date(point.timestamp);
                      // Utiliser UTC pour correspondre au format du graphique
                      const hours = date.getUTCHours().toString().padStart(2, '0');
                      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                      return (
                        <option key={point.timestamp} value={point.timestamp}>
                          {hours}:{minutes}
                        </option>
                      );
                    })}
              </select>
              <Field.HelperText>
                Sélectionnez un point dans le segment pour le pattern
              </Field.HelperText>
            </Field.Root>

            <HStack gap={3} align="stretch">
              <Button
                onClick={handleSaveSegment}
                disabled={!canSave || isSaving}
                colorPalette="blue"
                size="lg"
                flex={1}
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" mr={2} />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Save size={18} style={{ marginRight: '8px' }} />
                    Créer le segment
                  </>
                )}
              </Button>
              
              {existingSegments.length > 0 && (
                <Button
                  onClick={handleEnd}
                  disabled={isSaving || (previousSegment !== null && isResultCorrect === null)}
                  colorPalette="red"
                  size="lg"
                  variant="solid"
                >
                  <AlertTriangle size={18} style={{ marginRight: '8px' }} />
                  Terminer
                </Button>
              )}
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}

