export type ICampaignCreate = {
  title: string;
  slug: string;
  description?: string;
  bannerImage?: string;
  discountDefault: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  createdBy: number;
};

export type ICampaignUpdate = {
  title?: string;
  slug?: string;
  description?: string;
  bannerImage?: string;
  discountDefault?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  updatedBy?: number;
};

export type ICampaignProductAdd = {
  productId: number;
  customDiscountPercentage?: number;
};

export type ICampaignFilters = {
  searchTerm?: string;
  isActive?: string;
  startDate?: string;
  endDate?: string;
};
