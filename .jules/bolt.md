## 2024-05-22 - Efficient Date String Processing in React Charts
**Learning:** Frequent string splitting (`split(' ')[0]`) inside render loops or large data transformations creates unnecessary array allocations. `slice(0, 10)` is significantly faster for ISO-like date strings and avoids garbage collection pressure.
**Action:** Prefer `slice` or `substring` over `split` when extracting fixed-length substrings from large datasets.
