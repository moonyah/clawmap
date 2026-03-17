export const STORE_REPORT_REASONS = [
  "폐업",
  "위치 오류",
  "정보 오류",
  "기계 상태 불량",
  "기타",
] as const;

export type StoreReportReason = (typeof STORE_REPORT_REASONS)[number];

export type StoreReport = {
  id: string; // uuid
  store_id: string; // uuid
  reason: StoreReportReason;
  detail: string | null;
  created_at: string;
};

export type CreateStoreReportInput = {
  store_id: string; // uuid
  reason: StoreReportReason;
  detail?: string | null;
};
