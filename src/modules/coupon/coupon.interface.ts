export type ICoupon = {
  id: number;
  code: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  expiryDate: string | Date;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
  createdBy: number;
  updatedBy: number;
};

export type ICouponFilters = {
  searchTerm?: string;
  isActive?: string;
  discountType?: string;
  code?: string;
};
