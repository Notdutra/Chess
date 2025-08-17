import { createDedupe } from "../../src/utils/moveDedupe";

describe("createDedupe", () => {
  test("marks and detects duplicates within ttl", () => {
    const dedupe = createDedupe(1000);
    const key = "fen1|e2e4";

    expect(dedupe.isDuplicate(key)).toBe(false);
    dedupe.mark(key);
    expect(dedupe.isDuplicate(key)).toBe(true);

    // clear and ensure no longer duplicate
    dedupe.clear(key);
    expect(dedupe.isDuplicate(key)).toBe(false);
  });

  test("expires keys after ttl", async () => {
    const dedupe = createDedupe(50);
    const key = "fen2|d2d4";
    dedupe.mark(key);
    expect(dedupe.isDuplicate(key)).toBe(true);
    await new Promise((r) => setTimeout(r, 60));
    expect(dedupe.isDuplicate(key)).toBe(false);
  });
});
