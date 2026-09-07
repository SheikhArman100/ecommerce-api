export type ICoupon = {
  id: number;
  code: string;
  description: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  expiryDate: string | Date;
  isActive: boolean;
  isFeatured: boolean;
  targetType: 'ALL' | 'NEW_USERS' | 'INACTIVE_USERS' | 'SPECIFIC_USERS';
  inactiveDays?: number;
  usageLimit?: number;
  limitPerUser?: number;
  usedCount: number;
  createdBy: number;
  updatedBy: number;
  targetUsers?: { userId: number }[];
};

export type ICouponFilters = {
  searchTerm?: string;
  isActive?: string;
  isFeatured?: string;
  discountType?: string;
  code?: string;
};
