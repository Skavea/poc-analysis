/**
 * Client Component: Next Analysis Handler
 * ======================================
 * 
 * Gère la redirection automatique vers le prochain élément non classifié
 * après classification de l'élément actuel
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface NextAnalysisHandlerProps {
  currentSegmentId: string;
  isClassified: boolean;
  nextUnclassifiedId?: string;
}

export default function NextAnalysisHandler({ 
  currentSegmentId, 
  isClassified, 
  nextUnclassifiedId 
}: NextAnalysisHandlerProps) {
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Si l'élément est classifié et qu'il y a un prochain élément non classifié
    // et qu'on n'a pas encore redirigé, rediriger automatiquement
    if (isClassified && nextUnclassifiedId && !hasRedirected) {
      setHasRedirected(true);
      // Délai court pour permettre à l'utilisateur de voir la classification
      const timer = setTimeout(() => {
        router.push(`/segment/${encodeURIComponent(nextUnclassifiedId)}`);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isClassified, nextUnclassifiedId, hasRedirected, router]);

  // Ce composant ne rend rien, il gère seulement la logique de redirection
  return null;
}
