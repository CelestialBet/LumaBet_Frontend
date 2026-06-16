import "@testing-library/jest-dom";

// Required for React 18 concurrent mode act() support in Vitest
(globalThis as Record<string, unknown>)["IS_REACT_ACT_ENVIRONMENT"] = true;

// Reset fetch mock between tests
beforeEach(() => {
  vi.resetAllMocks();
  // Restore global.fetch if it was replaced
  if (!globalThis.fetch || (globalThis.fetch as unknown as { _isMockFunction?: boolean })._isMockFunction) {
    globalThis.fetch = vi.fn();
  }
});
