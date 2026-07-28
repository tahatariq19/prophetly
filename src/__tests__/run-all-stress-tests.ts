import { runCancellationStressTest } from "./cancellation.test";
import { runExportsStressTest } from "./exports.test";
import { runPresetsStressTest } from "./presets.test";
import { runThemeAdaptationStressTest } from "./theme.test";
import { runWasmAnd100kStressTest } from "./wasm_100k.test";

async function main() {
  console.log(
    "===============================================================",
  );
  console.log(
    "   PROPHETLY EMPIRICAL STRESS TEST HARNESS & SUITE RUNNER      ",
  );
  console.log(
    "===============================================================",
  );
  console.log(` Timestamp: ${new Date().toISOString()}`);
  console.log(` Environment: Node.js ${process.version}`);
  console.log(
    "===============================================================",
  );

  const overallResults: Record<string, boolean> = {};

  // 1 & 2. WASM Fitting & 100k Row Dataset Support
  const wasm100kRes = await runWasmAnd100kStressTest();
  wasm100kRes.details.forEach((d) => {
    console.log(`  [INFO] ${d}`);
  });
  overallResults["WASM Fitting & 100k Row Dataset Support"] =
    wasm100kRes.scalingTestPassed;

  // 3. Presets
  const presetsRes = await runPresetsStressTest();
  presetsRes.details.forEach((d) => {
    console.log(`  [INFO] ${d}`);
  });
  overallResults["Presets (Quick, Detailed, Conservative)"] =
    presetsRes.allPassed;

  // 4. Exports (CSV, JSON, PNG)
  const exportsRes = await runExportsStressTest();
  exportsRes.details.forEach((d) => {
    console.log(`  [INFO] ${d}`);
  });
  overallResults["CSV / JSON / PNG Exports"] =
    exportsRes.csvExportPassed &&
    exportsRes.jsonExportPassed &&
    exportsRes.pngExportPassed;

  // 5. Cancellation
  const cancelRes = await runCancellationStressTest();
  cancelRes.details.forEach((d) => {
    console.log(`  [INFO] ${d}`);
  });
  overallResults["Web Worker Cancellation"] =
    cancelRes.immediateCancellationPassed &&
    cancelRes.midwayCancellationPassed &&
    cancelRes.uncancelledCVCompletedPassed;

  // 6. Theme Adaptation
  const themeRes = await runThemeAdaptationStressTest();
  themeRes.details.forEach((d) => {
    console.log(`  [INFO] ${d}`);
  });
  overallResults["Theme Adaptation & Dark Mode Sync"] =
    themeRes.darkModeTogglePassed &&
    themeRes.lightModeTogglePassed &&
    themeRes.localStorageSyncPassed &&
    themeRes.chartThemeColorResolutionPassed;

  console.log(
    "\n===============================================================",
  );
  console.log(
    "                    SUMMARY OF RESULTS                         ",
  );
  console.log(
    "===============================================================",
  );

  let allPassed = true;
  for (const [testName, passed] of Object.entries(overallResults)) {
    const statusStr = passed ? "PASS" : "FAIL";
    const _statusFormatted = passed
      ? `\x1b[32m[PASS]\x1b[0m`
      : `\x1b[31m[FAIL]\x1b[0m`;
    console.log(` ${statusStr.padEnd(6)} | ${testName}`);
    if (!passed) allPassed = false;
  }

  console.log(
    "===============================================================",
  );
  if (allPassed) {
    console.log(
      " OVERALL VERDICT: ALL EMPIRICAL STRESS TESTS PASSED SUCCESSFULLY",
    );
    console.log(
      "===============================================================\n",
    );
    process.exit(0);
  } else {
    console.log(" OVERALL VERDICT: ONE OR MORE STRESS TESTS FAILED");
    console.log(
      "===============================================================\n",
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled exception in stress test runner:", err);
  process.exit(1);
});
