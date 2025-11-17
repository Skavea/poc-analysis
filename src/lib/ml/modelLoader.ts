'use server';

/**
 * Charge dynamiquement un modèle custom si disponible,
 * sinon retombe sur le modèle par défaut.
 */
export async function loadMlModel() {
  try {
    // Tente d'importer un modèle custom déposé par l'utilisateur
    const custom = await import('./customModel');
    if (typeof custom.classifySegment === 'function') {
      return { classifySegment: custom.classifySegment };
    }
  } catch {
    // Pas de modèle custom, on utilise le défaut
  }
  const fallback = await import('./defaultModel');
  return { classifySegment: fallback.classifySegment };
}


