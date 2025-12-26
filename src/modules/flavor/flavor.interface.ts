

export type IFlavor={
    id: number;
    name: string;
    color: string;
    description?: string;
    isActive?: boolean;
    createdAt: Date;
    updatedAt?: Date;
    createdBy: number;
    updatedBy?: number;
  }



export type IFlavorFilters = {
  searchTerm?: string;
  name?: string;
  color?: string;
  isActive?: string;
  createdBy?: string;
  updatedBy?: string;
};
