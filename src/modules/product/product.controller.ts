import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { UserInfoFromToken } from "../../types/common";
import sendResponse from "../../shared/sendResponse";
import status from "http-status";
import { ProductService } from "./product.service";

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

  export const ProductController={
    createProduct

  }