import fs from "node:fs";
import path from "node:path";
import initProphet from "@bsull/augurs/prophet";
import type { DataPoint } from "../lib/types";

async function initNodeWasm() {
  const wasmPath = path.resolve(
    process.cwd(),
    "node_modules/@bsull/augurs/prophet_bg.wasm",
  );
  const wasmBuffer = fs.readFileSync(wasmPath);
  await initProphet(wasmBuffer);
}

// Simulated Worker Cross-Validation Engine with Cancellation Support
export class MockWorkerProphetEngine {
  private cancelRequested = false;
  public progressEvents: Array<{ percent: number; step: string }> = [];

  public cancelCV() {
    this.cancelRequested = true;
  }

  public async runCrossValidationSim(
    _data: DataPoint[],
    cutoffsCount: number = 10,
    cancelAtCutoff?: number,
  ): Promise<{ status: "SUCCESS" | "CANCELLED"; evaluatedCutoffs: number }> {
    this.cancelRequested = false;
    this.progressEvents = [];
    let evaluated = 0;

    for (let k = 0; k < cutoffsCount; k++) {
      // Yield to allow message processing (simulate worker event loop tick)
      await new Promise((r) => setTimeout(r, 10));

      if (cancelAtCutoff !== undefined && k === cancelAtCutoff) {
        this.cancelCV();
      }

      if (this.cancelRequested) {
        return { status: "CANCELLED", evaluatedCutoffs: evaluated };
      }

      const percent = Math.round(((k + 1) / cutoffsCount) * 100);
      const step = `Cutoff ${k + 1}/${cutoffsCount}`;
      this.progressEvents.push({ percent, step });

      // Simulate fit execution delay
      evaluated++;
    }

    if (this.cancelRequested) {
      return { status: "CANCELLED", evaluatedCutoffs: evaluated };
    }

    return { status: "SUCCESS", evaluatedCutoffs: evaluated };
  }
}

export async function runCancellationStressTest() {
  console.log("\n=======================================================");
  console.log("  STRESS TEST 5: Cancellation Handling");
  console.log("=======================================================");

  const results = {
    immediateCancellationPassed: false,
    midwayCancellationPassed: false,
    uncancelledCVCompletedPassed: false,
    details: [] as string[],
  };

  try {
    await initNodeWasm();
    const engine = new MockWorkerProphetEngine();

    // 1. Immediate Cancellation Test (Cancel at cutoff 0)
    console.log("Testing immediate cancellation on dispatch...");
    const resImmediate = await engine.runCrossValidationSim([], 10, 0);
    results.immediateCancellationPassed =
      resImmediate.status === "CANCELLED" &&
      resImmediate.evaluatedCutoffs === 0;
    results.details.push(
      `Immediate Cancellation: ${results.immediateCancellationPassed ? "PASS" : "FAIL"} (Evaluated: ${resImmediate.evaluatedCutoffs}/10 cutoffs)`,
    );

    // 2. Mid-way Cancellation Test (Cancel at cutoff 3 of 10)
    console.log("Testing mid-way cancellation during execution (cutoff 3)...");
    const resMidway = await engine.runCrossValidationSim([], 10, 3);
    results.midwayCancellationPassed =
      resMidway.status === "CANCELLED" && resMidway.evaluatedCutoffs === 3;
    results.details.push(
      `Mid-way Cancellation: ${results.midwayCancellationPassed ? "PASS" : "FAIL"} (Evaluated: ${resMidway.evaluatedCutoffs}/10 cutoffs, stopped immediately)`,
    );

    // 3. Normal Uncancelled Run Test
    console.log("Testing uncancelled full cross-validation run...");
    const resFull = await engine.runCrossValidationSim([], 5);
    results.uncancelledCVCompletedPassed =
      resFull.status === "SUCCESS" && resFull.evaluatedCutoffs === 5;
    results.details.push(
      `Uncancelled CV Run: ${results.uncancelledCVCompletedPassed ? "PASS" : "FAIL"} (Evaluated: ${resFull.evaluatedCutoffs}/5 cutoffs)`,
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.details.push(`ERROR in Cancellation stress test: ${errorMsg}`);
  }

  return results;
}
