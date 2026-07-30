import { describe, expect, it } from 'vitest';
import { AUSTRALIAN_VEHICLES, AUSTRALIAN_VEHICLE_MAKES, modelsForMake, vehicleYearOptions } from './australian-vehicles';

describe('australian-vehicles quick-fill data', () => {
  it('exposes makes alphabetised and unique', () => {
    const sorted = [...AUSTRALIAN_VEHICLE_MAKES].sort((a, b) => a.localeCompare(b));
    expect(AUSTRALIAN_VEHICLE_MAKES).toEqual(sorted);
    expect(new Set(AUSTRALIAN_VEHICLE_MAKES).size).toBe(AUSTRALIAN_VEHICLE_MAKES.length);
  });

  it('covers the courier workhorses (vans / utes / trucks)', () => {
    for (const make of ['Toyota', 'Ford', 'Isuzu', 'Hino', 'Fuso', 'LDV', 'Mercedes-Benz']) {
      expect(AUSTRALIAN_VEHICLE_MAKES).toContain(make);
    }
    expect(modelsForMake('Toyota')).toContain('HiAce');
    expect(modelsForMake('Ford')).toContain('Transit');
    expect(modelsForMake('Isuzu Ute')).toContain('D-Max');
  });

  it('returns an empty list for an unknown make (free-text still works in the form)', () => {
    expect(modelsForMake('DeLorean')).toEqual([]);
    expect(modelsForMake('')).toEqual([]);
  });

  it('every make has at least one model and no empty model strings', () => {
    for (const v of AUSTRALIAN_VEHICLES) {
      expect(v.models.length).toBeGreaterThan(0);
      expect(v.models.every((m) => m.trim().length > 0)).toBe(true);
    }
  });

  it('year options run from next year back to 1980, descending', () => {
    const years = vehicleYearOptions(2026);
    expect(years[0]).toBe(2027);
    expect(years[years.length - 1]).toBe(1980);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });
});
