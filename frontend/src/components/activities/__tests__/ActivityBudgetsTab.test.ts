import { generateBudgetPeriods } from '../ActivityBudgetsTab';

describe('ActivityBudgetsTab - Period Generation', () => {
  describe('Quarterly periods', () => {
    it('should generate quarterly periods for a 2-year project', () => {
      const periods = generateBudgetPeriods('2024-01-01', '2025-12-31', 'quarterly');
      
      expect(periods).toHaveLength(8); // 8 quarters in 2 years
      expect(periods[0]).toEqual({ start: '2024-01-01', end: '2024-03-31' });
      expect(periods[1]).toEqual({ start: '2024-04-01', end: '2024-06-30' });
      expect(periods[7]).toEqual({ start: '2025-10-01', end: '2025-12-31' });
    });

    it('should handle partial quarters at the end', () => {
      const periods = generateBudgetPeriods('2024-01-01', '2024-05-15', 'quarterly');
      
      expect(periods).toHaveLength(2);
      expect(periods[0]).toEqual({ start: '2024-01-01', end: '2024-03-31' });
      expect(periods[1]).toEqual({ start: '2024-04-01', end: '2024-05-15' });
    });
  });

  describe('Monthly periods', () => {
    it('should generate monthly periods for a 6-month project', () => {
      const periods = generateBudgetPeriods('2024-01-01', '2024-06-30', 'monthly');
      
      expect(periods).toHaveLength(6);
      expect(periods[0]).toEqual({ start: '2024-01-01', end: '2024-01-31' });
      expect(periods[5]).toEqual({ start: '2024-06-01', end: '2024-06-30' });
    });

    it('should handle mid-month start and end dates', () => {
      const periods = generateBudgetPeriods('2024-01-15', '2024-03-20', 'monthly');
      
      expect(periods).toHaveLength(3);
      expect(periods[0]).toEqual({ start: '2024-01-01', end: '2024-01-31' });
      expect(periods[2]).toEqual({ start: '2024-03-01', end: '2024-03-20' });
    });
  });

  describe('Annual periods', () => {
    it('should generate annual periods for a 3-year project', () => {
      const periods = generateBudgetPeriods('2024-01-01', '2026-12-31', 'annual');
      
      expect(periods).toHaveLength(3);
      expect(periods[0]).toEqual({ start: '2024-01-01', end: '2024-12-31' });
      expect(periods[1]).toEqual({ start: '2025-01-01', end: '2025-12-31' });
      expect(periods[2]).toEqual({ start: '2026-01-01', end: '2026-12-31' });
    });

    it('should cap periods at 12 months max', () => {
      const periods = generateBudgetPeriods('2024-06-01', '2026-06-30', 'annual');
      
      expect(periods).toHaveLength(3);
      // First period should be capped at 12 months
      expect(periods[0]).toEqual({ start: '2024-01-01', end: '2024-12-31' });
    });
  });

  describe('Edge cases', () => {
    it('should return empty array for invalid dates', () => {
      expect(generateBudgetPeriods('invalid', '2024-12-31', 'quarterly')).toEqual([]);
      expect(generateBudgetPeriods('2024-01-01', 'invalid', 'quarterly')).toEqual([]);
    });

    it('should return empty array if end date is before start date', () => {
      expect(generateBudgetPeriods('2024-12-31', '2024-01-01', 'quarterly')).toEqual([]);
    });

    it('should handle same start and end date', () => {
      const periods = generateBudgetPeriods('2024-01-15', '2024-01-15', 'monthly');
      expect(periods).toHaveLength(1);
      expect(periods[0]).toEqual({ start: '2024-01-01', end: '2024-01-15' });
    });
  });
}); 