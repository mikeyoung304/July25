import { TipCalculationService } from '../tip-calculation.service';

describe('TipCalculationService', () => {
  describe('calculateTip', () => {
    const baseCheck = {
      subtotal: 50.00,
      tax: 4.00,
      total: 54.00
    };

    it('should calculate 20% tip on pre-tax amount', async () => {
      const result = await TipCalculationService.calculateTip(
        'table-1',
        20,
        true,
        'rest-1'
      );

      // 20% of $50 = $10
      expect(result.tipAmount).toBe(10.00);
      expect(result.tipPercentage).toBe(20);
      expect(result.total).toBe(64.00);
    });

    it('should calculate 18% tip on pre-tax amount', async () => {
      const result = await TipCalculationService.calculateTip(
        'table-1',
        18,
        true,
        'rest-1'
      );

      // 18% of $50 = $9
      expect(result.tipAmount).toBe(9.00);
      expect(result.tipPercentage).toBe(18);
      expect(result.total).toBe(63.00);
    });

    it('should calculate 22% tip on pre-tax amount', async () => {
      const result = await TipCalculationService.calculateTip(
        'table-1',
        22,
        true,
        'rest-1'
      );

      // 22% of $50 = $11
      expect(result.tipAmount).toBe(11.00);
      expect(result.tipPercentage).toBe(22);
      expect(result.total).toBe(65.00);
    });

    it('should handle custom tip amount', async () => {
      const result = await TipCalculationService.calculateTip(
        'table-1',
        7.50,
        false,
        'rest-1'
      );

      expect(result.tipAmount).toBe(7.50);
      expect(result.tipPercentage).toBe(15); // 7.50/50 = 15%
      expect(result.total).toBe(61.50);
    });

    it('should handle zero tip', async () => {
      const result = await TipCalculationService.calculateTip(
        'table-1',
        0,
        false,
        'rest-1'
      );

      expect(result.tipAmount).toBe(0);
      expect(result.tipPercentage).toBe(0);
      expect(result.total).toBe(54.00);
    });

    it('should round tip to 2 decimal places', async () => {
      // For a subtotal that would create rounding issues
      const result = await TipCalculationService.calculateTip(
        'table-1',
        18,
        true,
        'rest-1'
      );

      // Ensure no floating point errors
      expect(result.tipAmount.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
      expect(result.total.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
    });

    it('should validate negative tip amounts', async () => {
      await expect(
        TipCalculationService.calculateTip('table-1', -5, false, 'rest-1')
      ).rejects.toThrow('Invalid tip amount');
    });

    it('should validate excessive tip percentages', async () => {
      await expect(
        TipCalculationService.calculateTip('table-1', 101, true, 'rest-1')
      ).rejects.toThrow('Tip percentage cannot exceed 100%');
    });
  });

  describe('getTipOptions', () => {
    it('should return standard tip options', () => {
      const options = TipCalculationService.getTipOptions(50.00);

      expect(options).toHaveLength(3);
      expect(options[0]).toEqual({
        percentage: 18,
        amount: 9.00,
        label: '18%'
      });
      expect(options[1]).toEqual({
        percentage: 20,
        amount: 10.00,
        label: '20%',
        isRecommended: true
      });
      expect(options[2]).toEqual({
        percentage: 22,
        amount: 11.00,
        label: '22%'
      });
    });

    it('should round tip amounts correctly', () => {
      const options = TipCalculationService.getTipOptions(33.33);

      expect(options[0].amount).toBe(6.00); // 18% of 33.33
      expect(options[1].amount).toBe(6.67); // 20% of 33.33
      expect(options[2].amount).toBe(7.33); // 22% of 33.33
    });
  });

  describe('distributeTipAcrossSplits', () => {
    it('should distribute tip evenly across splits', () => {
      const splits = [
        { id: '1', amount: 25.00 },
        { id: '2', amount: 25.00 }
      ];

      const result = TipCalculationService.distributeTipAcrossSplits(
        10.00,
        splits
      );

      expect(result[0].tipAmount).toBe(5.00);
      expect(result[1].tipAmount).toBe(5.00);
    });

    it('should distribute tip proportionally for uneven splits', () => {
      const splits = [
        { id: '1', amount: 30.00 }, // 60% of total
        { id: '2', amount: 20.00 }  // 40% of total
      ];

      const result = TipCalculationService.distributeTipAcrossSplits(
        10.00,
        splits
      );

      expect(result[0].tipAmount).toBe(6.00); // 60% of tip
      expect(result[1].tipAmount).toBe(4.00); // 40% of tip
    });

    it('should handle rounding for odd tip amounts', () => {
      const splits = [
        { id: '1', amount: 25.00 },
        { id: '2', amount: 25.00 },
        { id: '3', amount: 25.00 }
      ];

      const result = TipCalculationService.distributeTipAcrossSplits(
        10.00,
        splits
      );

      // 10 / 3 = 3.33... - should handle penny rounding
      const totalDistributed = result.reduce((sum, s) => sum + s.tipAmount, 0);
      expect(totalDistributed).toBe(10.00);
      expect(result[0].tipAmount).toBeGreaterThanOrEqual(3.33);
    });
  });
});