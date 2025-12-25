

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
