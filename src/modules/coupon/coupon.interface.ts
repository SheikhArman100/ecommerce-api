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
  usageLimit?: number;
  usedCount: number;
  createdBy: number;
  updatedBy: number;
};

export type ICouponFilters = {
  searchTerm?: string;
  isActive?: string;
  isFeatured?: string;
  discountType?: string;
  code?: string;
};
