import { Prisma } from '../../generated/client';
import { IFile } from '../../interfaces/common';
import ApiError from '../../errors/ApiError';
import fs from 'fs';
import path from 'path';
import ErrorLogger from '../../logger/errorLogger';

/**
 * Validates that a flavor exists in the database
 */
export const validateFlavorExists = async (tx: Prisma.TransactionClient, flavorId: number) => {
  const flavor = await tx.flavor.findUnique({
    where: { id: flavorId },
    select: { id: true, name: true },
  });

  if (!flavor) {
    throw new ApiError(404, `Flavor with ID ${flavorId} not found`);
  }

  return flavor;
};

/**
 * Validates that a size exists in the database
 */
export const validateSizeExists = async (tx: Prisma.TransactionClient, sizeId: number) => {
  const size = await tx.size.findUnique({
    where: { id: sizeId },
    select: { id: true, name: true },
  });

  if (!size) {
    throw new ApiError(404, `Size with ID ${sizeId} not found`);
  }

  return size;
};

/**
 * Validates that a category exists in the database
 */
export const validateCategoryExists = async (tx: Prisma.TransactionClient, categoryId: number) => {
  const category = await tx.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });

  if (!category) {
    throw new ApiError(404, `Category with ID ${categoryId} not found`);
  }

  return category;
};

/**
 * Creates size records for a flavor (quantity-based or size-based)
 */
export const createFlavorSizes = async (
  tx: Prisma.TransactionClient,
  productId: number,
  flavorId: number,
  sizes: any[],
  soldByQuantity: boolean,
  stock?: string,
  price?: string
) => {
  if (soldByQuantity) {
    // Quantity-based flavor - single size record
    return tx.productFlavorSize.create({
      data: {
        productId,
        flavorId,
        sizeId: undefined,
        stock: Number(stock),
        price: parseFloat(price!),
        soldByQuantity: true,
      },
    });
  } else {
    // Size-based flavor - multiple size records
    return Promise.all(
      sizes.map(async (size: any) => {
        await validateSizeExists(tx, Number(size.sizeId));

        return tx.productFlavorSize.create({
          data: {
            productId,
            flavorId,
            sizeId: Number(size.sizeId),
            stock: Number(size.stock),
            price: parseFloat(size.price),
            soldByQuantity: false,
          },
        });
      })
    );
  }
};

/**
 * Creates image records for a flavor
 */
export const createFlavorImages = async (
  tx: Prisma.TransactionClient,
  productId: number,
  flavorId: number,
  images: IFile[]
) => {
  if (!images || images.length === 0) return [];

  return Promise.all(
    images.map((img) =>
      tx.file.create({
        data: {
          productId,
          flavorId,
          diskType: 'LOCAL',
          path: `product/images/${img.filename}`,
          originalName: img.originalname,
          modifiedName: img.filename,
        },
      })
    )
  );
};

/**
 * Deletes image files from filesystem
 */
export const deleteImageFiles = (images: { path: string }[]) => {
  images.forEach((img) => {
    const imagePath = path.join(process.cwd(), 'uploads', img.path);
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (error) {
      ErrorLogger.error(`Error deleting product image: ${error}`);
    }
  });
};

/**
 * Filters images by fieldname pattern for multipart uploads
 */
export const filterImagesByFieldname = (
  multerImages: IFile[],
  fieldnamePattern: string
) => {
  return multerImages.filter((img) => img.fieldname === fieldnamePattern);
};

/**
 * Generates a slug from a title
 */
export const generateSlug = (title: string) => {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

/**
 * Handles size operations (add/update/remove) for flavor updates
 */
export const handleSizeOperationsForUpdate = async (
  tx: Prisma.TransactionClient,
  productId: number,
  flavorId: number,
  sizeOperations: {
    add?: any[];
    update?: any[];
    remove?: string[];
  }
) => {
  // Add new sizes
  if (sizeOperations.add && sizeOperations.add.length > 0) {
    await Promise.all(
      sizeOperations.add.map(async (size: any) => {
        await validateSizeExists(tx, Number(size.sizeId));

        return tx.productFlavorSize.create({
          data: {
            productId,
            flavorId,
            sizeId: Number(size.sizeId),
            stock: Number(size.stock),
            price: parseFloat(size.price),
            soldByQuantity: false,
          },
        });
      })
    );
  }

  // Update existing sizes
  if (sizeOperations.update && sizeOperations.update.length > 0) {
    await Promise.all(
      sizeOperations.update.map(async (sizeUpdate: any) => {
        const updateData: any = {};
        if (sizeUpdate.stock !== undefined) updateData.stock = Number(sizeUpdate.stock);
        if (sizeUpdate.price !== undefined) updateData.price = parseFloat(sizeUpdate.price);

        // Update by sizeId for the specific flavor
        await tx.productFlavorSize.updateMany({
          where: {
            productId,
            flavorId,
            sizeId: Number(sizeUpdate.sizeId),
          },
          data: updateData,
        });
      })
    );
  }

  // Remove sizes - handle both array and object formats
  let removeSizeIds: string[] = [];
  if (sizeOperations.remove) {
    if (Array.isArray(sizeOperations.remove)) {
      removeSizeIds = sizeOperations.remove;
    } else if (typeof sizeOperations.remove === 'object' && sizeOperations.remove !== null) {
      // Handle case where remove is an object like { '0': '456' }
      const keys = Object.keys(sizeOperations.remove);
      const isNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
      if (isNumeric) {
        removeSizeIds = keys.sort((a, b) => Number(a) - Number(b)).map(k => String((sizeOperations.remove as any)[k]));
      }
    }
  }

  if (removeSizeIds.length > 0) {
    const numericSizeIds = removeSizeIds.map((id: string) => Number(id)).filter(id => !isNaN(id));
    await tx.productFlavorSize.deleteMany({
      where: {
        sizeId: { in: numericSizeIds },
        productId,
        flavorId,
      },
    });
  }
};

/**
 * Handles quantity-based flavor updates
 */
export const handleQuantityBasedFlavorUpdate = async (
  tx: Prisma.TransactionClient,
  productId: number,
  flavorId: number,
  stock?: string,
  price?: string
) => {
  const updateData: any = { soldByQuantity: true };
  if (stock !== undefined) updateData.stock = Number(stock);
  if (price !== undefined) updateData.price = parseFloat(price);

  const existingSize = await tx.productFlavorSize.findFirst({
    where: {
      productId,
      flavorId,
      soldByQuantity: true,
    },
  });

  if (existingSize) {
    await tx.productFlavorSize.update({
      where: { id: existingSize.id },
      data: updateData,
    });
  } else {
    await tx.productFlavorSize.create({
      data: {
        productId,
        flavorId,
        sizeId: undefined,
        stock: stock ? Number(stock) : 0,
        price: price ? parseFloat(price) : 0,
        soldByQuantity: true,
      },
    });
  }
};

/**
 * Handles image operations for flavor updates
 */
export const handleImageOperationsForUpdate = async (
  tx: Prisma.TransactionClient,
  productId: number,
  flavorId: number,
  imageOperations: {
    add?: IFile[];
    remove?: string[] | any; // Allow any type to handle middleware issues
  }
) => {
  // Remove images - handle both array and object formats
  let removeIds: string[] = [];
  if (imageOperations.remove) {
    if (Array.isArray(imageOperations.remove)) {
      removeIds = imageOperations.remove;
    } else if (typeof imageOperations.remove === 'object') {
      // Handle case where remove is an object like { '0': '17' }
      const keys = Object.keys(imageOperations.remove);
      const isNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
      if (isNumeric) {
        removeIds = keys.sort((a, b) => Number(a) - Number(b)).map(k => String(imageOperations.remove[k]));
      }
    }
  }

  if (removeIds.length > 0) {
    const numericIds = removeIds.map((id: string) => Number(id)).filter(id => !isNaN(id));

    const imagesToDelete = await tx.file.findMany({
      where: {
        id: { in: numericIds },
        productId,
        flavorId,
      },
    });

    await tx.file.deleteMany({
      where: {
        id: { in: numericIds },
        productId,
        flavorId,
      },
    });

    deleteImageFiles(imagesToDelete);
  }

  // Add images
  if (imageOperations.add && imageOperations.add.length > 0) {
    await createFlavorImages(tx, productId, flavorId, imageOperations.add);
  }
};
