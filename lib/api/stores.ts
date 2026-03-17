import { supabase } from "@/lib/supabase";
import type { Review } from "@/types/review";
import type { Store } from "@/types/store";

export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Store[];
}

export async function getStoreById(id: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data as Store;
}

export async function getStoresWithReviews(): Promise<Store[]> {
  const { data: storeData, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false });

  if (storeError) {
    throw storeError;
  }

  const { data: reviewData, error: reviewError } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (reviewError) {
    throw reviewError;
  }

  const stores = (storeData ?? []) as Store[];
  const reviews = (reviewData ?? []) as Review[];

  const reviewsByStoreId: Record<string, Review[]> = {};

  reviews.forEach((review) => {
    if (!reviewsByStoreId[review.store_id]) {
      reviewsByStoreId[review.store_id] = [];
    }

    reviewsByStoreId[review.store_id].push(review);
  });

  return stores.map((store) => ({
    ...store,
    reviews: reviewsByStoreId[store.id] ?? [],
  }));
}
