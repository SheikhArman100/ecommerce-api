export interface IProductBody {
  title: string;
  description: string;
  categoryId: number;
  flavors: {
    flavorId: number;
    sizes: {
      sizeId: number;
      stock: number;
      price: number;
    }[];
  }[];
}
export type IProductFilters = {
  searchTerm?: string;
  title?: string;
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
