// Minimal localStorage + window shim so the store runs under node.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

export function installDomShim(): MemoryStorage {
  const storage = new MemoryStorage();
  const w = { localStorage: storage } as unknown as Window & typeof globalThis;
  Object.defineProperty(globalThis, "window", { value: w, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return storage;
}
