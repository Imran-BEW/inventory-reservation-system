import { z } from "zod";

export const ReserveSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

export const ReservationStatusSchema = z.enum(["PENDING", "CONFIRMED", "RELEASED"]);

export type ReserveInput = z.infer<typeof ReserveSchema>;
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

// API response types
export interface ProductWithStock {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  stock: {
    warehouseId: string;
    warehouseName: string;
    warehouseLocation: string;
    total: number;
    reserved: number;
    available: number;
  }[];
}

export interface WarehouseResponse {
  id: string;
  name: string;
  location: string;
}

export interface ReservationResponse {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    price: string;
    imageUrl: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}
