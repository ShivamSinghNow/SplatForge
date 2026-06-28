import { useEffect, useRef } from 'react';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

export interface SplatScene {
  id: string;
  name: string;
  src: string; // /splats/<file>.splat | .ply | .ksplat
  cameraUp?: [number, number, number];
  cameraPosition?: [number, number, number];
  cameraLookAt?: [number, number, number];
}

interface SplatViewerProps {
  scene: SplatScene;
  onError?: (message: string) => void;
}

// Real Gaussian-splat viewer. sharedMemoryForWorkers:false avoids the COOP/COEP
// header requirement (SharedArrayBuffer), so it runs under a plain dev server.
export function SplatViewer({ scene, onError }: SplatViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    let disposed = false;
    // The library ships no types; the handle is dynamically typed.
    let viewer: any;

    try {
      viewer = new GaussianSplats3D.Viewer({
        rootElement: root,
        sharedMemoryForWorkers: false,
        gpuAcceleratedSort: false,
        cameraUp: scene.cameraUp ?? [0, 1, 0],
        initialCameraPosition: scene.cameraPosition ?? [0, 0, 4],
        initialCameraLookAt: scene.cameraLookAt ?? [0, 0, 0],
        sceneRevealMode: GaussianSplats3D.SceneRevealMode.Gradual,
      });

      viewer
        .addSplatScene(scene.src, { showLoadingUI: true, splatAlphaRemovalThreshold: 5 })
        .then(() => {
          if (!disposed) {
            viewer?.start();
          }
        })
        .catch((error: unknown) => {
          // Ignore errors from a viewer that React StrictMode already tore down
          // (its load finishes after dispose and would otherwise show a false error).
          if (disposed) {
            return;
          }
          onError?.(error instanceof Error ? error.message : `Failed to load ${scene.src}`);
        });
    } catch (error: unknown) {
      // e.g. no WebGL context available
      onError?.(error instanceof Error ? error.message : 'Splat viewer failed to initialise');
    }

    return () => {
      disposed = true;
      try {
        viewer?.stop?.();
        viewer?.dispose?.();
      } catch {
        /* viewer may already be torn down */
      }
    };
  }, [scene, onError]);

  return <div ref={rootRef} className="splat-viewer" />;
}
