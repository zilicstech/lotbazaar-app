// Run: node --test lib/listQuery.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { distinct, matchRows, sortRows } from "./listQuery.ts";

type Row = { no: string; city: string; brands: string[]; total: number | null };
const rows: Row[] = [
  { no: "SO-10", city: "Jaipur", brands: ["Zara"], total: 500 },
  { no: "SO-2", city: "Delhi", brands: ["Zara", "H&M"], total: null },
  { no: "SO-3", city: "Delhi", brands: ["Mango"], total: 900 },
];
const search = (r: Row) => [r.no, r.city];
const filters = { city: (r: Row) => r.city, brand: (r: Row) => r.brands };

test("search is case-insensitive and matches any field", () => {
  assert.deepEqual(matchRows(rows, " dEl ", search, {}, filters).map((r) => r.no), ["SO-2", "SO-3"]);
});

test("filters combine with AND; array values match any element", () => {
  assert.deepEqual(matchRows(rows, "", search, { brand: "Zara" }, filters).map((r) => r.no), ["SO-10", "SO-2"]);
  assert.deepEqual(matchRows(rows, "", search, { brand: "Zara", city: "Delhi" }, filters).map((r) => r.no), ["SO-2"]);
  assert.deepEqual(matchRows(rows, "", search, { brand: "", unknown: "x" }, filters).length, 3);
});

test("sort is natural, both directions, empties last", () => {
  assert.deepEqual(sortRows(rows, (r) => r.no, "asc").map((r) => r.no), ["SO-2", "SO-3", "SO-10"]);
  assert.deepEqual(sortRows(rows, (r) => r.total, "desc").map((r) => r.no), ["SO-3", "SO-10", "SO-2"]);
  assert.deepEqual(sortRows(rows, (r) => r.total, "asc").map((r) => r.no), ["SO-10", "SO-3", "SO-2"]);
});

test("distinct flattens multi-value filters", () => {
  assert.deepEqual(distinct(rows, (r) => r.brands), ["H&M", "Mango", "Zara"]);
});
