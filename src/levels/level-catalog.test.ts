import { describe, expect, it } from 'vitest';
import demoLevelJson from './demo-level.json';
import { loadLevelCatalog } from './level-catalog';

describe('level catalog', () => {
  it('loads levels in the declared source order', () => {
    const second = structuredClone(demoLevelJson);
    second.properties.find((property) => property.name === 'levelId')!.value = 'second-room';
    const result = loadLevelCatalog([
      { fileName: 'first.json', data: demoLevelJson },
      { fileName: 'second.json', data: second },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.levels.map((level) => level.id)).toEqual(['demo-room', 'second-room']);
  });

  it('includes the source filename in validation errors', () => {
    const result = loadLevelCatalog([{ fileName: 'broken-room.json', data: {} }]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/^broken-room\.json:/);
  });

  it('rejects an empty catalog and duplicate level IDs', () => {
    expect(loadLevelCatalog([])).toMatchObject({ ok: false });
    const duplicate = loadLevelCatalog([
      { fileName: 'one.json', data: demoLevelJson },
      { fileName: 'two.json', data: demoLevelJson },
    ]);

    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.message).toMatch(/중복 levelId/);
  });
});
