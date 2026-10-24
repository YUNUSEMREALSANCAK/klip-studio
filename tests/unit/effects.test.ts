import { describe, expect, it } from 'vitest';
import { normalizeProject } from '../../src/core/migrate';
import type { Project } from '../../src/core/types';
import { inlineUniformDefaults, transitionFragment } from '../../src/render/effects';
import { layerFragment } from '../../src/render/shaders';

describe('custom effects', () => {
  it('turns gl-transitions uniform defaults into constants', () => {
    const code = 'uniform float amplitude; // = 1.5\nuniform vec2 center; // = vec2(0.5, 0.5);\nuniform float speed;';
    expect(inlineUniformDefaults(code)).toBe('const float amplitude = float(1.5);\nconst vec2 center = vec2(vec2(0.5, 0.5));\nuniform float speed;');
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
