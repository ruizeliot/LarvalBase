/**
 * Tests for US-4.5: Chart axes capped at biologically relevant maximums.
 *
 * Must:
 * 1. Compute X-axis cap (age) from max(MET_AGE_DPH_MAX, MET_AGE_DPH_MEAN, SET_AGE_DPH_MEAN, SET_AGE_DPH_MAX)
 * 2. Compute Y-axis cap (size) from max(MET_SIZE_MEAN, MET_SIZE_MAX, SET_SIZE_MEAN, SET_SIZE_MAX)
 * 3. Fallback chain: species → genus → family → null (no cap)
 * 4. Return null when no data at any level
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeAxisCaps,
  type AxisCaps,
  type AxisCapRow,
} from '../axis-caps.service';

describe('US-4.5: Axis capping logic', () => {
  const speciesRows: AxisCapRow[] = [
    {
      speciesName: 'Chromis viridis',
      genus: 'Chromis',
      family: 'Pomacentridae',
      source: 'met_age',
      metAgeMean: 25,
      metAgeMax: 30,
      setAgeMean: null,
      setAgeMax: null,
      metSizeMean: null,
      metSizeMax: null,
      setSizeMean: null,
      setSizeMax: null,
    },
    {
      speciesName: 'Chromis viridis',
      genus: 'Chromis',
      family: 'Pomacentridae',
      source: 'set_age',
      metAgeMean: null,
      metAgeMax: null,
      setAgeMean: 22,
      setAgeMax: 28,
      metSizeMean: null,
      metSizeMax: null,
      setSizeMean: null,
      setSizeMax: null,
    },
    {
      speciesName: 'Chromis viridis',
      genus: 'Chromis',
      family: 'Pomacentridae',
      source: 'met_size',
      metAgeMean: null,
      metAgeMax: null,
      setAgeMean: null,
      setAgeMax: null,
      metSizeMean: 12,
      metSizeMax: 15,
      setSizeMean: null,
      setSizeMax: null,
    },
    {
      speciesName: 'Chromis viridis',
      genus: 'Chromis',
      family: 'Pomacentridae',
      source: 'set_size',
      metAgeMean: null,
      metAgeMax: null,
      setAgeMean: null,
      setAgeMax: null,
      metSizeMean: null,
      metSizeMax: null,
      setSizeMean: 10,
      setSizeMax: 14,
    },
  ];

  it('should compute X-axis cap as max of all age columns at species level', () => {
    const caps = computeAxisCaps('Chromis viridis', speciesRows);
    // max(MET_AGE_DPH_MEAN=25, MET_AGE_DPH_MAX=30, SET_AGE_DPH_MEAN=22, SET_AGE_DPH_MAX=28) = 30
    expect(caps.xMax).toBe(30);
  });

  it('should compute Y-axis cap as max of all size columns at species level', () => {
    const caps = computeAxisCaps('Chromis viridis', speciesRows);
    // max(MET_SIZE_MEAN=12, MET_SIZE_MAX=15, SET_SIZE_MEAN=10, SET_SIZE_MAX=14) = 15
    expect(caps.yMax).toBe(15);
  });

  it('should fallback to genus level when species has no data', () => {
    const genusRows: AxisCapRow[] = [
      {
        speciesName: 'Chromis atripectoralis',
        genus: 'Chromis',
        family: 'Pomacentridae',
        source: 'met_age',
        metAgeMean: 40,
        metAgeMax: 50,
        setAgeMean: null,
        setAgeMax: null,
        metSizeMean: 18,
        metSizeMax: 22,
        setSizeMean: null,
        setSizeMax: null,
      },
    ];

    const caps = computeAxisCaps('Chromis viridis', genusRows, 'Chromis');
    expect(caps.xMax).toBe(50);
    expect(caps.yMax).toBe(22);
    expect(caps.level).toBe('genus');
  });

  it('should fallback to family level when genus has no data', () => {
    const familyRows: AxisCapRow[] = [
      {
        speciesName: 'Amphiprion ocellaris',
        genus: 'Amphiprion',
        family: 'Pomacentridae',
        source: 'set_age',
        metAgeMean: null,
        metAgeMax: null,
        setAgeMean: 60,
        setAgeMax: 70,
        metSizeMean: null,
        metSizeMax: null,
        setSizeMean: 20,
        setSizeMax: 25,
      },
    ];

    const caps = computeAxisCaps('Chromis viridis', familyRows, 'Chromis', 'Pomacentridae');
    expect(caps.xMax).toBe(70);
    expect(caps.yMax).toBe(25);
    expect(caps.level).toBe('family');
  });

  it('should return null caps when no data at any level', () => {
    const caps = computeAxisCaps('Unknown species', [], 'Unknown', 'Unknown');
    expect(caps.xMax).toBeNull();
    expect(caps.yMax).toBeNull();
    expect(caps.level).toBeNull();
  });

  it('should use species level when data is available', () => {
    const caps = computeAxisCaps('Chromis viridis', speciesRows);
    expect(caps.level).toBe('species');
  });

  it('should handle rows with partial null values', () => {
    const partialRows: AxisCapRow[] = [
      {
        speciesName: 'Chromis viridis',
        genus: 'Chromis',
        family: 'Pomacentridae',
        source: 'met_age',
        metAgeMean: null,
        metAgeMax: 45,
        setAgeMean: null,
        setAgeMax: null,
        metSizeMean: null,
        metSizeMax: null,
        setSizeMean: null,
        setSizeMax: null,
      },
    ];

    const caps = computeAxisCaps('Chromis viridis', partialRows);
    expect(caps.xMax).toBe(45);
    expect(caps.yMax).toBeNull();
  });
});
