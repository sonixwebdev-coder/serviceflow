import { describe, expect, it } from 'vitest';

import {
  createAssetFormFromAsset,
  createEmptyAssetForm,
  getAssetDisplayName,
} from './profileAssets';

describe('profile asset helpers', () => {
  it('creates independent empty forms for new assets', () => {
    const first = createEmptyAssetForm();
    const second = createEmptyAssetForm();

    first.name = 'Changed';

    expect(second).toEqual({
      name: '',
      identifier: '',
      type: '',
      manufacturer: '',
      model: '',
      year: '',
    });
  });

  it('characterizes the edit form mapping', () => {
    expect(
      createAssetFormFromAsset({
        name: 'Masina firmei',
        identifier: 'B 123 ABC',
        type: 'Autoturism',
        manufacturer: 'Volkswagen',
        model: 'Golf',
        year: 2020,
      })
    ).toEqual({
      name: 'Masina firmei',
      identifier: 'B 123 ABC',
      type: 'Autoturism',
      manufacturer: 'Volkswagen',
      model: 'Golf',
      year: '2020',
    });
  });

  it('keeps missing edit fields controlled', () => {
    expect(createAssetFormFromAsset({})).toEqual(createEmptyAssetForm());
  });

  it('uses the original asset-name fallback order', () => {
    expect(
      getAssetDisplayName({ name: 'Primary', manufacturer: 'Dell', model: 'XPS' }, 'Activ')
    ).toBe('Primary');
    expect(getAssetDisplayName({ manufacturer: 'Dell', model: 'XPS' }, 'Activ')).toBe('Dell XPS');
    expect(getAssetDisplayName({}, 'Activ')).toBe('Activ');
  });
});
