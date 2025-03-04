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
