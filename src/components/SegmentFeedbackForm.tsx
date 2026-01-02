/**
 * Client Component: Segment Feedback Form
 * =======================================
 * 
 * Formulaire pour afficher et modifier le feedback d'un segment
 * Utilisé dans la page de visualisation d'un segment manuel
 */

'use client';

import { useState } from 'react';
import {
  VStack,
  Text,
  Card,
  Button,
  Field,
  Input,
  Spinner,
} from "@chakra-ui/react";
import { Save } from 'lucide-react';

interface SegmentFeedbackFormProps {
  segmentId: string;
  initialIsResultCorrect: string | null;
  initialResultInterval: string | null;
  initialResult: string | null;
  onSave?: () => void;
}

export default function SegmentFeedbackForm({
  segmentId,
  initialIsResultCorrect,
  initialResultInterval,
  initialResult,
  onSave,
}: SegmentFeedbackFormProps) {
  const [isResultCorrect, setIsResultCorrect] = useState<string>(initialIsResultCorrect || '');
  const [resultInterval, setResultInterval] = useState<string>(initialResultInterval || '');
  const [resultValue, setResultValue] = useState<string>(initialResult || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!isResultCorrect.trim()) {
      alert('Le champ "Résultat(s) du segment" est requis');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/update-segment-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId,
          isResultCorrect: isResultCorrect.trim() || null,
          resultInterval: resultInterval.trim() || null,
          result: resultValue.trim() || null,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert('Feedback enregistré avec succès');
        if (onSave) {
          onSave();
        } else {
          // Recharger la page pour afficher les nouvelles valeurs
          window.location.reload();
        }
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

  return (
    <Card.Root>
      <Card.Header>
        <Text fontSize="lg" fontWeight="bold" color="fg.default">
          Résultat du segment
        </Text>
      </Card.Header>
      <Card.Body>
        <VStack gap={4} align="stretch">
          <Field.Root>
            <Field.Label>Résultat(s) du segment (valeurs entre 0 et 1)</Field.Label>
            <Input
              type="text"
              value={isResultCorrect}
              onChange={(e) => setIsResultCorrect(e.target.value)}
              placeholder="Ex: 1 ou 0.8 0.5 1 0.9 (plusieurs valeurs 0-1 séparées par des espaces)"
            />
            <Field.HelperText>
              Valeur(s) de correction du résultat (0 = incorrect, 1 = correct, valeurs décimales entre 0 et 1 possibles). Vous pouvez saisir plusieurs valeurs séparées par des espaces, une pour chaque intervalle.
            </Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label>Intervalle(s) de temps (en minutes) pour que le résultat se réalise</Field.Label>
            <Input
              type="text"
              value={resultInterval}
              onChange={(e) => setResultInterval(e.target.value)}
              placeholder="Ex: 30 ou 30 60 90 (plusieurs nombres séparés par des espaces)"
            />
            <Field.HelperText>
              Durée(s) en minutes entre la fin du segment et la réalisation du résultat. Vous pouvez saisir plusieurs nombres séparés par des espaces. Le nombre de valeurs doit correspondre au nombre de valeurs de résultat.
            </Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label>Résultat</Field.Label>
            <Input
              type="text"
              value={resultValue}
              onChange={(e) => setResultValue(e.target.value)}
              placeholder="Saisir le résultat du segment"
            />
            <Field.HelperText>
              Résultat du segment
            </Field.HelperText>
          </Field.Root>

          <Button
            onClick={handleSave}
            disabled={isSaving || !isResultCorrect.trim()}
            colorPalette="blue"
            size="lg"
            width="100%"
          >
            {isSaving ? (
              <>
                <Spinner size="sm" mr={2} />
                Enregistrement en cours...
              </>
            ) : (
              <>
                <Save size={18} style={{ marginRight: '8px' }} />
                Enregistrer le feedback
              </>
            )}
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}


