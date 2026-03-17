import { supabase } from "@/lib/supabase";
import type { CreateStoreSubmissionInput } from "@/types/submission";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";

export async function uploadSubmissionImages(localUris: string[]) {
  const uploadedUrls: string[] = [];

  for (const localUri of localUris) {
    const ext = localUri.split(".").pop()?.toLowerCase() ?? "jpg";

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const filePath = `submission-images/${fileName}`;

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const arrayBuffer = decode(base64);

    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "heic" || ext === "heif"
            ? "image/heic"
            : "application/octet-stream";

    const { error: uploadError } = await supabase.storage
      .from("store-submissions")
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("store-submissions")
      .getPublicUrl(filePath);

    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}

export async function createStoreSubmission(input: CreateStoreSubmissionInput) {
  const { error } = await supabase.from("store_submissions").insert({
    request_type: input.request_type,
    name: input.name,
    address: input.address,
    description: input.description ?? null,
    image_urls: input.image_urls ?? null,
  });

  if (error) {
    throw error;
  }
}
