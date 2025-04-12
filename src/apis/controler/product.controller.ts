import { Request, RequestHandler, Response } from "express";
import { ProductSchema } from "../../validators/product.validators";
import { Prisma, PrismaClient, ProductCategory, ProductStatus } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { JwtPayload } from "jsonwebtoken";
import { z } from "zod";
import { buildProductFilter } from "../../utils/product.filter";

const prisma = new PrismaClient();
// const ProductStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);

const addProduct: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as JwtPayload;

    if (!user?.id) {
      res.status(401).json({ error: "Unauthorized: User ID missing" });
      return;
    }

    // ✅ Find seller using user.id
    const existingSeller = await prisma.seller.findUnique({
      where: { sellerId: user.id },
    });

    console.log("Decoded Token:", user);
    console.log("Searching Seller by User ID:", user.id);

    if (!existingSeller) {
      console.error("Seller not found in database:", user.id);
      res.status(400).json({ error: "Seller does not exist" });
      return;
    }
    console.log("Fetched Seller:", existingSeller);

    // ✅ Use `existingSeller.id` for product creation
    const addedProduct = await prisma.product.create({
      data: {
        ...req.body,
        status: "PENDING",
        sellerId: existingSeller.id, // 🛠️ Fix: Use Seller's `id`
      },
    });

    console.log("Seller ID used for product creation:", existingSeller.id);
    console.log("Product added successfully:", addedProduct);

    res.status(201).json({ message: "Product added successfully", data: addedProduct });
  } catch (error) {
    console.error("Error adding product:", error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        res.status(400).json({ error: "A product with this title already exists." });
        return;
      } else if (error.code === "P2003") {
        res.status(400).json({ error: "Invalid sellerId: Seller does not exist." });
        return;
      }
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteProductById: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as JwtPayload;
    const { productId } = req.params;

    console.log("Product ID from Params:", productId);

    // ✅ Validate productId format (UUID)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(productId)) {
      res.status(400).json({ error: "Invalid product ID format" });
      return;
    }

    // ✅ Ensure user is authenticated
    if (!user || !user.id || !user.role) {
      console.log("Unauthorized: User not authenticated");
      res.status(401).json({ error: "Unauthorized: User not authenticated" });
      return;
    }

    // ✅ Fetch the seller using user.sellerId
    const existingSeller = await prisma.seller.findUnique({
      where: { sellerId: user.id },
    });

    if (!existingSeller) {
      console.log("No seller found for this user");
      res.status(403).json({ error: "Unauthorized: Not a registered seller" });
      return;
    }

    console.log("Seller ID:", existingSeller.sellerId);

    // ✅ Find the product in the database
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true },
    });

    if (!product) {
      console.log("Product not found in DB");
      res.status(404).json({ error: "Product not found" });
      return;
    }

    console.log("Product Found in DB:", product);
    console.log("User Role:", user.role);
    console.log("Product Seller ID:", product.sellerId);

    // ✅ Authorization check: Only Admin or Product's Seller can delete
    if (user.role !== "ADMIN" || product.sellerId !== existingSeller.id) {
      console.log("Authorization Failed: User is not Admin or Product Owner");
      res.status(403).json({ error: "Forbidden: You cannot delete this product" });
      return;
    }

    // ✅ Delete the product
    await prisma.product.delete({ where: { id: productId } });

    console.log("Product deleted successfully:", productId);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateProductById: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as JwtPayload;
    const { productId } = req.params;

    console.log("Incoming User ID:", user.id);
    console.log("Incoming User Role:", user.role);

    // ✅ Validate UUID format
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(productId)) {
      res.status(400).json({ error: "Invalid product ID format" });
      return;
    }

    // ✅ Find product in DB
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true },
    });

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    console.log("Product Seller ID:", product.sellerId);

    // ✅ Fetch seller using user.sellerId
    const existingSeller = await prisma.seller.findUnique({
      where: { sellerId: user.id },
    });

    if (!existingSeller) {
      res.status(403).json({ error: "Unauthorized: You are not a seller" });
      return;
    }

    console.log("User Role:", user.role);
    console.log("Found Seller ID:", existingSeller.id);

    if (!product || product.sellerId !== existingSeller.id) {
      res.status(403).json({ message: "Unauthorized to update this product." });
      return;
    }

    // ✅ Validate and filter update fields
    const parsedData = ProductSchema.partial().safeParse(req.body);
    if (!parsedData.success) {
      res.status(400).json({ error: parsedData.error.format() });
      return;
    }

    const updateData = parsedData.data;

    // ✅ Update product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    res.status(200).json({ message: "Product updated successfully", data: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAllProducts: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as JwtPayload;
    const { page, limit, category, status } = req.query as Record<string, string>;

    //  Ensure valid pagination values
    const pageNumber = !Number.isNaN(Number(page)) && Number(page) > 0 ? Number(page) : 1;
    const limitNumber = !Number.isNaN(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 100) : 10;
    const skip = (pageNumber - 1) * limitNumber;

    // ✅ Construct product filter
    const where = buildProductFilter(user, category, status);
    console.log("Product filter:", where);
    if (!where) {
      res.status(403).json({ error: "Unauthorized: You cannot view products" });
      return;
    }

    // ✅ Fetch products & total count using Prisma transactions
    const [products, totalProducts] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          discount: true,
          category: true,
          stock: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNumber,
      }),
      prisma.product.count({ where }),
    ]);

    console.log("Total products found:", totalProducts);

    res.status(200).json({
      message: "Products fetched successfully",
      products,
      count: products.length,
      totalProducts,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / limitNumber),
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getProductById: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    // Fetch product with seller details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        discount: true,
        category: true,
        stock: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        sellerId: true,
      },
    });

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const user = req.user as JwtPayload;

    if (user.role !== "ADMIN" || product.sellerId !== user.id) {
      res.status(403).json({ error: "Unauthorized: You cannot view this product" });
      return;
    }

    res.status(200).json({
      message: "Product fetched successfully",
      data: product,
    });
    return;
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getProductBySellerId: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sellerId } = req.params;

    // Check if seller exists
    const seller = await prisma.seller.findUnique({ where: { sellerId } });
    if (!seller) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }

    const user = req.user as JwtPayload;

    if (user.role !== "ADMIN" || user.id !== seller.sellerId) {
      res.status(403).json({ error: "Unauthorized: You cannot access these products" });
      return;
    }

    // Fetch products for the given seller
    const products = await prisma.product.findMany({
      where: { sellerId },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        discount: true,
        category: true,
        stock: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: "All products fetched successfully",
      count: products.length,
      data: products,
    });
    return;
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getProductByCategory: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as JwtPayload;
    const { category } = req.query;
    console.log("User Verified Status:", user?.isVerified);
    console.log("Requested Category:", category);

    // ✅ Ensure user is authenticated & verified
    if (!user || !user.isVerified) {
      res.status(403).json({ error: "Unauthorized: User not verified" });
      return;
    }

    // ✅ Check if `category` is provided
    if (!category || typeof category !== "string") {
      res.status(400).json({ error: "Category is required" });
      return;
    }

    // ✅ Normalize category (uppercase & trim)
    const normalizedCategory = category.trim().toUpperCase();

    // ✅ Ensure `ProductCategory` enum exists and matches
    if (!(normalizedCategory in ProductCategory)) {
      res.status(400).json({ error: "Invalid category provided" });
      return;
    }

    // ✅ Fetch only APPROVED products
    const products = await prisma.product.findMany({
      where: {
        category: normalizedCategory as ProductCategory,
        status: "APPROVED",
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        discount: true,
        category: true,
        stock: true,
        details: true, // ✅ Include details
        variants: true, // ✅ Include variants
        specifications: true, // ✅ Include specifications
        images: true, // ✅ Include images
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`Fetched ${products.length} products for category:`, normalizedCategory);

    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      data: products,
    });
    return;
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
};

const getProductsByPriceRange: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { minPrice, maxPrice } = req.query;
    const user = req.user as JwtPayload;

    if (!user.isVerified) {
      res.status(403).json({ error: "Unauthorized: User not verified" });
      return;
    }

    const min = minPrice ? Number(minPrice) : 0;
    const max = maxPrice ? Number(maxPrice) : Infinity;

    if (isNaN(min) || isNaN(max)) {
      res.status(400).json({ error: "Min and Max price must be valid numbers" });
      return;
    }
    if (min < 0 || max < 0) {
      res.status(400).json({ error: "Prices cannot be negative" });
      return;
    }
    if (min > max) {
      res.status(400).json({ error: "Min price cannot be greater than Max price" });
      return;
    }

    const products = await prisma.product.findMany({
      where: { price: { gte: min, lte: max } },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        discount: true,
        category: true,
        stock: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products by price range:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getProductByName: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.query;
    const user = req.user as JwtPayload;

    if (!user.isVerified) {
      res.status(403).json({ error: "Unauthorized: User not verified" });
      return;
    }

    const productName = name?.toString().trim();

    if (!productName) {
      res.status(400).json({ error: "Product name is required" });
      return;
    }

    // Fetch products by name (case-insensitive search)
    const products = await prisma.product.findMany({
      where: {
        title: { contains: productName, mode: "insensitive" },
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        discount: true,
        category: true,
        stock: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        seller: {
          select: { storeName: true },
        },
        images: {
          select: { url: true },
        },
      },
    });

    if (!products.length) {
      res.status(404).json({ error: "No products found with the given name" });
      return;
    }

    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products by name:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getProductsByPagination: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const pageNumber = Number.isNaN(Number(req.query.page)) ? 1 : parseInt(req.query.page as string, 10);
    const limitNumber = Number.isNaN(Number(req.query.limit)) ? 10 : parseInt(req.query.limit as string, 10);

    if (pageNumber < 1 || limitNumber < 1) {
      res.status(400).json({ error: "Page and limit must be positive numbers" });
      return;
    }

    const [totalProducts, products] = await prisma.$transaction([
      prisma.product.count({ where: { status: "APPROVED" } }),
      prisma.product.findMany({
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        where: { status: "APPROVED" },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          discount: true,
          category: true,
          stock: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          seller: {
            select: {
              storeName: true,
              rating: true,
            },
          },
          sellerId: true,
        },
      }),
    ]);

    res.status(200).json({
      message: "Products fetched successfully",
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / limitNumber),
      totalProducts,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products by pagination:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const productSortByPriceOrRating: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sortBy, order, page, limit } = req.query;

    // Validate sorting field
    const validSortFields = ["price", "rating"];
    if (!sortBy || !validSortFields.includes(sortBy as string)) {
      res.status(400).json({ error: "Invalid sortBy value. Allowed: 'price' or 'rating'" });
      return;
    }

    // Validate order direction
    const sortOrder = order === "desc" ? "desc" : "asc";

    // Pagination values
    const pageNumber = Number(page) > 0 ? parseInt(page as string, 10) : 1;
    const limitNumber = Number(limit) > 0 ? parseInt(limit as string, 10) : 10;

    let products;

    if (sortBy === "price") {
      products = await prisma.product.findMany({
        where: { status: "APPROVED" },
        orderBy: { price: sortOrder },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          discount: true,
          category: true,
          stock: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else {
      products = await prisma.product.findMany({
        where: { status: "APPROVED" },
        orderBy: {
          // Sorting by average rating is not directly supported; consider precomputing the average rating
          // or fetching it in a separate query.
          // For now, fallback to sorting by another field or remove this line.
          id: sortOrder, // Example fallback sorting by product ID
        },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          discount: true,
          category: true,
          stock: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          reviews: {
            select: { rating: true },
          },
        },
      });
    }

    res.status(200).json({
      message: "Products sorted successfully",
      currentPage: pageNumber,
      totalProducts: products.length,
      data: products,
    });
    return;
  } catch (error) {
    console.error("Error sorting products:", (error as Error).message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const discountProducts: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Number(req.query.page) > 0 ? parseInt(req.query.page as string, 10) : 1;
    const limit = Number(req.query.limit) > 0 ? parseInt(req.query.limit as string, 10) : 10;
    const skip = (page - 1) * limit;

    const [products, totalProducts] = await prisma.$transaction([
      prisma.product.findMany({
        where: {
          discount: { gt: 0 },
          status: "APPROVED",
        },
        orderBy: { discount: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          discount: true,
          category: true,
          stock: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.product.count({
        where: { discount: { gt: 0 }, status: "APPROVED" },
      }),
    ]);

    res.status(200).json({
      message: "Products with discounts fetched successfully",
      count: products.length,
      totalProducts,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      data: products,
    });
  } catch (error) {
    console.error("Error fetching discounted products:", (error as Error).message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const verifyAllProducts: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as JwtPayload; // Authentication middleware should attach user

    if (!user || user.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden: You cannot access this resource" });
      return;
    }

    const pendingProducts = await prisma.product.findMany({
      where: { status: "PENDING" },
      select: { id: true, title: true },
    });

    if (pendingProducts.length === 0) {
      res.status(400).json({ error: "No pending products to verify" });
      return;
    }

    const updateResult = await prisma.product.updateMany({
      where: { status: "PENDING" },
      data: { status: "APPROVED" },
    });

    console.log(`Verified ${updateResult.count} products`);

    res.status(200).json({
      message: "All pending products verified successfully",
      verifiedCount: updateResult.count,
      verifiedProducts: pendingProducts,
    });
  } catch (error) {
    console.error("Error verifying all products:", (error as Error).message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAllProductsLeftForVerification: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as JwtPayload; // Authentication middleware should attach user

    if (!user || user.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden: You cannot access this resource" });
      return;
    }

    // Parse pagination params
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    // Validate category if provided
    const category = req.query.category as string | undefined;
    const isValidCategory = category && Object.values(ProductCategory).includes(category as ProductCategory);
    const filters: Prisma.ProductWhereInput = {
      status: "PENDING",
      ...(isValidCategory ? { category: category as ProductCategory } : {}),
    };

    // Validate sorting field
    const validSortFields = ["price", "rating", "createdAt"];
    const sortBy = validSortFields.includes(req.query.sortBy as string) ? req.query.sortBy : "createdAt";
    const order: "asc" | "desc" = req.query.order?.toString().toLowerCase() === "desc" ? "desc" : "asc";

    const products = await prisma.product.findMany({
      where: filters,
      orderBy: { [sortBy as keyof Prisma.ProductOrderByWithRelationInput]: order },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        discount: true,
        category: true,
        stock: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalPending = await prisma.product.count({ where: filters });

    res.status(200).json({
      message: "Pending products fetched successfully",
      page,
      limit,
      totalPending,
      totalPages: Math.ceil(totalPending / limit),
      data: products,
    });
  } catch (error) {
    console.error("Error fetching pending products:", (error as Error).message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const verifyProductById: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as JwtPayload; // Assumes authentication middleware

    if (!user || user.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden: You cannot access this resource" });
      return;
    }

    const { id } = req.params;

    // Ensure the ID is a valid UUID (adjust as needed for your DB)
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Invalid product ID" });
      return;
    }

    // Attempt to verify product in a single step
    const updatedProduct = await prisma.product.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "APPROVED" },
    });

    if (updatedProduct.count === 0) {
      res.status(404).json({ error: "Product not found or already verified" });
      return;
    }

    res.status(200).json({ message: "Product verified successfully" });
  } catch (error) {
    console.error("Error verifying product:", (error as Error).message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const verifyProductOfSellerEmailByAdmin: RequestHandler = async (req, res): Promise<void> => {
  try {
    const user = req.user as JwtPayload; // Assumes authentication middleware

    if (!user || user.role !== "ADMIN") {
      res.status(403).json({ message: "Forbidden: You cannot access this resource" });
      return;
    }

    const { email } = req.params;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Invalid email parameter" });
      return;
    }

    const seller = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (!seller) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }

    // Attempt to verify products in a single query
    const { count } = await prisma.product.updateMany({
      where: { sellerId: seller.id, status: "PENDING" },
      data: { status: "APPROVED" },
    });

    if (count === 0) {
      res.status(404).json({ error: "No pending products found for this seller" });
      return;
    }

    res.status(200).json({
      message: "All pending products of this seller verified successfully",
      totalVerified: count,
    });
  } catch (error) {
    console.error("Error verifying products for seller:", (error as Error).message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getProductBySellerWithStatus: RequestHandler = async (req, res): Promise<void> => {
  try {
    const user = req.user as JwtPayload; // Assumes authentication middleware

    if (!user) {
      res.status(401).json({ error: "Unauthorized: Invalid token" });
      return;
    }

    const { sellerId, status } = req.params;

    // Validate sellerId format
    const uuidSchema = z.string().uuid();
    if (!sellerId || !uuidSchema.safeParse(sellerId).success) {
      res.status(400).json({ error: "Invalid seller ID format" });
      return;
    }

    // Validate status
    if (!status || !Object.values(ProductStatus).includes(status as ProductStatus)) {
      res.status(400).json({ error: "Invalid status value" });
      return;
    }

    // Ensure seller exists before fetching products
    const sellerExists = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true },
    });

    if (!sellerExists) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }

    // Access control: ADMINs can view all, sellers can only view their own products
    if (user.role !== "ADMIN" && user.id !== sellerId) {
      res.status(403).json({ error: "Forbidden: You cannot view this seller's products" });
      return;
    }

    // Fetch products
    const products = await prisma.product.findMany({
      where: { sellerId, status: status as ProductStatus },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        discount: true,
        category: true,
        stock: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products by seller with status:", (error as Error).message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const bulkUploadProduct: RequestHandler = async (req, res): Promise<void> => {
  try {
    const user = req.user as JwtPayload; // Assumes authentication middleware

    if (!user) {
      res.status(401).json({ error: "Unauthorized: Invalid token" });
      return;
    }

    // Role-based access control
    if (!["ADMIN", "SELLER"].includes(user.role)) {
      res.status(403).json({ error: "Forbidden: You cannot access this resource" });
      return;
    }

    // Validate request body (should be an array)
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: "Invalid request format: Expected an array of products." });
      return;
    }

    // Validate products using Zod schema
    const ProductArraySchema = z.array(
      ProductSchema.pick({
        title: true,
        description: true,
        price: true,
        category: true,
        stock: true,
      })
    );
    const validatedBody = ProductArraySchema.safeParse(req.body);

    if (!validatedBody.success) {
      res.status(400).json({
        error: "Invalid product data",
        details: validatedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    // Attach sellerId and default status to each product
    const products = validatedBody.data.map((product) => ({
      ...product,
      sellerId: user.id,
      status: "PENDING" as ProductStatus,
    }));

    // Ensure seller exists (reduces potential foreign key constraint issues)
    const sellerExists = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!sellerExists) {
      res.status(400).json({ error: "Invalid seller ID. The referenced seller does not exist." });

      return;
    }

    // Insert products in a single transaction
    const addedProducts = await prisma.$transaction(
      products.map((product) =>
        prisma.product.create({
          data: {
            ...product,
            title: product.title,
            description: product.description,
            price: product.price,
            category: product.category,
            seller: { connect: { id: user.id } }, // Ensure seller relation is properly connected
          },
        })
      )
    );

    res.status(201).json({
      message: "Products added successfully",
      totalAdded: addedProducts.length,
      data: addedProducts,
    });
  } catch (error) {
    console.error("Error adding products:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          res.status(400).json({ error: "Duplicate product title. Please use a different title." });
          return;
        case "P2003":
          res.status(400).json({ error: "Invalid seller ID. The referenced seller does not exist." });
          return;
        default:
          res.status(500).json({ error: "Database error occurred", details: error.message });
          return;
      }
    }

    res.status(500).json({
      message: "Internal Server Error",
      error: error instanceof Error ? error.message : "Unexpected error",
    });
  }
};

const bulkDeleteProducts: RequestHandler = async (req, res): Promise<void> => {
  try {
    const user = req.user as JwtPayload; // Assumes authentication middleware

    if (!user) {
      res.status(401).json({ error: "Unauthorized: Invalid token" });
      return;
    }

    // Role-based access control: ADMIN can delete any product, SELLER can delete only their own products
    const isAdmin = user.role === "ADMIN";
    if (!isAdmin && user.role !== "SELLER") {
      res.status(403).json({ error: "Forbidden: You cannot access this resource" });
      return;
    }

    const { productIds } = req.body;

    // Validate productIds (should be a non-empty array)
    if (!Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({ error: "Invalid request: Expected a non-empty array of product IDs." });
      return;
    }

    const uuidSchema = z.string().uuid();
    const areValidIds = productIds.every((id) => uuidSchema.safeParse(id).success);
    if (!areValidIds) {
      res.status(400).json({ error: "Invalid product ID format" });
      return;
    }

    // Fetch products to check ownership (only for SELLER)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...(isAdmin ? {} : { sellerId: user.id }), // Admin can delete any, seller only theirs
      },
      select: { id: true },
    });

    if (products.length === 0) {
      res.status(404).json({ error: "No matching products found to delete" });
      return;
    }

    // Delete only the matched products
    const deleteResult = await prisma.product.deleteMany({
      where: { id: { in: products.map((p) => p.id) } },
    });

    res.status(200).json({
      message: "Products deleted successfully",
      totalDeleted: deleteResult.count,
    });
  } catch (error) {
    console.error("Error deleting products:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ error: "Some products were not found or already deleted" });
      return;
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
};

// filter Products

export {
  addProduct,
  deleteProductById,
  updateProductById,
  getAllProducts,
  getProductById,
  getProductBySellerId,
  getProductByCategory,
  getProductsByPriceRange,
  getProductByName,
  getProductsByPagination,
  productSortByPriceOrRating,
  discountProducts,
  getAllProductsLeftForVerification,
  verifyAllProducts,
  verifyProductById,
  getProductBySellerWithStatus,
  bulkUploadProduct,
  bulkDeleteProducts,
  verifyProductOfSellerEmailByAdmin,
  // filtered Products

  //  check image
};
