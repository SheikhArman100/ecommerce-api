

export type ISize={
    id: number;
    name: string;
    description?: string;
    isActive?: boolean;
    createdAt: Date;
    updatedAt?: Date;
    createdBy: number;
    updatedBy?: number;
  }



export type ISizeFilters = {
  searchTerm?: string;
  name?: string;
  isActive?: string;
  createdBy?: string;
  updatedBy?: string;
};
