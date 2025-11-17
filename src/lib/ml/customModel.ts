'use server';

/**
 * Chargement d'un modèle TFJS (LayersModel) depuis data/model.json
 * et classification de segments en 'R' ou 'V'.
 *
 * Le modèle converti TFJS doit rester dans data/model.json (+ shards .bin)
 * tel que demandé par l'utilisateur.
 */

import path from 'path';
import fs from 'fs/promises';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';

let modelPromise: Promise<tf.LayersModel> | null = null;
let backendReadyPromise: Promise<void> | null = null;

async function ensureBackend() {
  if (!backendReadyPromise) {
    backendReadyPromise = (async () => {
      try {
        // Configurer le chemin des binaires WASM (depuis node_modules)
        const wasmDir = path
          .join(process.cwd(), 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist')
          .replace(/\\/g, '/');
        setWasmPaths(`file://${wasmDir}/`);
        // Essaye WASM (souvent plus rapide que CPU pur JS)
        await tf.setBackend('wasm');
        await tf.ready();
      } catch {
        // Fallback sur cpu
        await tf.setBackend('cpu');
        await tf.ready();
      }
    })();
  }
  return backendReadyPromise;
}

async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await ensureBackend();
      // Lecture de data/model.json + poids via un IOHandler custom
      const dataDir = path.join(process.cwd(), 'data');
      const modelJsonPath = path.join(dataDir, 'model.json');
      const raw = await fs.readFile(modelJsonPath, 'utf-8');
      const parsed = JSON.parse(raw) as {
        modelTopology: unknown;
        weightsManifest: Array<{ paths: string[]; weights: tf.io.WeightsManifestEntry['weights'] }>;
      };

      // Agréger toutes les entrées de manifeste (supporte plusieurs blocs)
      const weightSpecs: tf.io.WeightsManifestEntry['weights'] = [];
      const weightBuffers: Buffer[] = [];
      for (const entry of parsed.weightsManifest) {
        if (entry.weights) {
          // @ts-expect-error types internes TFJS
          weightSpecs.push(...entry.weights);
        }
        for (const rel of entry.paths) {
          const binPath = path.join(dataDir, rel);
          const buf = await fs.readFile(binPath);
          weightBuffers.push(buf);
        }
      }
      const weightData = Buffer.concat(weightBuffers).buffer;

      const ioHandler: tf.io.IOHandler = {
        load: async () => ({
          modelTopology: parsed.modelTopology,
          weightSpecs: weightSpecs as unknown as tf.io.WeightsManifestEntry['weights'],
          weightData,
        }),
      };

      return tf.loadLayersModel(ioHandler);
    })();
  }
  return modelPromise;
}

function padOrTruncateSequence<T>(arr: T[], targetLen: number, padValue: T): T[] {
  if (arr.length === targetLen) return arr;
  if (arr.length > targetLen) return arr.slice(0, targetLen);
  const out = arr.slice();
  while (out.length < targetLen) {
    out.push(padValue);
  }
  return out;
}

export async function classifySegment(input: {
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
}): Promise<'R' | 'V'> {
  const model = await loadModel();

  // Préparer les 3 entrées attendues par le modèle TFJS donné:
  // - image_input: [1, 224, 224, 3] (ici rempli de zéros, si non utilisé par ton pipeline)
  // - sequence_input: [1, 50, 5] à partir de points_data (OHLCV)
  // - numeric_input: [1, 11] (zéros par défaut si non fourni)

  // 1) image_input (placeholder zeros)
  const imageInput = tf.tensor4d(new Float32Array(224 * 224 * 3).fill(0), [1, 224, 224, 3]);

  // 2) sequence_input (OHLCV → [50,5], pad/truncate)
  const seqRaw = (input.points_data ?? []).map(p => [p.open, p.high, p.low, p.close, p.volume]);
  const last = seqRaw.length > 0 ? seqRaw[seqRaw.length - 1] : [0, 0, 0, 0, 0];
  const seq50 = padOrTruncateSequence(seqRaw, 50, last);
  const seqFlat = new Float32Array(50 * 5);
  for (let i = 0; i < 50; i++) {
    const row = seq50[i];
    const base = i * 5;
    seqFlat[base] = row[0];
    seqFlat[base + 1] = row[1];
    seqFlat[base + 2] = row[2];
    seqFlat[base + 3] = row[3];
    seqFlat[base + 4] = row[4];
  }
  const sequenceInput = tf.tensor3d(seqFlat, [1, 50, 5]);

  // 3) numeric_input [1, 11] (placeholder zeros)
  const numericInput = tf.tensor2d(new Float32Array(11).fill(0), [1, 11]);

  // Construire le tableau d'entrées dans l'ordre attendu par le modèle
  const inputsOrdered: tf.Tensor[] = model.inputs.map((inputTensor) => {
    const name = inputTensor.name.replace(/:0$/, '');
    if (name.includes('image_input')) return imageInput;
    if (name.includes('sequence_input')) return sequenceInput;
    if (name.includes('numeric_input')) return numericInput;
    return imageInput; // fallback sûr
  });

  // Exécuter la prédiction avec l'ordre des entrées
  const pred = model.predict(inputsOrdered) as tf.Tensor | tf.Tensor[];
  const outTensor = Array.isArray(pred) ? pred[0] : pred;

  const probs = await outTensor.data();
  // On suppose la sortie softmax à 2 classes: index 0 = 'R', index 1 = 'V' (adapter si besoin)
  const result = (probs[1] ?? 0) >= (probs[0] ?? 0) ? 'V' : 'R';

  imageInput.dispose();
  sequenceInput.dispose();
  numericInput.dispose();
  outTensor.dispose();

  return result;
}

/**
 * Prédiction batch: traite plusieurs segments en une seule passe.
 * Retourne un tableau de labels 'R' | 'V' dans le même ordre que l'entrée.
 */
export async function classifySegmentsBatch(inputs: Array<{
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
}>): Promise<Array<'R' | 'V'>> {
  const model = await loadModel();
  const batchSize = inputs.length;

  // 1) image_input batch [B,224,224,3]
  const imageBatch = tf.tensor4d(new Float32Array(batchSize * 224 * 224 * 3).fill(0), [batchSize, 224, 224, 3]);

  // 2) sequence_input batch [B,50,5]
  const seqBatch = new Float32Array(batchSize * 50 * 5);
  for (let b = 0; b < batchSize; b++) {
    const seqRaw = (inputs[b].points_data ?? []).map(p => [p.open, p.high, p.low, p.close, p.volume]);
    const last = seqRaw.length > 0 ? seqRaw[seqRaw.length - 1] : [0, 0, 0, 0, 0];
    const seq50 = padOrTruncateSequence(seqRaw, 50, last);
    for (let i = 0; i < 50; i++) {
      const row = seq50[i];
      const base = b * 50 * 5 + i * 5;
      seqBatch[base] = row[0];
      seqBatch[base + 1] = row[1];
      seqBatch[base + 2] = row[2];
      seqBatch[base + 3] = row[3];
      seqBatch[base + 4] = row[4];
    }
  }
  const sequenceBatch = tf.tensor3d(seqBatch, [batchSize, 50, 5]);

  // 3) numeric_input batch [B,11]
  const numericBatch = tf.tensor2d(new Float32Array(batchSize * 11).fill(0), [batchSize, 11]);

  const inputsOrdered: tf.Tensor[] = model.inputs.map((inputTensor) => {
    const name = inputTensor.name.replace(/:0$/, '');
    if (name.includes('image_input')) return imageBatch;
    if (name.includes('sequence_input')) return sequenceBatch;
    if (name.includes('numeric_input')) return numericBatch;
    return imageBatch;
  });

  const pred = model.predict(inputsOrdered) as tf.Tensor | tf.Tensor[];
  const outTensor = Array.isArray(pred) ? pred[0] : pred; // [B,2]
  const probs = await outTensor.array() as number[][];

  imageBatch.dispose();
  sequenceBatch.dispose();
  numericBatch.dispose();
  outTensor.dispose();

  return probs.map(p => ((p?.[1] ?? 0) >= (p?.[0] ?? 0) ? 'V' : 'R'));
}


