import { z } from 'zod';

// Helper schemas
const sizeOperationSchema = z.object({
  sizeId: z.string().refine(val => !isNaN(Number(val)), {
    message: 'Size ID must be a valid number',
  }),
  stock: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Stock must be a non-negative number',
    })
    .optional(),
  price: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Price must be a positive number',
    })
    .optional(),
});

const sizeDataSchema = z.object({
  sizeId: z.string().refine(val => !isNaN(Number(val)), {
    message: 'Size ID must be a valid number',
  }),
  stock: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Stock must be a non-negative number',
    }),
  price: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Price must be a positive number',
    }),
});

export const createProductSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters'),
    categoryId: z.number({
      error: 'Category ID must be a number',
    }),
    isActive: z.boolean().optional(),
    flavors: z
      .array(
        z.object({
          flavorId: z.string().refine(val => !isNaN(Number(val)), {
            message: 'Flavor ID must be a valid number',
          }),
          soldByQuantity: z.boolean().optional(),
          // Either sizes array (for size-based) OR stock/price (for quantity-based)
          sizes: z
            .array(
              z.object({
                sizeId: z.string().refine(val => !isNaN(Number(val)), {
                  message: 'Size ID must be a valid number',
                }),
                stock: z
                  .string()
                  .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
                    message: 'Stock must be a non-negative number',
                  }),
                price: z
                  .string()
                  .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
                    message: 'Price must be a positive number',
                  }),
              }),
            )
            .optional(),
          // Direct properties for quantity-based products
          stock: z
            .string()
            .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
              message: 'Stock must be a non-negative number',
            })
            .optional(),
          price: z
            .string()
            .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
              message: 'Price must be a positive number',
            })
            .optional(),
        })
        .refine(data => {
          // If soldByQuantity is true, stock and price must be provided, sizes should not
          if (data.soldByQuantity) {
            return data.stock && data.price && !data.sizes;
          }
          // If soldByQuantity is false or undefined, sizes array must be provided
          return data.sizes && data.sizes.length > 0 && !data.stock && !data.price;
        }, {
          message: 'Either provide sizes array (for size-based) or soldByQuantity with stock/price (for quantity-based)'
        }),
      )
      .nonempty('At least one flavor is required'),
  }),
});

// New validation schemas for the restructured interface
const sizeDataSchemaNew = z.object({
  sizeId: z.string().refine(val => !isNaN(Number(val)), {
    message: 'Size ID must be a valid number',
  }),
  stock: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Stock must be a non-negative number',
    }),
  price: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Price must be a positive number',
    }),
});

const sizeUpdateSchema = z.object({
  sizeId: z.string().refine(val => !isNaN(Number(val)), {
    message: 'Size ID must be a valid number',
  }),
  stock: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Stock must be a non-negative number',
    })
    .optional(),
  price: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Price must be a positive number',
    })
    .optional(),
});

const flavorAddSchema = z.object({
  flavorId: z.string().refine(val => !isNaN(Number(val)), {
    message: 'Flavor ID must be a valid number',
  }),
  soldByQuantity: z.boolean().optional(),
  stock: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Stock must be a non-negative number',
    })
    .optional(),
  price: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Price must be a positive number',
    })
    .optional(),
  sizes: z.array(sizeDataSchemaNew).optional(),
  images: z.array(z.any()).optional(), // Binary files
}).refine(data => {
  // If soldByQuantity is true, stock and price must be provided, sizes should not
  if (data.soldByQuantity) {
    return data.stock && data.price && !data.sizes;
  }
  // If soldByQuantity is false or undefined, sizes array must be provided
  return data.sizes && data.sizes.length > 0 && !data.stock && !data.price;
}, {
  message: 'Either provide sizes array (for size-based) or soldByQuantity with stock/price (for quantity-based)'
});

const flavorUpdateSchema = z.object({
  flavorId: z.string().refine(val => !isNaN(Number(val)), {
    message: 'Flavor ID must be a valid number',
  }),
  soldByQuantity: z.boolean().optional(),
  stock: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Stock must be a non-negative number',
    })
    .optional(),
  price: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Price must be a positive number',
    })
    .optional(),
  sizes: z.object({
    add: z.array(sizeDataSchemaNew).optional(),
    update: z.array(sizeUpdateSchema).optional(),
    remove: z.array(z.string()).optional(),
  }).optional(),
  images: z.object({
    add: z.array(z.any()).optional(), // Binary files
    remove: z.array(z.string()).optional(), // fileIds
  }).optional(),
});

const updateProductSchemaNew = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').optional(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .optional(),
    categoryId: z.string().refine(val => !isNaN(Number(val)), {
      message: 'Category ID must be a valid number',
    }).optional(),
    isActive: z.boolean().optional(),
    flavors: z.object({
      add: z.array(flavorAddSchema).optional(),
      update: z.array(flavorUpdateSchema).optional(),
      remove: z.array(z.string()).optional(),
    }).optional(),
  }),
});

// Keep the old schema for backward compatibility
const updateProductSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').optional(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .optional(),
    categoryId: z.string().refine(val => !isNaN(Number(val)), {
      message: 'Category ID must be a valid number',
    }).optional(),
    isActive: z.boolean().optional(),
    flavors: z
      .array(
        z.object({
          flavorId: z.string().refine(val => !isNaN(Number(val)), {
            message: 'Flavor ID must be a valid number',
          }),
          soldByQuantity: z.boolean().optional(),

          // Granular size operations (new)
          sizeOperations: z
            .object({
              add: z.array(sizeDataSchema).optional(),
              update: z.array(sizeOperationSchema).optional(),
              remove: z.array(z.number()).optional(),
            })
            .optional(),

          // Complete size replacement (backward compatibility)
          sizes: z.array(sizeDataSchema).optional(),

          // Granular image operations (new)
          imageOperations: z
            .object({
              add: z.array(z.any()).optional(), // New images from multer
              remove: z.array(z.number()).optional(), // fileIds to remove
            })
            .optional(),

          // Direct properties for quantity-based products
          stock: z
            .string()
            .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
              message: 'Stock must be a non-negative number',
            })
            .optional(),
          price: z
            .string()
            .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
              message: 'Price must be a positive number',
            })
            .optional(),
        })
        .refine(data => {
          // Ensure at least one operation is specified
          const hasSizeOps = data.sizeOperations && (
            (data.sizeOperations.add && data.sizeOperations.add.length > 0) ||
            (data.sizeOperations.update && data.sizeOperations.update.length > 0) ||
            (data.sizeOperations.remove && data.sizeOperations.remove.length > 0)
          );
          const hasSizes = data.sizes && data.sizes.length > 0;
          const hasImageOps = data.imageOperations && (
            (data.imageOperations.add && data.imageOperations.add.length > 0) ||
            (data.imageOperations.remove && data.imageOperations.remove.length > 0)
          );
          const hasQuantityUpdate = data.soldByQuantity && (data.stock !== undefined || data.price !== undefined);

          // Allow flavor updates without any operations (for future extensions)
          return hasSizeOps || hasSizes || hasImageOps || hasQuantityUpdate || true;
        }, {
          message: 'At least one valid operation must be specified for the flavor'
        }),
      )
      .optional(),
    removeFlavors: z.union([
      z.array(z.number()),
      z.number()
    ]).optional().transform((val) => {
      if (typeof val === 'number') {
        return [val];
      }
      return val;
    }),
  }),
});

export const ProductValidation = {
  createProductSchema,
  updateProductSchema,
  updateProductSchemaNew, // New restructured schema
};
