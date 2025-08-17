type Task<T = unknown> = {
  key: string;
  fn: () => Promise<T> | T;
  resolve: (v: T | null) => void;
  reject: (err: unknown) => void;
};

type Dedupe = {
  isDuplicate: (k: string) => boolean;
  mark: (k: string) => void;
  clear: (k: string) => void;
};

export function createDispatcher(dedupe: Dedupe) {
  const queue: Task[] = [];
  let running = false;

  const processNext = async () => {
    if (running) return;
    const task = queue.shift();
    if (!task) return;
    running = true;
    try {
      const result = await Promise.resolve(task.fn());
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      // ensure dedupe key cleaned after work finishes
      try {
        dedupe.clear(task.key);
      } catch {}
      running = false;
      // process next in microtask to avoid deep recursion
      setTimeout(processNext, 0);
    }
  };

  return {
    enqueue<T = unknown>(fn: () => Promise<T> | T, key: string): Promise<T | null> {
      // dedupe at intake
      try {
        if (dedupe.isDuplicate(key)) return Promise.resolve(null);
        dedupe.mark(key);
      } catch {
        // if dedupe fails, continue but quietly
      }

      return new Promise<T | null>(
        (resolve: (v: T | null) => void, reject: (err: unknown) => void) => {
          queue.push({
            key,
            fn,
            resolve: (v: unknown) => resolve(v as T | null),
            reject: (err: unknown) => reject(err),
          });
          processNext();
        }
      );
    },
    // helper for tests/debugging
    _queueLength() {
      return queue.length;
    },
  };
}
