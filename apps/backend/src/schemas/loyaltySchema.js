const { z } = require('zod');

const loyaltyProgramSchema = z.object({
  isEnabled: z.boolean().optional(),
  pointsPerRon: z.number().nonnegative().optional(),
  bronzeThreshold: z.number().int().nonnegative().optional(),
  silverThreshold: z.number().int().nonnegative().optional(),
  goldThreshold: z.number().int().nonnegative().optional(),
  platinumThreshold: z.number().int().nonnegative().optional(),
  bronzeDiscount: z.number().nonnegative().max(100).optional(),
  silverDiscount: z.number().nonnegative().max(100).optional(),
  goldDiscount: z.number().nonnegative().max(100).optional(),
  platinumDiscount: z.number().nonnegative().max(100).optional(),
  visitRewardEnabled: z.boolean().optional(),
  visitRewardEveryN: z.number().int().positive().optional(),
  visitRewardType: z.enum(['FREE_APPOINTMENT', 'DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'BONUS_POINTS']).optional(),
  visitRewardValue: z.number().nonnegative().optional(),
  referralEnabled: z.boolean().optional(),
  referralBonusPoints: z.number().int().nonnegative().optional(),
  referralNewClientPts: z.number().int().nonnegative().optional(),
  pointsExpiryDays: z.number().int().nonnegative().optional(),
});

const manualAdjustSchema = z.object({
  points: z.number().int().refine((v) => v !== 0, { message: 'Points cannot be zero' }),
  description: z.string().min(1, 'Description is required'),
});

const transactionListSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.enum([
    'EARN_PAYMENT', 'EARN_REFERRAL', 'EARN_MANUAL',
    'REDEEM_DISCOUNT', 'REDEEM_REWARD', 'EXPIRE', 'DEDUCT_MANUAL',
  ]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

module.exports = {
  loyaltyProgramSchema,
  manualAdjustSchema,
  transactionListSchema,
};
