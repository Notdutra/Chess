import { createDedupe } from "../../src/utils/moveDedupe";
import { createDispatcher } from "../../src/utils/moveDispatcher";

describe("dispatcher + dedupe integration", () => {
  test("duplicate deliveries with same key are filtered and only one task runs", async () => {
    const dedupe = createDedupe(1000);
    const dispatcher = createDispatcher(dedupe);

    let runCount = 0;

    const task = async () => {
      // simulate async move application
      await new Promise((r) => setTimeout(r, 20));
      runCount++;
      return true;
    };

    const key = "fen1|e2e4";

    // Enqueue first task
    const p1 = dispatcher.enqueue(task, key);
    // Enqueue duplicate task shortly after
    const p2 = dispatcher.enqueue(task, key);

    const results = await Promise.all([p1, p2]);

    // One of the results should be true (the executed task) and the other null (deduped)
    expect(results.filter((r) => r === true).length).toBe(1);
    expect(results.filter((r) => r === null).length).toBe(1);
    expect(runCount).toBe(1);
  });
});
