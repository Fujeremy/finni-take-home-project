import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom doesn't implement these browser features, which Radix Select calls when it opens.
// They only fill gaps in the simulated browser; they don't change component behavior.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
// jsdom defines window.scrollTo but only reports "not implemented". React Router's
// ScrollRestoration calls it on every page change; jsdom has no layout to scroll anyway.
window.scrollTo = () => {};

// TruncatedText watches its width with ResizeObserver. jsdom never resizes anything, so a
// stand-in that never reports a change is enough.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Unmount rendered components after each test so tests never see each other's output.
afterEach(() => {
  cleanup();
});
