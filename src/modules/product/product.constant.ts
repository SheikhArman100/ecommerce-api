//filter
export const productFilterableFields = [
  'searchTerm',
  'title',
  'isActive',
  'isFeatured',
  'createdBy',
  'categoryId',
  'categoryName',
  'minPrice',
  'maxPrice',
  'flavorName',
  'flavorColor',
  'sizeName',
  'minStock',
  'maxStock',
  'hasImages',
  'inStock',
];

//searchTerm
export const productSearchableFields = ['title', 'description'];

// Public storefront feed — the ONLY query params GET /product/public accepts.
// Deliberately excludes the admin-facing filters (createdBy, isActive,
// isFeatured, stock ranges, …): the public can never toggle visibility, and the
// service locks the feed to active products with a display-safe payload.
export const productPublicFilterableFields = [
  'searchTerm',
  'categoryId',
  'minPrice',
  'maxPrice',
  'inStock',
  'flavorName',
  'sizeName',
];
