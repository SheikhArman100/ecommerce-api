import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import {
  ICategory,
  ICategoryFilters,
  ICreateCategoryPayload,
  IPublicCategoryResult,
  IPublicProductPreview,
} from './category.interface';
import { IFile, IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { toSolidTaka } from '../../utils';
import { categorySearchableFields } from './category.constant';
import { Prisma } from '../../generated/client';
import { ENUM_USER_ROLE } from '../../enum/user';
import fs from 'fs';
import path from 'path';
import ErrorLogger from '../../logger/errorLogger';

const createCategory = async (
  adminInfo: UserInfoFromToken,
  payload: ICreateCategoryPayload,
  multerFile?: IFile,
) => {
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'Admin not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  // Validate that image is provided for category creation
  if (!multerFile) {
    throw new ApiError(status.BAD_REQUEST, 'Category image is required');
  }
  // Check if a category with the same name or slug already exists (case-insensitive)
  const existingCategory = await prisma.category.findFirst({
    where: {
      OR: [
        { name: { equals: payload.name, mode: 'insensitive' } },
        { slug: payload.slug },
      ],
    },
  });
  if (existingCategory) {
    throw new ApiError(status.CONFLICT, 'Category with this name or slug already exists');
  }
 

  const data = await prisma.category.create({
    data: {
      name: payload.name as string,
      slug: payload.slug,
      description: payload.description,
      isActive: payload.isActive ?? true,
      displayOrder: payload.displayOrder ?? 0,
      createdBy: Number(checkAdmin.id),
      updatedBy: Number(checkAdmin.id),
      createdAt: new Date(),
    },
  });

  // Handle category image upload
  if (multerFile) {
    await prisma.file.create({
      data: {
        categoryId: data.id,
        diskType: 'LOCAL',
        path: `category/images/${multerFile.filename}`,
        originalName: multerFile.originalname,
        modifiedName: multerFile.filename,
        type: 'IMAGE',
      },
    });
  }

  return data;
};

const getAllCategories = async (
  filters: ICategoryFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.CategoryWhereInput = {};

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
      OR: categorySearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      })),
    };
  }

  // Add other filter conditions
  if (Object.keys(filtersData).length) {
    whereConditions = {
      ...whereConditions,
      AND: Object.entries(filtersData).map(([field, value]) => ({
        [field]:
          field.toLowerCase().endsWith('id') || field === 'id'
            ? Number(value)
            : typeof value === 'string' &&
                (value === 'true' || value === 'false')
              ? value === 'true'
              : value,
      })),
    };
  }

  const count = await prisma.category.count({ where: whereConditions });

  const result = await prisma.category.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: limit,
    include: {
      creator: true,
      updater: true,
      image: true,
    },
  });

  return {
    meta: {
      page,
      limit: limit === 0 ? count : limit,
      count,
    },
    data: result,
  };
};

const getCategoryByID = async (id: string) => {
  const data = await prisma.category.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      creator: true,
      updater: true,
      image: true,
    },
  });

  if (!data) {
    throw new ApiError(status.NOT_FOUND, 'Category not found');
  }

  return data;
};

const updateCategory = async (
  id: string,
  payload: Partial<ICategory>,
  userInfo: UserInfoFromToken,
  multerFile?: IFile,
) => {
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (checkUser.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }
  const checkCategory = await prisma.category.findUnique({
    where: { id: Number(id) },
  });
  if (!checkCategory) {
    throw new ApiError(status.NOT_FOUND, 'Category not found');
  }

  // Check if a category with the same name or slug already exists (excluding the current category, case-insensitive)
  if ((payload.name && payload.name.toLowerCase() !== checkCategory.name.toLowerCase()) || (payload.slug && payload.slug !== checkCategory.slug)) {
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: { not: Number(id) },
        OR: [
          ...(payload.name ? [{ name: { equals: payload.name, mode: 'insensitive' as const } }] : []),
          ...(payload.slug ? [{ slug: payload.slug }] : []),
        ],
      },
    });
    if (existingCategory) {
      throw new ApiError(status.CONFLICT, 'Category with this name or slug already exists');
    }
  }

  const data = await prisma.category.update({
    where: {
      id: Number(id),
    },
    data: {
      ...(payload.name && { name: payload.name }),
      ...(payload.slug !== undefined && { slug: payload.slug }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.isActive !== undefined && { isActive: payload.isActive }),
      ...(payload.displayOrder !== undefined && { displayOrder: payload.displayOrder }),
      updatedBy: Number(checkUser.id),
      updatedAt: new Date(),
    },
  });

  // Handle category image update
  if (multerFile) {
    const existingImage = await prisma.file.findFirst({
      where: { categoryId: Number(id) },
    });

    if (existingImage) {
      // Delete old image file from folder
      const oldImagePath = path.join(process.cwd(), 'uploads', existingImage.path);
      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (error) {
        // Log error but don't fail the update
        console.error('Error deleting old category image:', error);
        ErrorLogger.error(`Error deleting old category image: ${error}`);
      }

      // Update existing image record
      await prisma.file.update({
        where: { id: existingImage.id },
        data: {
          path: `category/images/${multerFile.filename}`,
          originalName: multerFile.originalname,
          modifiedName: multerFile.filename,
        },
      });
    } else {
      // Create new image record
      await prisma.file.create({
        data: {
          categoryId: Number(id),
          diskType: 'LOCAL',
          path: `category/images/${multerFile.filename}`,
          originalName: multerFile.originalname,
          modifiedName: multerFile.filename,
          type: 'IMAGE',
        },
      });
    }
  }

  return data;
};

const deleteCategoryByID = async (id:string,userInfo:UserInfoFromToken) => {
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (checkUser.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }
  const checkCategory = await prisma.category.findUnique({
    where: { id: Number(id) },
  });
  if (!checkCategory) {
    throw new ApiError(status.NOT_FOUND, 'Category not found');
  }

  // Get category image before deletion for cleanup
  const categoryImage = await prisma.file.findFirst({
    where: { categoryId: Number(id) },
  });

  const data = await prisma.category.delete({
    where: {
      id: Number(id),
    },
  });

  // Delete image file from folder after successful deletion
  if (categoryImage) {
    const imagePath = path.join(process.cwd(), 'uploads', categoryImage.path);
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (error) {
      // Log error but don't fail the deletion
      console.error('Error deleting category image:', error);
    }
  }

  return data;
};

/**
 * Display-safe select for the public category list — the admin-facing
 * GET /category returns `createdBy`/`updatedBy` plus full `creator`/`updater`
 * user rows (with email addresses); this one never does.
 */
const publicCategorySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  isActive: true,
  displayOrder: true,
  createdAt: true,
  image: {
    select: {
      id: true,
      path: true,
      originalName: true,
      modifiedName: true,
      type: true,
      diskType: true,
    },
  },
  // Only buyable products should be advertised on a category card
  _count: {
    select: {
      products: { where: { isActive: true } },
    },
  },
};

/**
 * Display-safe select for the preview product a public category carries.
 *
 * Mirrors the storefront-relevant fields of product.service.ts (flavors →
 * images + sizes, category image) and drops everything an anonymous visitor
 * must not receive: no `creator`/`updater` user rows, no audit columns.
 *
 * `campaigns` is fetched ONLY so the sizes can be priced campaign-aware; it is
 * stripped again by `shapePublicPreviewProduct` before the payload is returned.
 */
const publicPreviewProductSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  isActive: true,
  isFeatured: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      name: true,
      image: { select: { path: true } },
    },
  },
  flavors: {
    select: {
      flavor: { select: { id: true, name: true, color: true } },
      images: {
        select: { id: true, path: true, originalName: true, modifiedName: true },
      },
      sizes: {
        select: {
          size: { select: { id: true, name: true } },
          stock: true,
          price: true,
          soldByQuantity: true,
        },
      },
    },
  },
  campaigns: {
    where: { campaign: { isActive: true } },
    select: {
      customDiscountPercentage: true,
      campaign: { select: { discountDefault: true, discountType: true } },
    },
  },
};

/**
 * Turns one preview product from `publicPreviewProductSelect` into the public
 * shape: per-size campaign pricing is applied and the `campaigns` rows it came
 * from are dropped.
 *
 * Pricing rule is identical to product.service.ts so a card can never cost
 * differently here than in the product grid: the campaign yielding the LOWEST
 * final price wins; PERCENTAGE takes the per-product override (falling back to
 * the campaign default), FIXED is a flat ৳ amount off per unit.
 */
const shapePublicPreviewProduct = (product: any): IPublicProductPreview => {
  const campaigns = product.campaigns ?? [];

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt,
    category: product.category,
    flavors: product.flavors.map((flavor: any) => ({
      flavor: flavor.flavor,
      images: flavor.images,
      sizes: flavor.sizes.map((size: any) => {
        const base = size.price;
        let best = base;

        campaigns.forEach((cp: any) => {
          const candidate =
            cp.campaign.discountType === 'FIXED'
              ? Math.max(base - cp.campaign.discountDefault, 0) // flat ৳ off; % override doesn't apply
              : base *
                (1 -
                  (cp.customDiscountPercentage ?? cp.campaign.discountDefault) /
                    100);
          if (candidate < best) best = candidate;
        });

        return {
          size: size.size,
          stock: size.stock,
          price: size.price,
          soldByQuantity: size.soldByQuantity,
          originalPrice: base,
          // Percentage derived from the rounded price actually charged, so the
          // -N% chip can never disagree with the sale price beside it.
          salesPrice: toSolidTaka(best),
          discountPercentage:
            best < base
              ? parseFloat(((1 - toSolidTaka(best) / base) * 100).toFixed(2))
              : 0,
        };
      }),
    })),
  };
};

/**
 * Public storefront feed for the home page "Category Section".
 *
 * Anonymous visitors only ever get ACTIVE categories, returned in the admin's
 * own `displayOrder` (then name, so the order never flickers between requests)
 * instead of the newest-first default of GET /category — a showcase order is
 * what a navigation / section actually needs.
 *
 * The payload is display-safe on purpose: no audit columns, no creator/updater
 * user records, unlike the admin-facing GET /category. `_count.products` counts
 * only ACTIVE products, so a card can show what is actually buyable.
 *
 * Each category also carries ONE `previewProduct` (featured first, else newest
 * active) with its flavors/images/sizes and campaign-aware prices, so the
 * storefront paints the section's preview card from THIS single response
 * instead of one `GET /product?categoryId=…` round trip per category.
 *
 * NOTE: `limit=0` means "everything" (the `meta.limit` convention of the other
 * list endpoints) — `take` is omitted instead of sent as 0, which would
 * otherwise return an empty page.
 */
const getPublicCategories = async (
  paginationOptions: IPaginationOptions,
): Promise<IPublicCategoryResult> => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const whereConditions: Prisma.CategoryWhereInput = { isActive: true };

  const count = await prisma.category.count({ where: whereConditions });

  const rows = await prisma.category.findMany({
    where: whereConditions,
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    skip,
    ...(limit > 0 ? { take: limit } : {}),
    select: {
      ...publicCategorySelect,
      // Exactly ONE preview product per category, so the whole section renders
      // from this response: a featured one first, otherwise the newest active.
      products: {
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 1,
        select: publicPreviewProductSelect,
      },
    },
  });

  const data = rows.map(({ products, ...category }) => ({
    ...category,
    previewProduct: products.length
      ? shapePublicPreviewProduct(products[0])
      : null,
  }));

  return {
    meta: {
      page,
      limit: limit === 0 ? count : limit,
      count,
    },
    data,
  };
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getPublicCategories,
  getCategoryByID,
  updateCategory,
  deleteCategoryByID,
};
