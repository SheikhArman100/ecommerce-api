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

export interface IFlavorUpdate {
  flavorId: number;
  soldByQuantity?: boolean;

  // Granular size operations (new)
  sizeOperations?: {
    add?: {
      sizeId: number;
      stock: number;
      price: number;
    }[];
    update?: {
      sizeId: number;
      stock?: number;
      price?: number;
    }[];
    remove?: number[]; // sizeIds to remove
  };

  // Complete size replacement (existing approach)
  sizes?: {
    sizeId: number;
    stock: number;
    price: number;
  }[];

  // Granular image operations (new)
  imageOperations?: {
    add?: any[]; // New images to add (from multer)
    remove?: number[]; // fileIds to remove
  };

  // Direct properties for quantity-based products
  stock?: number;
  price?: number;
}

export interface IProductUpdateBody {
  title?: string;
  description?: string;
  categoryId?: number;
  isActive?: boolean;
  flavors?: IFlavorUpdate[];
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
