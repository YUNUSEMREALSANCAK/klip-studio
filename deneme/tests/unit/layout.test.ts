import { describe, expect, it } from 'vitest';
import { DEFAULT_TRANSFORM, FULL_CROP } from '../../src/core/types';
import { zoomedCrop } from '../../src/render/layout';

describe('zoomedCrop', () => {
  it('leaves the crop unchanged at zoom 1', () => {
    expect(zoomedCrop(FULL_CROP, DEFAULT_TRANSFORM)).toEqual(FULL_CROP);
  });

  it('shows the center half at zoom 2', () => {
    expect(zoomedCrop(FULL_CROP, { ...DEFAULT_TRANSFORM, zoom: 2 })).toEqual({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
  });

  it('keeps the view inside the cropped area when panned to the edge', () => {
    const crop = { x: 0.2, y: 0, width: 0.6, height: 1 };
    const view = zoomedCrop(crop, { ...DEFAULT_TRANSFORM, zoom: 2, panX: 1, panY: 0 });
    expect(view.x).toBeCloseTo(0.5);
    expect(view.y).toBe(0);
    expect(view.width).toBeCloseTo(0.3);
  });
});
