import type { Review } from "./review";

export type Store = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  status: string | null;
  created_at: string;
  image_url: string | null;
  reviews?: Review[];
};
