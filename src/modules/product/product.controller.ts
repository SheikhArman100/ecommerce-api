import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { UserInfoFromToken } from "../../types/common";
import sendResponse from "../../shared/sendResponse";
import status from "http-status";
import { ProductService } from "./product.service";
import pick from "../../helpers/pick";
import { paginationFields } from "../../constant";
import { productFilterableFields } from "./product.constant";
import { IUpdateProductInterface } from "./product.interface";

const createProduct = catchAsync(async (req: Request, res: Response) => {
    const result=await ProductService.createProduct(
      req.user as UserInfoFromToken,
      req.body,
      req.files as any,
    );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Product created successfully.',
      data:result
    });
  });

  const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, productFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
    const result=await ProductService.getAllProducts(filters,paginationOptions);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'All products fetched successfully!',
      data: result.data,
      meta: result.meta,
    });
  });

  const getSingleProduct=catchAsync(async (req: Request, res: Response) => {
    const result=await ProductService.getSingleProduct(req.params.productId as string)
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Single product fetched successfully!',
      data:result
    });
  })
  const getSingleProductBySlug=catchAsync(async (req: Request, res: Response) => {
    const result=await ProductService.getSingleProductBySlug(req.params.slug as string)
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Single product fetched successfully!',
      data:result
    });
  })

  const updateProduct = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.updateProduct(
      req.params.productId as string,
      req.body,
      req.user as UserInfoFromToken,
      req.files as any,
    );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Product updated successfully.',
      data: result,
    });
  });

  const deleteProduct = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.deleteProduct(
      req.params.productId as string,
      req.user as UserInfoFromToken,
    );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Product deleted successfully.',
      data: result,
    });
  });

  export const ProductController = {
    createProduct,
    getAllProducts,
    getSingleProduct,
    getSingleProductBySlug,
    updateProduct,
    deleteProduct,
  };
