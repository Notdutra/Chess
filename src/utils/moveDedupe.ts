export function createDedupe(ttlMs = 5000) {
  const map = new Map<string, number>();

  return {
    isDuplicate(key: string) {
      const now = Date.now();
      const prev = map.get(key);
      if (!prev) return false;
      if (now - prev > ttlMs) {
        map.delete(key);
        return false;
      }
      return true;
    },
    mark(key: string) {
      map.set(key, Date.now());
    },
    clear(key: string) {
      map.delete(key);
    },
    // helper for tests
    _internalMap: map,
  };
}
