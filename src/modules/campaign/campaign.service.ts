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

const getAllCampaigns = async (
  filters: ICampaignFilters,
  paginationOptions: IPaginationOptions
) => {
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      OR: campaignSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.entries(filterData).map(([field, value]) => {
        if (field === 'isActive') {
          return { [field]: value === 'true' };
        }
        if (field === 'startDate' || field === 'endDate') {
          // You might want custom date range logic here
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
      creator: {
        select: {
          name: true,
          email: true,
        },
      },
      updater: {
        select: {
          name: true,
          email: true,
        },
      },
      _count: {
        select: { products: true },
      },
    },
    skip,
    take: limit,
    orderBy,
  });

  const count = await prisma.campaign.count({ where: whereConditions });

  return {
    meta: {
      page,
      limit,
      count,
    },
    data: result,
  };
};

const getSingleCampaign = async (id: number) => {
  const result = await prisma.campaign.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          name: true,
          email: true,
        },
      },
      updater: {
        select: {
          name: true,
          email: true,
        },
      },
      products: {
        include: {
          product: {
            include: {
              creator: {
                select: {
                  name: true,
                  email: true,
                  role: true,
                },
              },
              category: {
                select: {
                  name: true,
                  image: true,
                },
              },
              flavors: {
                include: {
                  flavor: {
                    select: {
                      name: true,
                      color: true,
                    },
                  },
                  sizes: {
                    include: {
                      size: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                  images: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  // Calculate campaign-aware prices for the products in this campaign
  const productsWithPricing = result.products.map(cp => {
    const discount = cp.customDiscountPercentage ?? result.discountDefault;
    const product = cp.product;

    const flavorsWithPricing = product.flavors.map(flavor => ({
      ...flavor,
      sizes: flavor.sizes.map(size => ({
        ...size,
        originalPrice: size.price,
        salesPrice: discount > 0 ? parseFloat((size.price * (1 - discount / 100)).toFixed(2)) : size.price,
        discountPercentage: discount,
      })),
    }));

    return {
      ...cp,
      product: {
        ...product,
        flavors: flavorsWithPricing,
      },
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

  // Handle image cleanup if new image is uploaded
  if (payload.bannerImage && isExist.bannerImage) {
    const oldImagePath = path.join(process.cwd(), 'uploads', isExist.bannerImage);
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }

  const updateData: any = { ...payload };
  if (payload.startDate) updateData.startDate = new Date(payload.startDate);
  if (payload.endDate) updateData.endDate = new Date(payload.endDate);

  const result = await prisma.campaign.update({
    where: { id },
    data: updateData,
  });
  return result;
};

const deleteCampaign = async (id: number) => {
  const isExist = await prisma.campaign.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  // Cleanup image
  if (isExist.bannerImage) {
    const imagePath = path.join(process.cwd(), 'uploads', isExist.bannerImage);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  const result = await prisma.campaign.delete({
    where: { id },
  });
  return result;
};

const addProductToCampaign = async (campaignId: number, payload: ICampaignProductAdd) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  const result = await prisma.campaignProduct.upsert({
    where: {
      campaignId_productId: {
        campaignId,
        productId: payload.productId,
      },
    },
    update: {
      customDiscountPercentage: payload.customDiscountPercentage,
    },
    create: {
      campaignId,
      productId: payload.productId,
      customDiscountPercentage: payload.customDiscountPercentage,
    },
  });
  return result;
};

const removeProductFromCampaign = async (campaignId: number, productId: number) => {
  const result = await prisma.campaignProduct.delete({
    where: {
      campaignId_productId: {
        campaignId,
        productId,
      },
    },
  });
  return result;
};

export const CampaignService = {
  createCampaign,
  getAllCampaigns,
  getSingleCampaign,
  updateCampaign,
  deleteCampaign,
  addProductToCampaign,
  removeProductFromCampaign,
};
