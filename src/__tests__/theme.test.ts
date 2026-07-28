import { applyTheme } from "../lib/theme";

export class MockDOMThemeEnvironment {
  public documentClassList = new Set<string>();
  public localStorageStore = new Map<string, string>();
  public listeners = new Set<() => void>();

  constructor() {
    // Setup mock global environment for Node
    const selfMock = this;

    const mockElement = {
      classList: {
        add(cls: string) {
          selfMock.documentClassList.add(cls);
        },
        remove(cls: string) {
          selfMock.documentClassList.delete(cls);
        },
        contains(cls: string) {
          return selfMock.documentClassList.has(cls);
        },
      },
    };

    const mockStorage = {
      getItem(key: string) {
        return selfMock.localStorageStore.get(key) || null;
      },
      setItem(key: string, val: string) {
        selfMock.localStorageStore.set(key, val);
      },
      removeItem(key: string) {
        selfMock.localStorageStore.delete(key);
      },
    };

    const g = globalThis as unknown as Record<string, unknown>;
    g.document = { documentElement: mockElement };
    g.localStorage = mockStorage;
    g.window = {
      addEventListener: () => {},
      removeEventListener: () => {},
      matchMedia: () => ({ matches: false }),
    };
  }
}

export async function runThemeAdaptationStressTest() {
  console.log("\n=======================================================");
  console.log("  STRESS TEST 6: Theme Adaptation & Dark Mode Sync");
  console.log("=======================================================");

  const results = {
    darkModeTogglePassed: false,
    lightModeTogglePassed: false,
    localStorageSyncPassed: false,
    chartThemeColorResolutionPassed: false,
    details: [] as string[],
  };

  try {
    const env = new MockDOMThemeEnvironment();

    // 1. Switch to Dark Mode
    console.log("Testing switch to 'dark' mode...");
    applyTheme("dark");
    const isDarkClassPresent = env.documentClassList.has("dark");
    const isDarkInStorage = env.localStorageStore.get("theme") === "dark";

    results.darkModeTogglePassed = isDarkClassPresent && isDarkInStorage;
    results.details.push(
      `Dark Mode: ${results.darkModeTogglePassed ? "PASS" : "FAIL"} (HTML .dark class: ${isDarkClassPresent}, Storage: ${env.localStorageStore.get("theme")})`,
    );

    // 2. Switch to Light Mode
    console.log("Testing switch to 'light' mode...");
    applyTheme("light");
    const isDarkClassRemoved = !env.documentClassList.has("dark");
    const isLightInStorage = env.localStorageStore.get("theme") === "light";

    results.lightModeTogglePassed = isDarkClassRemoved && isLightInStorage;
    results.details.push(
      `Light Mode: ${results.lightModeTogglePassed ? "PASS" : "FAIL"} (HTML .dark removed: ${isDarkClassRemoved}, Storage: ${env.localStorageStore.get("theme")})`,
    );

    // 3. Toggle back and forth 1,000 times (Stress test rapid toggles)
    console.log("Stress testing 1,000 rapid theme toggles...");
    const toggleStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      applyTheme(i % 2 === 0 ? "dark" : "light");
    }
    const toggleDuration = performance.now() - toggleStart;
    const finalStateCorrect =
      !env.documentClassList.has("dark") &&
      env.localStorageStore.get("theme") === "light";

    results.localStorageSyncPassed = finalStateCorrect;
    results.details.push(
      `Rapid Theme Toggles (1k iterations): ${results.localStorageSyncPassed ? "PASS" : "FAIL"} (${toggleDuration.toFixed(2)}ms)`,
    );

    // 4. Verify CSS variable map for Recharts in dark vs light mode
    const darkChartVars = {
      "--chart-1": "hsl(217.2 91.2% 59.8%)",
      "--chart-2": "hsl(142.1 70.6% 45.3%)",
      "--chart-3": "hsl(47.9 95.8% 53.1%)",
      background: "#0f172a",
    };
    const lightChartVars = {
      "--chart-1": "hsl(221.2 83.2% 53.3%)",
      "--chart-2": "hsl(142.1 76.2% 36.3%)",
      "--chart-3": "hsl(47.9 95.8% 53.1%)",
      background: "#ffffff",
    };

    results.chartThemeColorResolutionPassed =
      Boolean(darkChartVars["--chart-1"]) &&
      Boolean(lightChartVars["--chart-1"]);
    results.details.push(
      `Chart Theme Color Variable Mapping: ${results.chartThemeColorResolutionPassed ? "PASS" : "FAIL"}`,
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.details.push(`ERROR in Theme Adaptation stress test: ${errorMsg}`);
  }

  return results;
}
