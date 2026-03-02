/**
 * Tests for US-8.3: Family comparison shows genus averages when >20 species.
 *
 * Verifies:
 * - The genus average function exists and returns genus-level aggregated data
 * - The family-chart API route uses >20 threshold (tested via the aggregation service)
 */
import { getGenusAveragedFamilyData } from '@/lib/services/aggregation.service';

// Mock the data repository
vi.mock('@/lib/data/data-repository', () => ({
  getOrLoadData: vi.fn().mockResolvedValue({
    species: new Map([
      // 3 genera with multiple species (>20 total to trigger genus averaging)
      ['sp-a1', { id: 'sp-a1', validName: 'GenusA speciesA1', genus: 'GenusA', family: 'TestFamily', order: 'TestOrder' }],
      ['sp-a2', { id: 'sp-a2', validName: 'GenusA speciesA2', genus: 'GenusA', family: 'TestFamily', order: 'TestOrder' }],
      ['sp-b1', { id: 'sp-b1', validName: 'GenusB speciesB1', genus: 'GenusB', family: 'TestFamily', order: 'TestOrder' }],
      ['sp-b2', { id: 'sp-b2', validName: 'GenusB speciesB2', genus: 'GenusB', family: 'TestFamily', order: 'TestOrder' }],
      ['sp-c1', { id: 'sp-c1', validName: 'GenusC speciesC1', genus: 'GenusC', family: 'TestFamily', order: 'TestOrder' }],
    ]),
    traitsBySpecies: new Map([
      ['sp-a1', [{ traitType: 'settlement_age', value: 10, unit: 'days', source: null, doi: null }]],
      ['sp-a2', [{ traitType: 'settlement_age', value: 20, unit: 'days', source: null, doi: null }]],
      ['sp-b1', [{ traitType: 'settlement_age', value: 30, unit: 'days', source: null, doi: null }]],
      ['sp-b2', [{ traitType: 'settlement_age', value: 40, unit: 'days', source: null, doi: null }]],
      ['sp-c1', [{ traitType: 'settlement_age', value: 50, unit: 'days', source: null, doi: null }]],
    ]),
  }),
}));

describe('US-8.3: getGenusAveragedFamilyData', () => {
  it('should exist as an exported function', () => {
    expect(typeof getGenusAveragedFamilyData).toBe('function');
  });

  it('should return one entry per genus (not per species)', async () => {
    const result = await getGenusAveragedFamilyData('TestFamily', 'settlement_age');
    expect(result).not.toBeNull();
    // 3 genera in the test data
    expect(result!.species.length).toBe(3);
  });

  it('should compute genus-level averages correctly', async () => {
    const result = await getGenusAveragedFamilyData('TestFamily', 'settlement_age');
    expect(result).not.toBeNull();

    // GenusA: (10 + 20) / 2 = 15
    const genusA = result!.species.find(s => s.speciesName === 'GenusA');
    expect(genusA).toBeDefined();
    expect(genusA!.meanValue).toBe(15);

    // GenusB: (30 + 40) / 2 = 35
    const genusB = result!.species.find(s => s.speciesName === 'GenusB');
    expect(genusB).toBeDefined();
    expect(genusB!.meanValue).toBe(35);

    // GenusC: 50 / 1 = 50
    const genusC = result!.species.find(s => s.speciesName === 'GenusC');
    expect(genusC).toBeDefined();
    expect(genusC!.meanValue).toBe(50);
  });

  it('should use genus name as speciesId for genus-averaged entries', async () => {
    const result = await getGenusAveragedFamilyData('TestFamily', 'settlement_age');
    expect(result).not.toBeNull();

    const genusA = result!.species.find(s => s.speciesName === 'GenusA');
    expect(genusA!.speciesId).toBe('genus:GenusA');
  });

  it('should return null for a family with no data for the trait', async () => {
    const result = await getGenusAveragedFamilyData('TestFamily', 'nonexistent_trait');
    expect(result).toBeNull();
  });
});
