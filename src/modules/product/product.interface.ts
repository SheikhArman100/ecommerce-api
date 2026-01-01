export interface IProductBody {
  title: string;
  description: string;
  categoryId: number;
  isActive?: boolean;
  flavors: {
    flavorId: number;
    soldByQuantity?: boolean; // Flag on flavor level
    // Either sizes array (for size-based) OR direct stock/price (for quantity-based)
    sizes?: {
      sizeId: number;
      stock: number;
      price: number;
    }[];
    // Direct properties for quantity-based products
    stock?: number;
    price?: number;
  }[];
}

export interface ISizeData {
  sizeId: string;
  stock: string;
  price: string;
}

export interface ISizeUpdate {
  sizeId: string; // ProductFlavorSize record ID
  stock?: string;
  price?: string;
}

export interface IFlavorAdd {
  flavorId: string;
  soldByQuantity?: boolean;
  stock?: string;
  price?: string;
  sizes?: ISizeData[];
  images?: File[]; // Binary files for upload
}

export interface IFlavorUpdate {
  flavorId: string; // Flavor ID from Flavor table (required)
  soldByQuantity?: boolean;
  stock?: string;
  price?: string;
  sizes?: {
    add?: ISizeData[];
    update?: ISizeUpdate[];
    remove?: string[]; // sizeIds
  };
  images?: {
    add?: File[]; // Binary files for upload
    remove?: string[]; // imageIds
  };
}

export interface IUpdateProductInterface {
  // ===== Product level =====
  title?: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;

  // ===== Flavor operations =====
  flavors?: {
    add?: IFlavorAdd[];
    update?: IFlavorUpdate[];
    remove?: string[]; // flavorIds
  };
}

// Keep the old interface for backward compatibility during transition
export interface IProductUpdateBody {
  title?: string;
  description?: string;
  categoryId?: number;
  isActive?: boolean;
  flavors?: IFlavorUpdate[];
  removeFlavors?: number[]; // Array of flavorIds to remove from the product
}

export type IProductFilters = {
  searchTerm?: string;
  title?: string;
  isActive?: string;
  createdBy?:string
  categoryId?: string;
  categoryName?: string;
  minPrice?: string;
  maxPrice?: string;
  flavorName?: string;
  flavorColor?: string;
  sizeName?: string;
  minStock?: string;
  maxStock?: string;
  hasImages?: string;
  inStock?: string;
};
