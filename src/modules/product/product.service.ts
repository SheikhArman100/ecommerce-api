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
  //validate admin
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
    select: { role: true, id: true },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.FORBIDDEN,
      'You are not authorized to perform this action',
    );
  }

  //validate payload
  const { title, description, categoryId, flavors } = payload;

  if (
    !title ||
    !description ||
    !categoryId ||
    !Array.isArray(flavors) ||
    flavors.length === 0
  ) {
    throw new ApiError(status.BAD_REQUEST, 'Missing required product details');
  }

  // Use transaction to ensure data consistency
  return prisma.$transaction(
    async tx => {
      // Create Product
      const newProduct = await tx.product.create({
        data: {
          title,
          description,
          categoryId: Number(categoryId),
          createdBy:Number(checkAdmin.id),
          updatedBy:Number(checkAdmin.id)
        },
      });
      // Process flavors, sizes, and images in parallel
      await Promise.all(
        flavors.map(async (flavor, index) => {
          // Create Flavor
          const createdFlavor = await tx.productFlavor.create({
            data: {
              productId: newProduct.id,
              flavorId: Number(flavor.flavorId),
            },
          });

          // Get flavor-specific images
          const flavorImages = Array.isArray(multerImages)
            ? multerImages.filter(
                img => img.fieldname === `flavors[${index}][images]`,
              )
            : [];

          // Create images for this flavor
          const imagePromises = flavorImages.map(img =>
            tx.image.create({
              data: {
                productId: newProduct.id,
                flavorId: createdFlavor.flavorId,
                diskType: 'LOCAL',
                path: img.path,
                originalName: img.originalname,
                modifiedName: img.filename,
              },
            }),
          );

          // Create sizes for this flavor
          const sizePromises = flavor.sizes.map(size =>
            tx.productFlavorSize.create({
              data: {
                productId: newProduct.id,
                flavorId: createdFlavor.flavorId,
                sizeId: Number(size.sizeId),
                stock: Number(size.stock),
                price: parseFloat(size.price.toString()),
              },
            }),
          );

          // Wait for all images and sizes to be created
          await Promise.all([...imagePromises, ...sizePromises]);
        }),
      );

      return newProduct;
    },
    {
      // Configure transaction options
      maxWait: 5000, 
      timeout: 10000, 
    },
  );
};
export const ProductService = {
  createProduct,
};
