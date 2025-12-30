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
    orderBy: Record<string, any>; // Supports nested sorting for relations
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

  // Handle relational sorting
  const orderBy = buildOrderBy(sortBy, sortOrder);

  return {
    page,
    limit,
    skip,
    orderBy,
  };
};

/**
 * Builds orderBy object supporting nested relations
 * @param sortBy Field to sort by (supports dot notation for relations)
 * @param sortOrder Sort direction
 * @returns OrderBy object for Prisma
 */
const buildOrderBy = (sortBy: string, sortOrder: 'asc' | 'desc') => {
  // Handle relational sorting (e.g., 'category.name', 'creator.name')
  if (sortBy.includes('.')) {
    const [relation, field] = sortBy.split('.');
    return {
      [relation]: {
        [field]: sortOrder
      }
    };
  }

  // Handle direct field sorting
  return { [sortBy]: sortOrder };
};
