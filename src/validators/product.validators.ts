import { z } from "zod";

// Define enums manually
export enum ProductCategory {
  MENS = "MENS",
  WOMENS = "WOMENS",
  KIDS = "KIDS",
  OTHER = "OTHER",
}

export enum ProductStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum ProductUses {
  CASUAL = "CASUAL",
  DATES = "DATES",
  PARTIES = "PARTIES",
  OFFICE = "OFFICE",
  TRAVEL = "TRAVEL",
  SPORTS = "SPORTS",
  FORMALS = "FORMALS",
}

// Enum Validators
export const productCategorySchema = z.nativeEnum(ProductCategory);
export const productStatusSchema = z.nativeEnum(ProductStatus);
export const productUsesSchema = z.nativeEnum(ProductUses);

// Product Schema
export const ProductSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be a positive number"),
  discount: z.number().min(0).max(100).optional(),
  category: productCategorySchema,
  stock: z.number().int().min(0, "Stock cannot be negative"),
  status: productStatusSchema.default(ProductStatus.PENDING),
  sellerId: z.string().uuid(),
  productUses: z.array(productUsesSchema).default([]),
  bulkUpload: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ProductDetails Schema
export const productDetailsSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  fabricType: z.any(),
  origin: z.string().min(1, "Origin is required"),
  closureType: z.string().min(1, "Closure type is required"),
  countryOfOrigin: z.string().min(1, "Country of origin is required"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ProductVariant Schema
export const productVariantSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  color: z.string().min(1, "Color is required"),
  size: z.string().min(1, "Size is required"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  pattern: z.string().min(1, "Pattern is required"),
  occasion: z.string().min(1, "Occasion is required"),
  sleeveLength: z.string().min(1, "Sleeve length is required"),
  types: z.string().min(1, "Types are required"),
  neck: z.string().min(1, "Neck type is required"),
  length: z.string().min(1, "Length is required"),
  hemline: z.string().min(1, "Hemline is required"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Specification Schema
export const specificationSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

//  UpperWear Schema
export const upperWearSchema = z.object({
  id: z.string().uuid(),
  specificationId: z.string().uuid(),
  length: z.string().min(1, "Length is required"),
  chest: z.string().min(1, "Chest size is required"),
  shoulder: z.string().min(1, "Shoulder size is required"),
  sleeve: z.string().min(1, "Sleeve size is required"),
  neck: z.string().min(1, "Neck size is required"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// BottomWear Schema
export const bottomWearSchema = z.object({
  id: z.string().uuid(),
  specificationId: z.string().uuid(),
  length: z.string().min(1, "Length is required"),
  waist: z.string().min(1, "Waist size is required"),
  hip: z.string().min(1, "Hip size is required"),
  thigh: z.string().min(1, "Thigh size is required"),
  knee: z.string().min(1, "Knee size is required"),
  ankle: z.string().min(1, "Ankle size is required"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// LowerWear Schema
export const lowerWearSchema = z.object({
  id: z.string().uuid(),
  specificationId: z.string().uuid(),
  length: z.string().min(1, "Length is required"),
  waist: z.string().min(1, "Waist size is required"),
  hip: z.string().min(1, "Hip size is required"),
  thigh: z.string().min(1, "Thigh size is required"),
  knee: z.string().min(1, "Knee size is required"),
  ankle: z.string().min(1, "Ankle size is required"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ProductImage Schema
export const productImageSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  url: z.string().url("Invalid URL format"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Wishlist Schema
export const wishlistSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Review Schema
export const reviewSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  rating: z.number().min(0).max(5, "Rating must be between 0 and 5"),
  review: z.string().min(1, "Comment cannot be empty"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  category: z
    .enum([ProductCategory.MENS, ProductCategory.WOMENS, ProductCategory.KIDS, ProductCategory.OTHER])
    .optional(),
  status: z.enum([ProductStatus.PENDING, ProductStatus.APPROVED, ProductStatus.REJECTED]).optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductDetails = z.infer<typeof productDetailsSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type Specification = z.infer<typeof specificationSchema>;
export type UpperWear = z.infer<typeof upperWearSchema>;
export type BottomWear = z.infer<typeof bottomWearSchema>;
export type LowerWear = z.infer<typeof lowerWearSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type Wishlist = z.infer<typeof wishlistSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type Query = z.infer<typeof querySchema>;
