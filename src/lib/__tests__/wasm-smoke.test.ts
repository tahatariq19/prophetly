import initProphet, { Prophet } from "@bsull/augurs/prophet";
import { optimizer } from "@bsull/augurs-prophet-wasmstan";
import { describe, expect, it } from "vitest";

describe("WASM Smoke Test", () => {
  it("initializes WASM prophet engine", async () => {
    await initProphet();
    const prophet = new Prophet({ optimizer });
    expect(prophet).toBeDefined();
    prophet.free();
  });
});
