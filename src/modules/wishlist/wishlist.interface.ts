

export type IWishlist={
     id:number,
     userId:number,
     productId:number,
     createdAt:Date,
     updatedAt:Date
  }




export type IWishlistFilters = {
  searchTerm?: string;
  userId?:number,
  productId?:string,
  createdAt?:string
 
};
