import fs from "node:fs";
import path from "node:path";
import initProphet, { Prophet } from "@bsull/augurs/prophet";
import { optimizer } from "@bsull/augurs-prophet-wasmstan";
import { describe, expect, it } from "vitest";

describe("WASM Smoke Test", () => {
  it("initializes WASM prophet engine in Node environment", async () => {
    const wasmPath = path.resolve(
      process.cwd(),
      "node_modules/@bsull/augurs/prophet_bg.wasm",
    );
    const wasmBuffer = fs.readFileSync(wasmPath);
    await initProphet(wasmBuffer);

    const prophet = new Prophet({ optimizer, nChangepoints: 5 });
    expect(prophet).toBeDefined();

    // Verify basic fit and memory cleanup on 100 daily points
    const startTs = Math.floor(Date.UTC(2024, 0, 1) / 1000);
    const dsSecs: number[] = [];
    const yVals: number[] = [];
    for (let i = 0; i < 100; i++) {
      dsSecs.push(startTs + i * 86400);
      yVals.push(10 + i * 0.5 + Math.sin(i / 5));
    }

    prophet.fit({ ds: dsSecs, y: yVals });
    const predictions = prophet.predict({ ds: dsSecs });
    expect(predictions.yhat.point.length).toBe(100);

    expect(() => prophet.free()).not.toThrow();
  });
});
