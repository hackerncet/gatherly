import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "fake-indexeddb/auto";

Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  configurable: true,
  value: function () {
    this.setAttribute("open", "");
  },
});
Object.defineProperty(HTMLDialogElement.prototype, "close", {
  configurable: true,
  value: function () {
    this.removeAttribute("open");
  },
});
Object.defineProperty(HTMLElement.prototype, "getClientRects", {
  configurable: true,
  value: function () {
    return this.hidden ? [] : [{ width: 100, height: 30 }];
  },
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

Object.defineProperty(URL, "createObjectURL", {
  configurable: true,
  value: () => "blob:test-download",
});
Object.defineProperty(URL, "revokeObjectURL", {
  configurable: true,
  value: () => {},
});
