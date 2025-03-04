import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { IFile } from '../../interfaces/common';
import { UserInfoFromToken } from '../../types/common';
import { IProductBody } from './product.interface';
import { ENUM_USER_ROLE } from '../../enum/user';

const createProduct = async (
  adminInfo: UserInfoFromToken,
  payload: Partial<IProductBody>,
  multerImages?: IFile[],
): Promise<any> => {
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  const { title, description, categoryId, flavors } = payload;

  if (!title || !description || !categoryId || !flavors) {
    throw new ApiError(
      status.BAD_REQUEST,
      'Title or description or categoryId or flavors  is missing',
    );
  }

  // Create Product
  const newProduct = await prisma.product.create({
    data: {
      title: title,
      description,
      categoryId: Number(categoryId),
    },
  });

  if (!newProduct) {
    throw new ApiError(
      status.INTERNAL_SERVER_ERROR,
      'Failed to create new product',
    );
  }

  // Process each flavor
  for (let i = 0; i < flavors.length; i++) {
    const flavor = flavors[i];

    // Create Flavor Entry
    const createdFlavor = await prisma.productFlavor.create({
      data: {
        productId: newProduct.id,
        flavorId: Number(flavor.flavorId),
      },
    });
    if (!createdFlavor) {
      throw new ApiError(
        status.INTERNAL_SERVER_ERROR,
        'Failed to create new product flavor',
      );
    }

    // Get images from request files
    const uploadedImages: { [key: string]: IFile[] } = Array.isArray(
      multerImages,
    )
      ? {}
      : multerImages || {};
    const flavorImages = uploadedImages[`flavors[${i}][images]`] || [];

    // Save each image for this flavor
    for (let img of flavorImages) {
      const productImage = await prisma.image.create({
        data: {
          productId: newProduct.id,
          flavorId: createdFlavor.flavorId,
          diskType: 'LOCAL',
          path: img.path,
          originalName: img.originalname,
          modifiedName: img.filename,
        },
      });
      if (!productImage) {
        throw new ApiError(
          status.INTERNAL_SERVER_ERROR,
          'Failed to create new product image',
        );
      }
    }
    // Handle Sizes
    for (let k = 0; k < flavor.sizes.length; k++) {
      const size = flavor.sizes[k];

      const productSize = await prisma.productFlavorSize.create({
        data: {
          productId: newProduct.id,
          flavorId: createdFlavor.flavorId,
          sizeId: Number(size.sizeId),
          stock: Number(size.stock),
          price: parseFloat(size.price.toString()),
        },
      });
      if (!productSize) {
        throw new ApiError(
          status.INTERNAL_SERVER_ERROR,
          'Failed to create new product size',
        );
      }
    }
  }
  return newProduct
};
export const ProductService = {
  createProduct,
};
