/**
 * Web Worker for Loom & Layer Fabric Marker Nesting Optimizer
 *
 * Runs computationally heavy polygon collision detection, rotation search,
 * and multi-heuristic packing completely off the browser main UI thread.
 */

import { optimizeFabricCutting } from '../utils/fabricOptimizer.js';

let activeJobId = null;
let isCancelled = false;

self.onmessage = function (e) {
  const data = e.data || {};
  const { type, id, params, options } = data;

  if (type === 'CANCEL') {
    if (!id || id === activeJobId) {
      isCancelled = true;
    }
    return;
  }

  if (type === 'START') {
    activeJobId = id;
    isCancelled = false;

    try {
      const result = optimizeFabricCutting(params, {
        ...options,
        signal: {
          get aborted() {
            return isCancelled;
          }
        },
        onProgress: (prog) => {
          if (!isCancelled) {
            self.postMessage({ type: 'PROGRESS', id, ...prog });
          }
        }
      });

      if (isCancelled) {
        self.postMessage({ type: 'CANCELLED', id });
      } else {
        self.postMessage({ type: 'SUCCESS', id, result });
      }
    } catch (err) {
      self.postMessage({ type: 'ERROR', id, error: err?.message || String(err) });
    }
  }
};
