import { Product, ProductFlavorSize, User } from "@prisma/client";


// Interface for the Cart entity
export interface ICart {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    userId: number;
    user?: Partial<User>; 
    items?: ICartItem[];  
  }
  
  // Interface for CartItem
  export interface ICartItem {
    id: number;
    cartId: number;
    productId: number;
    flavorId: number;
    sizeId: number;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    cart?: ICart;                    
    product?: Partial<Product>;    
    productFlavorSize?: Partial<ProductFlavorSize>; 
  }
  
  // Filters for querying carts
  export interface ICartFilters {
    searchTerm?: string;      
    userId?: string;          
    productId?: string;       
  }