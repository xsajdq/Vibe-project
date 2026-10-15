import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MODELS } from '../../shared/api.ts';

describe('konfiguracja modeli', () => {
  it('domyślna lista modeli we frontendzie odpowiada wrangler.toml', () => {
    const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
    const model = /^AI_MODEL = "(.+)"$/m.exec(toml)?.[1];
    const fallbacks = /^AI_FALLBACK_MODELS = "(.+)"$/m.exec(toml)?.[1]?.split(',') ?? [];
    expect([model, ...fallbacks]).toEqual(DEFAULT_MODELS);
  });
});
