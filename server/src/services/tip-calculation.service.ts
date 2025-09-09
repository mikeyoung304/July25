import { logger } from '../utils/logger';
import { BadRequest } from '../middleware/errorHandler';

const serviceLogger = logger.child({ service: 'tip-calculation' });

export interface TipOption {
  percentage: number;
  amount: number;
  label: string;
  isRecommended?: boolean;
}

export interface TipCalculation {
  subtotal: number;
  tipAmount: number;
  tipPercentage: number;
  totalWithTip: number;
  options: TipOption[];
}

export class TipCalculationService {
  // Industry standard tip percentages
  private static readonly DEFAULT_TIP_PERCENTAGES = [18, 20, 22];
  private static readonly RECOMMENDED_PERCENTAGE = 20;
  private static readonly MAX_TIP_PERCENTAGE = 100;
  private static readonly MIN_TIP_AMOUNT = 0;

  /**
   * Calculate tip options for a given subtotal
   * Best Practice: Calculate tip on pre-tax amount
   */
  static calculateTipOptions(
    subtotal: number,
    customPercentages?: number[]
  ): TipOption[] {
    if (subtotal <= 0) {
      throw BadRequest('Subtotal must be greater than 0');
    }

    const percentages = customPercentages || this.DEFAULT_TIP_PERCENTAGES;
    
    return percentages.map(percentage => ({
      percentage,
      amount: Number((subtotal * (percentage / 100)).toFixed(2)),
      label: `${percentage}%`,
      isRecommended: percentage === this.RECOMMENDED_PERCENTAGE
    }));
  }

  /**
   * Calculate specific tip amount
   */
  static calculateTipAmount(
    subtotal: number,
    tipValue: number,
    isPercentage: boolean = true
  ): TipCalculation {
    if (subtotal <= 0) {
      throw BadRequest('Subtotal must be greater than 0');
    }

    let tipAmount: number;
    let tipPercentage: number;

    if (isPercentage) {
      // Validate percentage
      if (tipValue < 0 || tipValue > this.MAX_TIP_PERCENTAGE) {
        throw BadRequest(`Tip percentage must be between 0 and ${this.MAX_TIP_PERCENTAGE}`);
      }
      tipPercentage = tipValue;
      tipAmount = Number((subtotal * (tipValue / 100)).toFixed(2));
    } else {
      // Custom dollar amount
      if (tipValue < this.MIN_TIP_AMOUNT) {
        throw BadRequest('Tip amount cannot be negative');
      }
      tipAmount = Number(tipValue.toFixed(2));
      tipPercentage = Number(((tipAmount / subtotal) * 100).toFixed(1));
    }

    const totalWithTip = subtotal + tipAmount;
    const options = this.calculateTipOptions(subtotal);

    serviceLogger.info('Tip calculated', {
      subtotal,
      tipAmount,
      tipPercentage,
      totalWithTip
    });

    return {
      subtotal,
      tipAmount,
      tipPercentage,
      totalWithTip,
      options
    };
  }

  /**
   * Calculate tip for split checks
   * Ensures fair distribution across splits
   */
  static calculateSplitTips(
    splits: Array<{ subtotal: number; id: string }>,
    totalTipAmount: number
  ): Array<{ id: string; tipAmount: number }> {
    if (totalTipAmount < 0) {
      throw BadRequest('Total tip amount cannot be negative');
    }

    const totalSubtotal = splits.reduce((sum, split) => sum + split.subtotal, 0);
    
    if (totalSubtotal === 0) {
      throw BadRequest('Total subtotal cannot be zero');
    }

    const results: Array<{ id: string; tipAmount: number }> = [];
    let distributedTip = 0;

    splits.forEach((split, index) => {
      const proportion = split.subtotal / totalSubtotal;
      let tipAmount: number;

      if (index === splits.length - 1) {
        // Last split gets remainder to handle rounding
        tipAmount = Number((totalTipAmount - distributedTip).toFixed(2));
      } else {
        tipAmount = Number((totalTipAmount * proportion).toFixed(2));
        distributedTip += tipAmount;
      }

      results.push({
        id: split.id,
        tipAmount
      });
    });

    serviceLogger.info('Split tips calculated', {
      numSplits: splits.length,
      totalTip: totalTipAmount,
      distribution: results
    });

    return results;
  }

  /**
   * Suggest tip based on service quality
   * Can be used for auto-gratuity on large parties
   */
  static suggestAutoGratuity(
    subtotal: number,
    partySize: number,
    serviceQuality?: 'excellent' | 'good' | 'average'
  ): TipCalculation {
    // Industry standard: 18% auto-gratuity for parties of 6+
    const AUTO_GRATUITY_THRESHOLD = 6;
    const AUTO_GRATUITY_PERCENTAGE = 18;

    let suggestedPercentage: number;

    if (partySize >= AUTO_GRATUITY_THRESHOLD) {
      suggestedPercentage = AUTO_GRATUITY_PERCENTAGE;
      serviceLogger.info('Auto-gratuity applied', {
        partySize,
        percentage: suggestedPercentage
      });
    } else {
      // Suggest based on service quality
      switch (serviceQuality) {
        case 'excellent':
          suggestedPercentage = 22;
          break;
        case 'good':
          suggestedPercentage = 20;
          break;
        case 'average':
        default:
          suggestedPercentage = 18;
          break;
      }
    }

    return this.calculateTipAmount(subtotal, suggestedPercentage, true);
  }

  /**
   * Validate tip amount against common constraints
   */
  static validateTipAmount(
    subtotal: number,
    tipAmount: number,
    maxTipPercentage: number = 50
  ): { valid: boolean; reason?: string } {
    if (tipAmount < 0) {
      return { valid: false, reason: 'Tip amount cannot be negative' };
    }

    const tipPercentage = (tipAmount / subtotal) * 100;

    if (tipPercentage > maxTipPercentage) {
      return { 
        valid: false, 
        reason: `Tip exceeds ${maxTipPercentage}% of subtotal. Please confirm amount.` 
      };
    }

    if (tipAmount > subtotal) {
      return {
        valid: false,
        reason: 'Tip amount exceeds subtotal. Please confirm amount.'
      };
    }

    return { valid: true };
  }

  /**
   * Format tip amount for display
   */
  static formatTipDisplay(amount: number, includeSign: boolean = false): string {
    const formatted = amount.toFixed(2);
    return includeSign ? `+$${formatted}` : `$${formatted}`;
  }

  /**
   * Calculate tip adjustment for refunds
   */
  static calculateTipRefund(
    originalTip: number,
    refundPercentage: number
  ): number {
    if (refundPercentage < 0 || refundPercentage > 100) {
      throw BadRequest('Refund percentage must be between 0 and 100');
    }

    const refundAmount = (originalTip * refundPercentage) / 100;
    return Number(refundAmount.toFixed(2));
  }

  /**
   * Get tip statistics for reporting
   */
  static calculateTipStatistics(
    tips: number[]
  ): {
    average: number;
    median: number;
    total: number;
    count: number;
  } {
    if (tips.length === 0) {
      return { average: 0, median: 0, total: 0, count: 0 };
    }

    const total = tips.reduce((sum, tip) => sum + tip, 0);
    const average = total / tips.length;

    // Calculate median
    const sorted = [...tips].sort((a, b) => a - b);
    const median = tips.length % 2 === 0
      ? (sorted[tips.length / 2 - 1] + sorted[tips.length / 2]) / 2
      : sorted[Math.floor(tips.length / 2)];

    return {
      average: Number(average.toFixed(2)),
      median: Number(median.toFixed(2)),
      total: Number(total.toFixed(2)),
      count: tips.length
    };
  }
}