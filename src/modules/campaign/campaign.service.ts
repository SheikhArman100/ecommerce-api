import fs from 'fs';
import path from 'path';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { ICampaignCreate, ICampaignUpdate, ICampaignProductAdd, ICampaignFilters } from './campaign.interface';
import { Prisma } from '../../generated/client';
import { campaignSearchableFields } from './campaign.constant';
import { calculatePagination } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/common';

const createCampaign = async (payload: ICampaignCreate) => {
  const result = await prisma.campaign.create({
    data: {
      ...payload,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
    },
  });
  return result;
};

/**
 * Calculates campaign-aware pricing for each product.
 * `originalPrice` = the base size price
 * `salesPrice`    = base * (1 - discount / 100), rounded to 2 decimals
 * `discountPercentage` = the effective discount (custom || default)
 */
const applyCampaignPricing = (
  product: any,
  discount: number
) => ({
  ...product,
  flavors: product.flavors?.map((flavor: any) => ({
    ...flavor,
    sizes: flavor.sizes?.map((size: any) => ({
      ...size,
      originalPrice: size.price,
      salesPrice:
        discount > 0
          ? parseFloat((Number(size.price) * (1 - discount / 100)).toFixed(2))
          : size.price,
      discountPercentage: discount,
    })),
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
        [field]: { contains: searchTerm },
      })),
    });
  }

  // Date-window filter: campaign must be live NOW (or whatever window the caller passes)
  // - If `isActive` is set to "true", we additionally constrain to the current date.
  // - `startDate` / `endDate` from the query act as an explicit window override.
  const now = new Date();
  if (isActive === 'true') {
    andConditions.push({ isActive: true });
    andConditions.push({ startDate: { lte: now } });
    andConditions.push({ endDate: { gte: now } });
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
    const discount = cp.customDiscountPercentage ?? result.discountDefault;
    return {
      ...cp,
      product: applyCampaignPricing(cp.product, discount),
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
  const now = new Date();
  const result = await prisma.campaign.findFirst({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate:   { gte: now },
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
    const discount = cp.customDiscountPercentage ?? result.discountDefault;
    return {
      ...cp,
      product: applyCampaignPricing(cp.product, discount),
    };
  });

  return {
    ...result,
    products: productsWithPricing,
  };
};

const updateCampaign = async (id: number, payload: ICampaignUpdate) => {
  const isExist = await prisma.campaign.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  if (payload.bannerImage && isExist.bannerImage) {
    const oldImagePath = path.join(process.cwd(), 'uploads', isExist.bannerImage);
    if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
  }

  const updateData: any = { ...payload };
  if (payload.startDate) updateData.startDate = new Date(payload.startDate);
  if (payload.endDate)   updateData.endDate   = new Date(payload.endDate);

  return prisma.campaign.update({ where: { id }, data: updateData });
};

const deleteCampaign = async (id: number) => {
  const isExist = await prisma.campaign.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  if (isExist.bannerImage) {
    const imagePath = path.join(process.cwd(), 'uploads', isExist.bannerImage);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  }

  return prisma.campaign.delete({ where: { id } });
};

const addProductToCampaign = async (campaignId: number, payload: ICampaignProductAdd) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
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

const removeProductFromCampaign = async (campaignId: number, productId: number) => {
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
