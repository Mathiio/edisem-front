/**
 * Calcul O(n²) des liens de proximité hors thread principal.
 */

import { computeProximityLinks, type RecitNode } from './useRecitsData';

export type RecitsProximityWorkerRequest = {
  type: 'compute';
  nodes: RecitNode[];
  minWeight: number;
};

export type RecitsProximityWorkerResponse = {
  type: 'done';
  links: ReturnType<typeof computeProximityLinks>;
};

self.onmessage = (event: MessageEvent<RecitsProximityWorkerRequest>) => {
  const msg = event.data;
  if (msg?.type !== 'compute') return;
  const links = computeProximityLinks(msg.nodes, msg.minWeight);
  const response: RecitsProximityWorkerResponse = { type: 'done', links };
  self.postMessage(response);
};
