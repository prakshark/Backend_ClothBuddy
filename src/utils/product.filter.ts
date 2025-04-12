import { ProductCategory, ProductStatus } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";

export const buildProductFilter = (user: JwtPayload, category?: string, status?: string) => {
  const where: { category?: ProductCategory; status?: ProductStatus; sellerId?: string } = {};

  if (category) where.category = category as ProductCategory;
  if (status) where.status = status as ProductStatus;

  if (user.role === "SELLER") {
    where.sellerId = user.sellerId;
  } else if (user.role !== "ADMIN") {
    return null; // Unauthorized
  }

  return where;
};
