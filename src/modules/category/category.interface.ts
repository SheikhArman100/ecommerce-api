

export type ICategory={
    id: number;
    name: string;
    slug?: string; // Optional for updates, required for creation
    description?: string;
    image?: any; // File relation
    isActive?: boolean;
    displayOrder?: number; // Optional for updates, required for creation
    createdAt: Date;
    updatedAt?: Date;
    createdBy: number;
    updatedBy?: number;
  }

export type ICreateCategoryPayload = {
    name: string;
    slug: string; // Required for creation
    description: string; // Required for creation
    isActive?: boolean;
    displayOrder: number; // Required for creation
  }



export type ICategoryFilters = {
  searchTerm?: string;
  name?: string;
  isActive?: string;
  displayOrder?: string;
  createdBy?: string;
  updatedBy?: string;
};

/**
 * The single "preview" product a public category carries, so the storefront can
 * render a card for it without a second request.
 *
 * Display-safe by design — it mirrors the storefront fields the <Card /> needs
 * (flavors → images + sizes, category image) and drops everything an anonymous
 * visitor must not receive: no `creator`/`updater` user rows (they hold email
 * addresses), no audit columns, no campaign/coupon targeting data.
 *
 * Every size is already campaign-priced: `originalPrice` is the base price and
 * `salesPrice` the discounted one.
 */
export type IPublicProductPreview = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  category: {
    id: number;
    name: string;
    image: { path: string } | null;
  } | null;
  flavors: Array<{
    flavor: { id: number; name: string; color: string } | null;
    images: Array<{
      id: number;
      path: string;
      originalName: string;
      modifiedName: string;
    }>;
    sizes: Array<{
      size: { id: number; name: string } | null;
      stock: number;
      price: number;
      soldByQuantity: boolean;
      originalPrice: number;
      salesPrice: number;
      discountPercentage: number;
    }>;
  }>;
};

/**
 * One category exactly as the storefront is allowed to see it.
 *
 * Deliberately WITHOUT the audit columns (`createdBy` / `updatedBy`) and the
 * `creator` / `updater` user records that GET /category returns for the admin
 * client — anonymous visitors must never receive user rows.
 *
 * `_count.products` counts only ACTIVE products, so a public section can show
 * how many things are actually buyable in that category.
 */
export type IPublicCategory = {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  image: {
    id: number;
    path: string;
    originalName: string;
    modifiedName: string;
    type: string;
    diskType: string;
  } | null;
  _count: {
    products: number;
  };
  /**
   * One product to show for this category — the featured one first, else the
   * newest active one. `null` when the category has no active product yet.
   */
  previewProduct: IPublicProductPreview | null;
};

export type IPublicCategoryResult = {
  meta: {
    page: number;
    limit: number;
    count: number;
  };
  data: IPublicCategory[];
};

