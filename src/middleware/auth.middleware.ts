import JWT_KEY from "../config/JWT.key";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { buyerUpdateSchema, emailSchema, passwordSchema, sellerUpdateSchema } from "../validators/validate.user";

declare module "express-serve-static-core" {
  interface Request {
    user?: string | JwtPayload;
  }
}

//Authentication Middleware
export const authenticateUser: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const token = authorizationHeader.split(" ")[1];

    if (!JWT_KEY) {
      console.error("JWT Secret is not defined");
      res.status(500).json({ message: "Internal server error" });
      return;
    }

    const decodedToken = jwt.verify(token, JWT_KEY as string) as JwtPayload & { role: string };
    console.log("Decoded Token:", decodedToken);

    if (!decodedToken.role) {
      console.error("JWT does not contain role");
      res.status(400).json({ message: "Invalid token structure" });
      return;
    }

    req.user = decodedToken;

    console.log("Request User:", req.user);
    next();
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  console.log("User from Token:", req.user);

  if (!req.user || (req.user as JwtPayload).role !== "ADMIN") {
    res.status(403).json({ message: "Forbidden: Admins only" });
    return;
  }

  next();
};

export const isBuyerOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  console.log("User from Token:", req.user);

  if (!req.user || !["ADMIN", "BUYER"].includes((req.user as JwtPayload).role)) {
    res.status(403).json({ message: "Forbidden: Only admins and buyers can access this resource" });
    return;
  }

  next();
};

export const validateEmail = (req: Request, res: Response, next: NextFunction): void => {
  const validation = emailSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ message: "Invalid email format" });
    return;
  }

  next();
};

export const validateToken = (req: Request, res: Response, next: NextFunction): void => {
  const { token } = req.params;

  if (!token) {
    res.status(400).json({ message: "Token is required" });
    return;
  }

  try {
    jwt.verify(token, process.env.JWT_KEY as string);
    next();
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Invalid or expired token" });
    return;
  }
};

export const validatePassword = (req: Request, res: Response, next: NextFunction): void => {
  const validation = passwordSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ message: "Password must be at least 6 characters long" });
    return;
  }

  next();
};

export const validateBuyerUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const validation = buyerUpdateSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  next();
};

export const validateSellerUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const validation = sellerUpdateSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  next();
};

export const isSeller = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || (req.user as JwtPayload).role !== "SELLER") {
    return res.status(403).json({ message: "Forbidden: Only sellers can add products" });
  }
  next();
};

export const isAdminOrSeller = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized: User not authenticated" });
    return;
  }

  const user = req.user as JwtPayload;

  // Only admins and sellers can proceed to the controller
  if (user.role !== "ADMIN" && user.role !== "SELLER") {
    res.status(403).json({ message: "Forbidden: Only admins and sellers can perform this action" });
    return;
  }

  next();
};

export const isAdminBuyerOrSeller = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || !["ADMIN", "SELLER", "BUYER"].includes((req.user as JwtPayload).role)) {
    res.status(403).json({ message: "Forbidden: Only admins, sellers and buyers can perform this action" });
    return;
  }
  next();
};
