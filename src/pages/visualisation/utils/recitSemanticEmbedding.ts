import type { RecitNode } from '../hooks/useRecitsData';
import { imaginaireProximityWeight } from '../hooks/useRecitsData';

const MAX_IMAGINAIRE_DISTANCE = 6;
const ISOLATE_DISTANCE = 6.8;

export interface SemanticPoint {
  id: number;
  x: number;
  y: number;
  z: number;
  node: RecitNode;
}

/** Distance métrique dérivée du poids de proximité (0 = identique, plus grand = plus éloigné). */
export function imaginaireDistance(a: RecitNode, b: RecitNode): number {
  const w = imaginaireProximityWeight(a, b);
  if (w <= 0) return ISOLATE_DISTANCE;
  return MAX_IMAGINAIRE_DISTANCE - w + 0.35;
}

function buildDistanceMatrix(nodes: RecitNode[]): number[][] {
  const n = nodes.length;
  const d: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = imaginaireDistance(nodes[i], nodes[j]);
      d[i][j] = dist;
      d[j][i] = dist;
    }
  }
  return d;
}

/** Vecteurs binaires : une colonne par valeur distincte (figures, enjeux, …). */
export function buildImaginaireFeatureMatrix(nodes: RecitNode[]): { matrix: number[][]; labels: string[] } {
  const labelSet = new Set<string>();
  const addLabels = (prefix: string, values: string[]) => {
    values.forEach((v) => {
      const t = v.trim();
      if (t) labelSet.add(`${prefix}:${t}`);
    });
  };

  for (const node of nodes) {
    addLabels('fig', node.figures);
    addLabels('enj', node.enjeux);
    addLabels('cad', node.cadrages);
    addLabels('aff', node.affects);
    addLabels('pro', node.promesses);
    addLabels('ris', node.risques);
  }

  const labels = Array.from(labelSet).sort((a, b) => a.localeCompare(b, 'fr'));
  const index = new Map(labels.map((l, i) => [l, i]));
  const matrix = nodes.map((node) => {
    const row = Array(labels.length).fill(0);
    const mark = (prefix: string, values: string[]) => {
      values.forEach((v) => {
        const key = `${prefix}:${v.trim()}`;
        const i = index.get(key);
        if (i != null) row[i] = 1;
      });
    };
    mark('fig', node.figures);
    mark('enj', node.enjeux);
    mark('cad', node.cadrages);
    mark('aff', node.affects);
    mark('pro', node.promesses);
    mark('ris', node.risques);
    return row;
  });

  return { matrix, labels };
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = B[0]?.length ?? 0;
  const p = B.length;
  const out = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < p; k++) {
      for (let j = 0; j < m; j++) {
        out[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return out;
}

function transpose(A: number[][]): number[][] {
  if (A.length === 0) return [];
  const out = Array.from({ length: A[0].length }, () => Array(A.length).fill(0));
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A[0].length; j++) {
      out[j][i] = A[i][j];
    }
  }
  return out;
}

function powerEigenSymmetric(B: number[][], maxIter = 80): { value: number; vector: number[] } {
  const n = B.length;
  let v = Array.from({ length: n }, () => Math.random() - 0.5);
  const norm = () => Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;

  for (let iter = 0; iter < maxIter; iter++) {
    const w = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) w[i] += B[i][j] * v[j];
    }
    v = w;
    const nrm = norm();
    v = v.map((x) => x / nrm);
  }

  let lambda = 0;
  for (let i = 0; i < n; i++) {
    let row = 0;
    for (let j = 0; j < n; j++) row += B[i][j] * v[j];
    lambda += v[i] * row;
  }
  return { value: lambda, vector: v };
}

function deflate(B: number[][], vec: number[], eigenvalue: number): number[][] {
  const n = B.length;
  const out = B.map((row) => [...row]);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      out[i][j] -= eigenvalue * vec[i] * vec[j];
    }
  }
  return out;
}

/** MDS classique (Torgerson) → 2 ou 3 axes principaux. */
export function classicalMds(dist: number[][], dimensions: 2 | 3): { x: number; y: number; z: number }[] {
  const n = dist.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, y: 0, z: 0 }];

  const D2 = dist.map((row) => row.map((d) => d * d));
  const J = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 - 1 / n : -1 / n)),
  );
  const JD2 = matMul(J, D2);
  let B = matMul(JD2, J);
  B = B.map((row) => row.map((v) => -0.5 * v));

  const e1 = powerEigenSymmetric(B);
  let B2 = deflate(B, e1.vector, Math.max(e1.value, 0));
  const e2 = powerEigenSymmetric(B2);
  let B3 = deflate(B2, e2.vector, Math.max(e2.value, 0));
  const e3 = dimensions === 3 ? powerEigenSymmetric(B3) : { value: 0, vector: Array(n).fill(0) };

  const scale = (val: number) => (val > 1e-6 ? Math.sqrt(val) : 0);

  return Array.from({ length: n }, (_, i) => ({
    x: e1.vector[i] * scale(e1.value),
    y: e2.vector[i] * scale(e2.value),
    z: e3.vector[i] * scale(e3.value),
  }));
}

/** PCA 2D rapide sur les features binaires (fallback si MDS instable). */
export function pca2D(matrix: number[][]): { x: number; y: number; z: number }[] {
  const n = matrix.length;
  if (n === 0) return [];
  const d = matrix[0]?.length ?? 0;
  if (d === 0) return matrix.map(() => ({ x: 0, y: 0, z: 0 }));

  const mean = Array(d).fill(0);
  for (const row of matrix) {
    for (let j = 0; j < d; j++) mean[j] += row[j];
  }
  for (let j = 0; j < d; j++) mean[j] /= n;

  const centered = matrix.map((row) => row.map((v, j) => v - mean[j]));
  const cov = matMul(transpose(centered), centered).map((row) => row.map((v) => v / Math.max(n - 1, 1)));

  const e1 = powerEigenSymmetric(cov);
  const cov2 = deflate(cov, e1.vector, Math.max(e1.value, 0));
  const e2 = powerEigenSymmetric(cov2);

  return centered.map((row) => {
    let x = 0;
    let y = 0;
    for (let j = 0; j < d; j++) {
      x += row[j] * (e1.vector[j] ?? 0);
      y += row[j] * (e2.vector[j] ?? 0);
    }
    return { x, y, z: 0 };
  });
}

export type EmbeddingMethod = 'mds' | 'pca';

export function embedRecitsSemantic(
  nodes: RecitNode[],
  method: EmbeddingMethod,
  dimensions: 2 | 3,
): SemanticPoint[] {
  if (nodes.length === 0) return [];

  let coords: { x: number; y: number; z: number }[];
  if (method === 'mds') {
    const dist = buildDistanceMatrix(nodes);
    coords = classicalMds(dist, dimensions);
  } else {
    const { matrix } = buildImaginaireFeatureMatrix(nodes);
    coords = pca2D(matrix);
  }

  const xs = coords.map((c) => c.x);
  const ys = coords.map((c) => c.y);
  const scaleAxis = (vals: number[]) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    return vals.map((v) => ((v - min) / span - 0.5) * 1000);
  };

  const sx = scaleAxis(xs);
  const sy = scaleAxis(ys);
  const sz =
    dimensions === 3
      ? scaleAxis(coords.map((c) => c.z))
      : coords.map(() => 0);

  return nodes.map((node, i) => ({
    id: node.id,
    x: sx[i],
    y: sy[i],
    z: sz[i],
    node,
  }));
}
