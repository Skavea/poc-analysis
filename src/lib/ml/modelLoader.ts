'use server';

/**
 * Charge dynamiquement un modèle custom si disponible,
 * sinon retombe sur le modèle par défaut.
 * Retourne aussi le nom du modèle utilisé pour le stocker en base de données.
 */
export async function loadMlModel(modelPath?: string) {
  try {
    // Tente d'importer un modèle custom déposé par l'utilisateur
    const custom = await import('./customModel');
    if (typeof custom.classifySegment === 'function') {
      // Si un chemin de modèle est spécifié, charger ce modèle
      if (modelPath) {
        await custom.loadModelFromPath(modelPath);
      }
      
      // Récupérer le nom du fichier JSON directement sans charger le modèle
      // Cela garantit qu'on obtient toujours le bon nom de fichier
      // Si modelPath contient "simple" ou "directe", extraire le type
      let type: 'simple' | 'directe' | undefined = undefined;
      if (modelPath) {
        if (modelPath === 'simple' || modelPath.includes('/simple/') || modelPath.startsWith('simple/')) {
          type = 'simple';
        } else if (modelPath === 'directe' || modelPath.includes('/directe/') || modelPath.startsWith('directe/')) {
          type = 'directe';
        }
      } else {
        // Par défaut, utiliser simple
        type = 'simple';
      }
      
      const modelFileName = await custom.getModelFileName(type);
      
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



