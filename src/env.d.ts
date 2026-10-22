/// <reference types="astro/client" />

declare global {
  interface Window {
    /** watchdog timer set by the inline script in Base.astro; see animations.ts */
    __revealFallback?: ReturnType<typeof setTimeout>;
    /** the 3D globe, once its chunk has loaded and mounted; see animations.ts */
    __globe?: import('./globe/scene').GlobeHandle;
  }
}

export {};
