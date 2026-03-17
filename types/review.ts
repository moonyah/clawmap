export type ReviewRecommend = "추천" | "애매" | "비추천";

export type Review = {
  id: string;
  store_id: string;
  nickname: string;
  comment: string;
  machine_condition: string | null;
  prize_stock: string | null;
  difficulty: string | null;
  recommend: ReviewRecommend | null;
  created_at: string;
  image_url: string | null;
};

export type CreateReviewInput = {
  store_id: string;
  nickname: string;
  comment: string;
  machine_condition: "좋음" | "보통" | "나쁨";
  prize_stock: "많음" | "보통" | "적음";
  difficulty: "쉬움" | "보통" | "어려움";
  recommend: ReviewRecommend;
  image_url?: string | null;
};
