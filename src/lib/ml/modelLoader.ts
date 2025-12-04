'use server';

/**
 * Charge dynamiquement un modèle custom si disponible,
 * sinon retombe sur le modèle par défaut.
 * Retourne aussi le nom du modèle utilisé pour le stocker en base de données.
 */
export async function loadMlModel() {
  try {
    // Tente d'importer un modèle custom déposé par l'utilisateur
    const custom = await import('./customModel');
    if (typeof custom.classifySegment === 'function') {
      // Récupérer le nom du fichier JSON directement sans charger le modèle
      // Cela garantit qu'on obtient toujours le bon nom de fichier
      const modelFileName = await custom.getModelFileName();
      
      if (!modelFileName) {
        throw new Error('Impossible de trouver un fichier JSON de modèle dans data/');
      }
      
      return { 
        classifySegment: custom.classifySegment,
        classifySegmentsBatch: custom.classifySegmentsBatch,
        modelName: modelFileName // Nom du fichier du modèle entraîné trouvé (ex: "first_model_1.json", "second_model_2.json")
      };
    }
  } catch {
    // Pas de modèle custom, on utilise le défaut
  }
  const fallback = await import('./defaultModel');
  return { 
    classifySegment: fallback.classifySegment,
    classifySegmentsBatch: undefined,
    modelName: 'defaultModel.ts' // Nom du modèle par défaut
  };
}



