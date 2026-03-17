import { supabase } from "@/lib/supabase";
import type { CreateReviewInput, Review } from "@/types/review";
import * as FileSystem from "expo-file-system/legacy";

function base64ToArrayBuffer(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

export async function uploadReviewImage(
  storeId: string,
  imageUri: string,
): Promise<string | null> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = base64ToArrayBuffer(base64);
  const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${storeId}/${Date.now()}.${fileExt}`;

  const contentType =
    fileExt === "png"
      ? "image/png"
      : fileExt === "webp"
        ? "image/webp"
        : "image/jpeg";

  const { error: uploadError } = await supabase.storage
    .from("review-images")
    .upload(fileName, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("review-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function createReview(input: CreateReviewInput) {
  const { error } = await supabase.from("reviews").insert([input]);

  if (error) {
    throw error;
  }
}

export async function getReviewsByStoreId(storeId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Review[];
}
