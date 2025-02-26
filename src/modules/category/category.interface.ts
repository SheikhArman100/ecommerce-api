

export type ICategory={
    id: number;
    name: string;
    createdAt: Date;
    updatedAt?: Date;
    createdBy: number;
    updatedBy?: number;
  }



export type ICategoryFilters = {
  searchTerm?: string;
  name?: string;
};
