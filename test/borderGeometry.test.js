import { describe, expect, test } from "vitest";
import { sampleBorderLineSegments } from "../src/data/borderGeometry.js";

describe("border line geometry", () => {
  test("skips empty and malformed border lines", () => {
    const segments = sampleBorderLineSegments([[], [[0, 0]], [[Number.NaN, 0], [1, 1]]], 1);

    expect(segments).toEqual([]);
  });

  test("builds line segments without connecting separate border lines", () => {
    const segments = sampleBorderLineSegments([
      [[0, 0], [1, 0]],
      [[10, 0], [11, 0]],
    ], 2);

    expect(segments).toEqual([
      [0, 0],
      [1, 0],
      [10, 0],
      [11, 0],
    ]);
  });

  test("splits long border lines into shorter render segments", () => {
    const segments = sampleBorderLineSegments([[[0, 0], [3, 0]]], 1);

    expect(segments).toEqual([
      [0, 0],
      [1, 0],
      [1, 0],
      [2, 0],
      [2, 0],
      [3, 0],
    ]);
  });

  test("splits antimeridian border lines across the short path", () => {
    const segments = sampleBorderLineSegments([[[179, 0], [-179, 0]]], 1);

    expect(segments).toEqual([
      [179, 0],
      [180, 0],
      [180, 0],
      [-179, 0],
    ]);
  });
});
