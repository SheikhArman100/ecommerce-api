

export type IFlavor={
    id: number;
    name: string;
    color:string
    createdAt: Date;
    updatedAt?: Date;
    createdBy: number;
    updatedBy?: number;
  }



export type IFlavorFilters = {
  searchTerm?: string;
  name?: string;
  color?:string
  createdBy?: string;
  updatedBy?: string;
};
