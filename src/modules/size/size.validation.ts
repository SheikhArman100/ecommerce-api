import { z } from "zod";

const createSizeSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' }),
  }).strict(),
});
const updateSizeSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' }),
  }).strict(),
});
export const SizeValidation = { createSizeSchema ,updateSizeSchema};
