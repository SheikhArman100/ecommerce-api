import fs from 'fs';
import path from 'path';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import status from 'http-status';
import { ICampaignCreate, ICampaignUpdate, ICampaignProductAdd, ICampaignFilters } from './campaign.interface';
import { Prisma } from '../../generated/client';
import { ENUM_USER_ROLE } from '../../enum/user';
import { UserInfoFromToken } from '../../types/common';
import { campaignSearchableFields } from './campaign.constant';

import { calculatePagination } from '../../helpers/paginationHelper';
import { toSolidTaka } from '../../utils';
import { IPaginationOptions } from '../../interfaces/common';

/**
 * Service-level admin guard (mirrors the coupon module) — route middleware is
 * the first line of defense, this is the second.
 */
const checkAdmin = async (userInfo: UserInfoFromToken) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized to perform this action');
  }
  return user;
};

/**
 * Single-active rule: campaigns are activated EXCLUSIVELY via update, and only
 * when no other campaign is active. If another one is running, the admin is
 * told to deactivate it first — activation is never switched automatically.
 */

const createCampaign = async (payload: ICampaignCreate, userInfo: UserInfoFromToken) => {
  await checkAdmin(userInfo);

  // Friendly duplicate-slug error (slug is @unique in Prisma — a raw P2002
  // would otherwise leak to the client)
  const existingSlug = await prisma.campaign.findUnique({ where: { slug: payload.slug } });
  if (existingSlug) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'A campaign with this slug already exists');
  }

  // Display-window sanity: the shown date range must go forwards
  if (new Date(payload.endDate) <= new Date(payload.startDate)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'End date must be after the start date');
  }

  // Campaigns are ALWAYS created inactive. Activation happens exclusively
  // through updateCampaign — one campaign at a time, explicitly.
  return prisma.campaign.create({
    data: {
      ...payload,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      isActive: false,
    },
  });
};

/**
 * Calculates campaign-aware pricing for each product.
 * `originalPrice` = the base size price
 * `salesPrice`    = discounted price (percentage or fixed ৳ off), floored at 0
 * `discountPercentage` = the effective discount for PERCENTAGE campaigns
 */
const applyCampaignPricing = (
  product: any,
  discount: number,
  discountType: string = 'PERCENTAGE'
) => ({
  ...product,
  flavors: product.flavors?.map((flavor: any) => ({
    ...flavor,
    sizes: flavor.sizes?.map((size: any) => {
      const base = Number(size.price);
      const salesPrice =
        discount > 0
          ? discountType === 'FIXED'
            ? toSolidTaka(Math.max(base - discount, 0))
            : toSolidTaka(base * (1 - discount / 100))
          : base;
      return {
        ...size,
        originalPrice: base,
        salesPrice,
        discountPercentage: discountType === 'PERCENTAGE' ? discount : 0,
        discountAmount: discountType === 'FIXED' ? discount : 0,
      };
    }),
  })),
});

/**
 * Returns the deep product include used by both getAllCampaigns (single-product listings)
 * and getSingleCampaign.
 */
const productInclude = {
  creator: {
    select: { name: true, email: true, role: true },
  },
  category: {
    select: { name: true, image: true },
  },
  flavors: {
    include: {
      flavor: {
        select: { name: true, color: true },
      },
      sizes: {
        include: {
          size: { select: { name: true } },
        },
      },
      images: true,
    },
  },
};

const getAllCampaigns = async (
  filters: ICampaignFilters,
  paginationOptions: IPaginationOptions
) => {
  const { searchTerm, isActive, startDate, endDate, ...filterData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  const andConditions: Prisma.CampaignWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: campaignSearchableFields.map(field => ({
        [field]: { contains: searchTerm,mode: 'insensitive' as const },
      })),
    });
  }

    // Date-window filter: dates are DISPLAY-ONLY. isActive is the sole driver
  // of campaign liveness, so isActive=true must NOT be constrained by dates.
  if (isActive === 'true') {
    andConditions.push({ isActive: true });
  } else if (startDate || endDate) {
    if (startDate) andConditions.push({ startDate: { gte: new Date(startDate) } });
    if (endDate)   andConditions.push({ endDate:   { gte: new Date(endDate)   } });
  } else if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.entries(filterData).map(([field, value]) => {
        if (field === 'isActive') return { [field]: value === 'true' };
        if (field === 'startDate' || field === 'endDate') {
          return { [field]: { gte: new Date(value as string) } };
        }
        return { [field]: value };
      }),
    });
  }

  const whereConditions: Prisma.CampaignWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.campaign.findMany({
    where: whereConditions,
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
      _count: { select: { products: true } },
    },
    skip,
    take: limit,
    orderBy,
  });

  const count = await prisma.campaign.count({ where: whereConditions });

  return {
    meta: { page, limit, count },
    data: result,
  };
};

/**
 * Fetches a single campaign with its fully-hydrated (and campaign-priced) products.
 * Use this when you need the products array on the campaign.
 */
const getSingleCampaign = async (id: number) => {
  const result = await prisma.campaign.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
      products: {
        include: {
          product: { include: productInclude },
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  const productsWithPricing = result.products.map(cp => {
    // FIXED campaigns apply a flat ৳ amount (discountDefault); the custom %
    // override only applies to PERCENTAGE campaigns.
    const discount =
      result.discountType === 'FIXED'
        ? result.discountDefault
        : (cp.customDiscountPercentage ?? result.discountDefault);
    return {
      ...cp,
      product: applyCampaignPricing(cp.product, discount, result.discountType),
    };
  });

  return {
    ...result,
    products: productsWithPricing,
  };
};

/**
 * Fetches the currently-running campaign (isActive=true AND startDate <= now <= endDate),
 * with its products fully hydrated and priced.
 *
 * Returns `null` if no campaign is currently live.
 */
const getActiveCampaign = async () => {
  // Dates are display-only — "live" is purely the isActive flag
  const result = await prisma.campaign.findFirst({
    where: {
      isActive: true,
    },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
      products: {
        include: {
          product: { include: productInclude },
        },
      },
    },
  });

  if (!result) return null;

  const productsWithPricing = result.products.map(cp => {
    // FIXED campaigns apply a flat ৳ amount (discountDefault); the custom %
    // override only applies to PERCENTAGE campaigns.
    const discount =
      result.discountType === 'FIXED'
        ? result.discountDefault
        : (cp.customDiscountPercentage ?? result.discountDefault);
    return {
      ...cp,
      product: applyCampaignPricing(cp.product, discount, result.discountType),
    };
  });

  return {
    ...result,
    products: productsWithPricing,
  };
};

const updateCampaign = async (id: number, payload: ICampaignUpdate, userInfo: UserInfoFromToken) => {
  await checkAdmin(userInfo);

  const isExist = await prisma.campaign.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  // Slug is the campaign's public identity/URL — locked after creation
  // (same policy as coupon codes)
  if (payload.slug && payload.slug !== isExist.slug) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Campaign slug cannot be changed after creation');
  }
  const { slug: _ignoredSlug, ...restPayload } = payload;

  // Date sanity on the effective window (either date may be updated alone)
  const effectiveStart = payload.startDate ? new Date(payload.startDate) : isExist.startDate;
  const effectiveEnd = payload.endDate ? new Date(payload.endDate) : isExist.endDate;
  if (effectiveEnd <= effectiveStart) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'End date must be after the start date');
  }

  if (restPayload.bannerImage && isExist.bannerImage) {
    const oldImagePath = path.join(process.cwd(), 'uploads', isExist.bannerImage);
    if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
  }

  const updateData: any = { ...restPayload };
  if (payload.startDate) updateData.startDate = new Date(payload.startDate);
  if (payload.endDate)   updateData.endDate   = new Date(payload.endDate);

  return prisma.$transaction(async (tx: any) => {
    // Single-active rule: activating this one requires every other to be off.
    // Tell the admin WHICH campaign is blocking instead of silently switching.
    if (payload.isActive === true) {
      const otherActive = await tx.campaign.findFirst({
        where: { isActive: true, id: { not: id } },
        select: { title: true },
      });
      if (otherActive) {
        throw new ApiError(
          httpStatus.CONFLICT,
          `Campaign "${otherActive.title}" is currently active. Deactivate it first before activating this campaign.`
        );
      }
    }

    return tx.campaign.update({ where: { id }, data: updateData });
  });
};

const deleteCampaign = async (id: number, userInfo: UserInfoFromToken) => {
  await checkAdmin(userInfo);

  const isExist = await prisma.campaign.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  // Delete the DB row first (transactional), then clean the banner file —
  // a failed DB delete must not leave the image already removed.
  const deleted = await prisma.campaign.delete({ where: { id } });

  if (isExist.bannerImage) {
    const imagePath = path.join(process.cwd(), 'uploads', isExist.bannerImage);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  }

  return deleted;
};

const addProductToCampaign = async (campaignId: number, payload: ICampaignProductAdd, userInfo: UserInfoFromToken) => {
  await checkAdmin(userInfo);

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  // Friendly product-existence error (a raw FK violation would surface otherwise)
  const product = await prisma.product.findUnique({ where: { id: payload.productId } });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  return prisma.campaignProduct.upsert({
    where: { campaignId_productId: { campaignId, productId: payload.productId } },
    update: { customDiscountPercentage: payload.customDiscountPercentage },
    create: {
      campaignId,
      productId: payload.productId,
      customDiscountPercentage: payload.customDiscountPercentage,
    },
  });
};

const removeProductFromCampaign = async (
  campaignId: number,
  productId: number,
  userInfo: UserInfoFromToken
) => {
  await checkAdmin(userInfo);

  return prisma.campaignProduct.delete({
    where: { campaignId_productId: { campaignId, productId } },
  });
};

export const CampaignService = {
  createCampaign,
  getAllCampaigns,
  getSingleCampaign,
  getActiveCampaign,
  updateCampaign,
  deleteCampaign,
  addProductToCampaign,
  removeProductFromCampaign,
};
