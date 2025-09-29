/**
 * Client Component: Classification Success Notification
 * ===================================================
 * 
 * Affiche une notification de succès quand un élément est classifié
 * et indique qu'une redirection va avoir lieu
 */

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Card,
  Badge
} from "@chakra-ui/react";

interface ClassificationSuccessNotificationProps {
  isClassified: boolean;
  nextUnclassifiedId?: string;
}

export default function ClassificationSuccessNotification({ 
  isClassified, 
  nextUnclassifiedId 
}: ClassificationSuccessNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Afficher la notification si l'élément est classifié et qu'il y a un prochain élément
    if (isClassified && nextUnclassifiedId) {
      setShowNotification(true);
      
      // Masquer la notification après 3 secondes
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isClassified, nextUnclassifiedId]);

  if (!showNotification) {
    return null;
  }

  return (
    <Card.Root
      position="fixed"
      top="20px"
      right="20px"
      zIndex={1000}
      boxShadow="lg"
      border="1px solid"
      borderColor="green.200"
      bg="green.50"
    >
      <Card.Body>
        <HStack gap={3} align="center">
          <CheckCircle size={20} color="var(--chakra-colors-green-600)" />
          <VStack gap={1} align="start">
            <Text fontSize="sm" fontWeight="semibold" color="green.700">
              Classification réussie !
            </Text>
            <Text fontSize="xs" color="green.600">
              Redirection vers le prochain élément...
            </Text>
          </VStack>
          <ArrowRight size={16} color="var(--chakra-colors-green-600)" />
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
