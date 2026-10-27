/**
 * Optimizer Task Runner: Bridges UI with Web Worker / Cooperative Solver
 *
 * Runs expensive 2D fabric nesting off the browser main thread via Web Worker.
 * If Web Workers are unavailable (e.g. Node.js test environment or strict iframe sandbox),
 * falls back to cooperative asynchronous execution with main-thread yielding.
 */

import { optimizeFabricCuttingAsync } from './fabricOptimizer.js';

let sharedWorker = null;

export async function runFabricOptimizationTask(params, options = {}) {
  const { onProgress, signal, maxTimeMs = 5000, maxEvaluations = 30, ...restOptions } = options;

  // Filter out non-serializable properties (AbortSignal, functions) before cloning to worker
  const serializableOptions = {
    maxTimeMs,
    maxEvaluations
  };
  for (const [key, val] of Object.entries(restOptions)) {
    if (
      typeof val !== 'function' &&
      typeof val !== 'symbol' &&
      !(typeof AbortSignal !== 'undefined' && val instanceof AbortSignal)
    ) {
      serializableOptions[key] = val;
    }
  }

  // Check early cancellation
  if (signal && signal.aborted) {
    return { cancelled: true, success: false, error: 'Optimization was cancelled.' };
  }

  // Check if Web Worker is supported in the current environment
  const canUseWorker = typeof Worker !== 'undefined' && typeof window !== 'undefined';

  if (!canUseWorker) {
    // Cooperative main-thread solver for Node.js tests and non-browser runners
    return optimizeFabricCuttingAsync(params, {
      signal,
      onProgress,
      maxTimeMs,
      maxEvaluations,
      ...restOptions
    });
  }

  return new Promise((resolve) => {
    let worker = null;
    const jobId = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    let isSettled = false;

    const cleanup = () => {
      if (worker) {
        worker.terminate();
        worker = null;
      }
    };

    try {
      worker = new Worker(new URL('../workers/optimizer.worker.js', import.meta.url), {
        type: 'module'
      });
    } catch (e) {
      console.warn('Worker creation failed, falling back to cooperative async solver:', e);
      cleanup();
      return resolve(
        optimizeFabricCuttingAsync(params, {
          signal,
          onProgress,
          maxTimeMs,
          maxEvaluations,
          ...restOptions
        })
      );
    }

    // Attach cancellation listener
    let onAbortHandler = null;
    if (signal) {
      onAbortHandler = () => {
        if (!isSettled) {
          isSettled = true;
          try {
            worker.postMessage({ type: 'CANCEL', id: jobId });
          } catch (_) {}
          cleanup();
          resolve({
            cancelled: true,
            success: false,
            error: 'Optimization was cancelled.'
          });
        }
      };
      signal.addEventListener('abort', onAbortHandler, { once: true });
    }

    worker.onmessage = function (e) {
      const data = e.data || {};
      if (data.id !== jobId) return;

      if (data.type === 'PROGRESS') {
        onProgress?.({
          percent: data.percent,
          status: data.status,
          stepId: data.stepId,
          evaluationsDone: data.evaluationsDone,
          totalEvaluationsTarget: data.totalEvaluationsTarget
        });
      } else if (data.type === 'SUCCESS') {
        if (!isSettled) {
          isSettled = true;
          if (signal && onAbortHandler) {
            signal.removeEventListener('abort', onAbortHandler);
          }
          cleanup();
          resolve(data.result);
        }
      } else if (data.type === 'CANCELLED') {
        if (!isSettled) {
          isSettled = true;
          if (signal && onAbortHandler) {
            signal.removeEventListener('abort', onAbortHandler);
          }
          cleanup();
          resolve({
            cancelled: true,
            success: false,
            error: 'Optimization was cancelled.'
          });
        }
      } else if (data.type === 'ERROR') {
        if (!isSettled) {
          isSettled = true;
          if (signal && onAbortHandler) {
            signal.removeEventListener('abort', onAbortHandler);
          }
          cleanup();
          resolve({
            success: false,
            error: data.error || 'Optimization solver failed.'
          });
        }
      }
    };

    worker.onerror = function (err) {
      if (!isSettled) {
        isSettled = true;
        console.error('Optimizer Worker encountered error, falling back:', err);
        cleanup();
        // Fallback to cooperative async solver if worker crashed
        resolve(
          optimizeFabricCuttingAsync(params, {
            signal,
            onProgress,
            maxTimeMs,
            maxEvaluations,
            ...restOptions
          })
        );
      }
    };

    // Send start message with clone error safeguard
    try {
      worker.postMessage({
        type: 'START',
        id: jobId,
        params,
        options: serializableOptions
      });
    } catch (postErr) {
      console.warn('Worker postMessage failed, falling back to cooperative async solver:', postErr);
      cleanup();
      resolve(
        optimizeFabricCuttingAsync(params, {
          signal,
          onProgress,
          maxTimeMs,
          maxEvaluations,
          ...restOptions
        })
      );
    }
  });
}
