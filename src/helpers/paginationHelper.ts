/**
 * Pagination options input type
 */
export type IOptions = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  
  /**
   * Pagination result type
   */
  export type IOptionsResult = {
    page: number;
    limit: number;
    skip: number;
    orderBy: { [key: string]: 'asc' | 'desc' };
  };
  
  /**
   * Calculates pagination options for Prisma.
   * @param options Pagination options
   * @returns Pagination config for Prisma queries
   */
  export const calculatePagination = (options: IOptions): IOptionsResult => {
    const page = Number(options.page || 1);
    const limit = Number(options.limit || 10);
    const skip = (page - 1) * limit;
  
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
  
    return {
      page,
      limit,
      skip,
      orderBy: { [sortBy]: sortOrder },
    };
  };
  