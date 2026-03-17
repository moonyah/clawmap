export type StoreSubmission = {
  id: string;
  request_type: "add" | "update" | "delete";
  name: string;
  address: string;
  description: string | null;
  image_urls: string[] | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type CreateStoreSubmissionInput = {
  request_type: "add" | "update" | "delete";
  name: string;
  address: string;
  description?: string | null;
  image_urls?: string[] | null;
};
