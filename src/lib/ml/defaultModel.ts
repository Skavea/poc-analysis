'use server';

/**
 * Modèle ML par défaut (bouchon).
 * Remplacez cette implémentation en déposant un modèle dans `src/lib/ml/customModel.ts`
 * exportant la même signature `classifySegment`.
 */
export type MlClass = 'R' | 'V';

export interface MlInput {
  id: string;
  symbol: string;
  date: string;
  points_data: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export async function classifySegment(input: MlInput): Promise<MlClass> {
  // Heuristique minimale pour fournir un comportement par défaut si aucun modèle custom n'est fourni.
  // Vous devez remplacer ce fichier par un vrai modèle.
  const closes = input.points_data?.map(p => p.close) ?? [];
  if (closes.length < 2) return 'R';
  const first = closes[0];
  const last = closes[closes.length - 1];
  return last >= first ? 'R' : 'V';
}


