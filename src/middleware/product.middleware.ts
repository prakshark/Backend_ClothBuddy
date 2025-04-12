import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodSchema, z } from "zod";
import { JwtPayload } from "jsonwebtoken";
import { querySchema } from "../validators/product.validators";

const uuidSchema = z.string().uuid();

export const validate = (schema: ZodSchema<unknown>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.format() });
      return;
    }
    req.body = parsed.data;
    next();
  };
};

export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`🔍 UUID Validation Middleware Triggered for Param: ${paramName}`);
    console.log(`➡️ Received Param Value:`, req.params[paramName]);

    const parsed = uuidSchema.safeParse(req.params[paramName]);
    if (!parsed.success) {
      console.log(`❌ Invalid UUID detected for param: ${paramName}`);
      res.status(400).json({ error: "Invalid UUID format" });
      return;
    }

    console.log(`✅ Valid UUID:`, req.params[paramName]);
    next();
  };
};

export const isSeller: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as JwtPayload;
  if (user.role !== "SELLER") {
    res.status(403).json({ error: "Only sellers can perform this action" });
    return;
  }
  next();
};

export const validateProductQuery: RequestHandler = (req, res, next) => {
  const validatedQuery = querySchema.safeParse(req.query);
  if (!validatedQuery.success) {
    res.status(400).json({ error: validatedQuery.error.errors[0].message });
    return;
  }
  req.query = validatedQuery.data;
  next();
};
