import { describe, expect, it } from 'vitest';
import { normalizeProject } from '../../src/core/migrate';
import type { Project } from '../../src/core/types';
import { effectParams, inlineUniformDefaults, paramValues, transitionFragment } from '../../src/render/effects';
import { layerFragment } from '../../src/render/shaders';

describe('custom effects', () => {
  it('reads adjustable parameters from uniform declarations', () => {
    const code = 'uniform float strength; // = 1.5 [0, 4]\nuniform float speed; // = 2.0\nuniform vec3 tint; // = vec3(1.0, 0.5, 0.25)\nuniform float plain;';
    expect(effectParams(code)).toEqual([
      { name: 'strength', type: 'float', default: 1.5, min: 0, max: 4 },
      { name: 'speed', type: 'float', default: 2, min: 0, max: 4 },
      { name: 'tint', type: 'color', default: [1, 0.5, 0.25], min: 0, max: 1 },
    ]);
    expect(paramValues(code, { strength: 3 }).map((p) => p.value)).toEqual([3, 2, [1, 0.5, 0.25]]);
  });

  it('turns other gl-transitions uniform defaults into constants', () => {
    const code = 'uniform vec2 center; // = vec2(0.5, 0.5);\nuniform bool flip; // = true\nuniform float amount; // = 1.0';
    expect(inlineUniformDefaults(code)).toBe('const vec2 center = vec2(vec2(0.5, 0.5));\nconst bool flip = bool(true);\nuniform float amount; // = 1.0');
  });

  it('numbers lines from the user code and wraps it with the transition API', () => {
    const source = transitionFragment('vec4 transition(vec2 uv) { return getToColor(uv); }');
    const lines = source.split('\n');
    const start = lines.indexOf('#line 1');
    expect(lines[start + 1]).toContain('vec4 transition');
    expect(source).toContain('vec4 getFromColor(vec2 uv)');
    expect(source).toContain('outColor = transition(vUv);');
  });

  it('puts a custom filter into the layer shader and keeps the built-in one as identity', () => {
    expect(layerFragment()).toContain('vec4 effect(vec4 color, vec2 uv) { return color; }');
    expect(layerFragment('vec4 effect(vec4 c, vec2 uv) { return c.bgra; }')).toContain('return c.bgra;');
  });

  it('adds empty effect and font libraries to older projects', () => {
    const old = { aspect: '16:9', fps: 30, background: '#000000', clips: [] } as unknown as Project;
    const project = normalizeProject(old);
    expect(project.effects).toEqual({});
    expect(project.fonts).toEqual({});
  });
});
