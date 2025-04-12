import { Router } from "express";

import { ProductSchema } from "../validators/product.validators";

import {
  addProduct,
  deleteProductById,
  getAllProducts,
  getProductByCategory,
  getProductById,
  getProductByName,
  getProductsByPagination,
  getProductBySellerId,
  getProductsByPriceRange,
  productSortByPriceOrRating,
  updateProductById,
  discountProducts,
  verifyAllProducts,
  getAllProductsLeftForVerification,
  verifyProductById,
  verifyProductOfSellerEmailByAdmin,
  getProductBySellerWithStatus,
  bulkUploadProduct,
  bulkDeleteProducts,
} from "../apis/controler/product.controller";
import { authenticateUser, isAdmin, isAdminOrSeller } from "../middleware/auth.middleware";
import { isSeller, validate, validateProductQuery, validateUUID } from "../middleware/product.middleware";

const productRoutes = Router();

// productRoutes.
productRoutes.post(
  "/add-products",
  authenticateUser,
  isSeller,
  validate(ProductSchema.omit({ status: true })),
  addProduct
);

productRoutes.delete(
  "/delete-products/:productId",
  authenticateUser,
  isAdminOrSeller,
  validateUUID("productId"),
  deleteProductById
);

productRoutes.patch(
  "/update-products-by-id/:productId",
  authenticateUser,
  isAdminOrSeller,
  validateUUID("productId"),
  validate(ProductSchema.partial()),
  updateProductById
);

productRoutes.get("/get-all-products", authenticateUser, isAdminOrSeller, validateProductQuery, getAllProducts);

productRoutes.get("/:productId", authenticateUser, validateUUID("productId"), getProductById);

productRoutes.get("/seller/:sellerId", authenticateUser, validateUUID("sellerId"), getProductBySellerId);

productRoutes.get("/product/category", authenticateUser, getProductByCategory);

productRoutes.get("/price-range", authenticateUser, getProductsByPriceRange); // Uses query param: `/products/price-range?min=10&max=100`

productRoutes.get("/name", authenticateUser, getProductByName); // Uses query param: `/products/name?name=value`

productRoutes.get("/paginated", authenticateUser, getProductsByPagination);

productRoutes.get("/sorted-by-rating", authenticateUser, productSortByPriceOrRating);

productRoutes.get("/discounted", authenticateUser, discountProducts);

productRoutes.put("/verify-all", authenticateUser, isAdmin, verifyAllProducts);

productRoutes.get("/pending-verification", authenticateUser, isAdmin, getAllProductsLeftForVerification);

productRoutes.put("/verify/:id", authenticateUser, validateUUID("id"), verifyProductById);

productRoutes.get("/verify/seller/:email", authenticateUser, isAdmin, verifyProductOfSellerEmailByAdmin);

productRoutes.get("/seller/:sellerId/status/:status", authenticateUser, getProductBySellerWithStatus);

productRoutes.post("/bulk-upload", authenticateUser, isAdminOrSeller, bulkUploadProduct);

productRoutes.delete("/bulk-delete", authenticateUser, isAdminOrSeller, bulkDeleteProducts);

export default productRoutes;

// http://localhost:3000/api/products/update-products-by-id/629c5e42-2910-4900-a415-ef3a87a58637

// {
//   "title": "Updated Product Name",
//   "price": 29.99,
//   "stock": 100
// }
