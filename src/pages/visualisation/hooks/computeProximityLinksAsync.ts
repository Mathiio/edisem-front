import { computeProximityLinks, type ProximityLink, type RecitNode } from './useRecitsData';

let worker: Worker | null = null;

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./recitsProximity.worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      worker = null;
    }
  }
  return worker;
}

export function computeProximityLinksAsync(
  nodes: RecitNode[],
  minWeight = 1,
): Promise<ProximityLink[]> {
  const w = getWorker();
  if (!w) {
    return Promise.resolve(computeProximityLinks(nodes, minWeight));
  }

  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'done') {
        cleanup();
        resolve(event.data.links as ProximityLink[]);
      }
    };
    const onError = (err: ErrorEvent) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    w.postMessage({ type: 'compute', nodes, minWeight });
  });
}
