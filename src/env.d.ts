/// <reference types="astro/client" />

declare global {
  interface Window {
    /** watchdog timer set by the inline script in Base.astro; see animations.ts */
    __revealFallback?: ReturnType<typeof setTimeout>;
  }
}

export {};
