

export type ISize={
    id: number;
    name: string;
    createdAt: Date;
    updatedAt?: Date;
    createdBy: number;
    updatedBy?: number;
  }



export type ISizeFilters = {
  searchTerm?: string;
  name?: string;
  createdBy?: string;
  updatedBy?: string;
};
