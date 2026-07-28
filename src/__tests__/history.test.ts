// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from "vitest";
import {
  addHistoryEntry,
  clearHistory,
  deleteHistoryEntry,
  getHistory,
} from "../lib/history";
import type { ModelConfig } from "../lib/types";

const dummyConfig: ModelConfig = {
  growth: "linear",
  changepointPriorScale: 0.05,
  seasonalityPriorScale: 10,
  holidaysPriorScale: 10,
  seasonalityMode: "additive",
  changepointRange: 0.8,
  yearlySeasonality: "auto",
  weeklySeasonality: "auto",
  dailySeasonality: "auto",
  intervalWidth: 0.8,
};

describe("History Storage 10-Item Cap & Management", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("adds entries and retrieves history", () => {
    expect(getHistory()).toEqual([]);
    const entry = addHistoryEntry({
      datasetName: "Test.csv",
      rowCount: 50,
      config: dummyConfig,
      actionType: "forecast",
    });
    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    const history = getHistory();
    expect(history.length).toBe(1);
    expect(history[0].datasetName).toBe("Test.csv");
  });

  test("enforces 10-item hard cap when adding 15 entries", () => {
    for (let i = 1; i <= 15; i++) {
      addHistoryEntry({
        datasetName: `Dataset_${i}.csv`,
        rowCount: i * 10,
        config: dummyConfig,
        actionType: "forecast",
      });
    }

    const history = getHistory();
    expect(history.length).toBe(10);
    // Most recent entry should be at index 0 (Dataset_15)
    expect(history[0].datasetName).toBe("Dataset_15.csv");
    // 10th entry should be Dataset_6
    expect(history[9].datasetName).toBe("Dataset_6.csv");
    // Older entries (1 to 5) should be evicted
    const names = history.map((h) => h.datasetName);
    expect(names).not.toContain("Dataset_1.csv");
    expect(names).not.toContain("Dataset_5.csv");
  });

  test("updates position when duplicate ID is added", () => {
    addHistoryEntry({
      id: "fixed-id-1",
      datasetName: "Initial.csv",
      rowCount: 10,
      config: dummyConfig,
    });
    addHistoryEntry({
      id: "fixed-id-2",
      datasetName: "Second.csv",
      rowCount: 20,
      config: dummyConfig,
    });

    expect(getHistory()[0].id).toBe("fixed-id-2");

    // Re-add fixed-id-1
    addHistoryEntry({
      id: "fixed-id-1",
      datasetName: "Updated.csv",
      rowCount: 15,
      config: dummyConfig,
    });

    const history = getHistory();
    expect(history.length).toBe(2);
    expect(history[0].id).toBe("fixed-id-1");
    expect(history[0].datasetName).toBe("Updated.csv");
  });

  test("deletes specific entry by ID", () => {
    const entry1 = addHistoryEntry({
      datasetName: "DeleteMe.csv",
      rowCount: 10,
      config: dummyConfig,
    });
    addHistoryEntry({
      datasetName: "KeepMe.csv",
      rowCount: 20,
      config: dummyConfig,
    });

    deleteHistoryEntry(entry1.id);
    const history = getHistory();
    expect(history.length).toBe(1);
    expect(history[0].datasetName).toBe("KeepMe.csv");
  });

  test("clears all history", () => {
    addHistoryEntry({
      datasetName: "One.csv",
      rowCount: 10,
      config: dummyConfig,
    });
    addHistoryEntry({
      datasetName: "Two.csv",
      rowCount: 20,
      config: dummyConfig,
    });
    clearHistory();
    expect(getHistory()).toEqual([]);
  });
});
