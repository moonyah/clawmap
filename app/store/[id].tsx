import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/lib/supabase";
import type { Review } from "@/types/review";
import type { Store } from "@/types/store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CONTENT_HORIZONTAL_PADDING = 16;
const IMAGE_WIDTH = SCREEN_WIDTH - CONTENT_HORIZONTAL_PADDING * 2;

type StoreDetail = Store & {
  reviews: Review[];
};

export default function StoreDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const fetchStore = useCallback(async () => {
    if (!id) {
      setStore(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("id", id)
      .single();

    if (storeError || !storeData) {
      setStore(null);
      setLoading(false);
      return;
    }

    const { data: reviewData, error: reviewError } = await supabase
      .from("reviews")
      .select("*")
      .eq("store_id", id)
      .order("created_at", { ascending: false });

    setStore({
      ...(storeData as Store),
      reviews: reviewError || !reviewData ? [] : (reviewData as Review[]),
    });

    setLoading(false);
  }, [id]);

  const handleCopyAddress = async () => {
    if (!store?.address) return;

    await Clipboard.setStringAsync(store.address);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("주소 복사", "매장 주소가 복사되었습니다.");
  };

  useFocusEffect(
    useCallback(() => {
      fetchStore();
    }, [fetchStore]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#111111" />
        <Text style={styles.loadingText}>매장 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>매장을 찾을 수 없습니다.</Text>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>뒤로 가기</Text>
        </Pressable>
      </View>
    );
  }

  let recommendCount = 0;
  let neutralCount = 0;
  let notRecommendCount = 0;

  store.reviews.forEach((review) => {
    if (review.recommend === "추천") recommendCount++;
    else if (review.recommend === "애매") neutralCount++;
    else if (review.recommend === "비추천") notRecommendCount++;
  });

  const favorite = isFavorite(store.id);
  const hasImage = !!store.image_url;

  return (
    <>
      <Stack.Screen
        options={{
          title: store.name,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/");
                }
              }}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F6F6F6",
                marginRight: 8,
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#111111" />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 32, 80) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {hasImage && (
          <View style={styles.imageSection}>
            <Image source={{ uri: store.image_url! }} style={styles.image} />
          </View>
        )}

        <View style={styles.titleRow}>
          <Text style={styles.title}>{store.name}</Text>

          <Pressable
            style={styles.favoriteButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFavorite(store.id);
            }}
          >
            <Ionicons
              name={favorite ? "heart" : "heart-outline"}
              size={22}
              color={favorite ? "#FF5A5F" : "#666666"}
            />
          </Pressable>
        </View>

        {!!store.description && (
          <Text style={styles.description}>{store.description}</Text>
        )}

        <Pressable style={styles.addressRow} onPress={handleCopyAddress}>
          <Text style={styles.address}>{store.address}</Text>
          <Ionicons name="copy-outline" size={16} color="#888888" />
        </Pressable>
        <Pressable
          style={styles.mapButton}
          onPress={() =>
            router.push({
              pathname: "/",
              params: { storeId: store.id },
            })
          }
        >
          <Ionicons name="map-outline" size={18} color="#111111" />
          <Text style={styles.mapButtonText}>지도에서 보기</Text>
        </Pressable>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>리뷰 요약</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryCount}>
              후기 {store.reviews.length}개
            </Text>
          </View>

          <View style={styles.summaryBadgeRow}>
            <View style={[styles.summaryBadge, styles.summaryRecommendBadge]}>
              <Text
                style={[styles.summaryBadgeText, styles.summaryRecommendText]}
              >
                추천 {recommendCount}
              </Text>
            </View>

            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>애매 {neutralCount}</Text>
            </View>

            <View style={[styles.summaryBadge, styles.summaryBadBadge]}>
              <Text style={[styles.summaryBadgeText, styles.summaryBadText]}>
                비추천 {notRecommendCount}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.reviewButton}
          onPress={() => router.push(`/store/${store.id}/review`)}
        >
          <Text style={styles.reviewButtonText}>후기 작성하기</Text>
        </Pressable>

        {store.reviews.length === 0 ? (
          <View style={styles.emptyReviewBox}>
            <Text style={styles.emptyReviewText}>
              아직 작성된 후기가 없습니다.
            </Text>
            <Text style={styles.emptyReviewSubText}>첫 후기를 남겨보세요!</Text>
          </View>
        ) : (
          store.reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewNickname}>{review.nickname}</Text>
                <Text style={styles.reviewDate}>
                  {review.created_at.slice(0, 10)}
                </Text>
              </View>

              <Text style={styles.reviewComment}>{review.comment}</Text>

              {review.image_url && (
                <Pressable
                  onPress={() => setSelectedImageUrl(review.image_url)}
                >
                  <Image
                    source={{ uri: review.image_url }}
                    style={styles.reviewImage}
                  />
                </Pressable>
              )}

              <View style={styles.reviewBadgeContainer}>
                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>
                    기계 {review.machine_condition}
                  </Text>
                </View>

                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>
                    상품 {review.prize_stock}
                  </Text>
                </View>

                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>
                    {review.difficulty}
                  </Text>
                </View>

                <View
                  style={[
                    styles.reviewBadge,
                    review.recommend === "추천" && styles.reviewBadgeRecommend,
                    review.recommend === "비추천" && styles.reviewBadgeBad,
                  ]}
                >
                  <Text
                    style={[
                      styles.reviewBadgeText,
                      review.recommend === "추천" &&
                        styles.reviewBadgeRecommendText,
                      review.recommend === "비추천" &&
                        styles.reviewBadgeBadText,
                    ]}
                  >
                    {review.recommend}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        <Pressable
          style={styles.reportButton}
          onPress={() =>
            router.push({
              pathname: "/store/[id]/report",
              params: { id: store.id },
            })
          }
        >
          <Ionicons name="alert-circle-outline" size={16} color="#999999" />
          <Text style={styles.reportButtonText}>
            정보가 잘못됐나요? 매장 신고하기
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={!!selectedImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <Pressable
          style={styles.imageModalOverlay}
          onPress={() => setSelectedImageUrl(null)}
        >
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.imageModalImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666666",
  },

  notFoundText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222222",
    marginBottom: 14,
  },

  backButton: {
    backgroundColor: "#111111",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  imageSection: {
    marginBottom: 16,
  },

  image: {
    width: IMAGE_WIDTH,
    height: 220,
    borderRadius: 16,
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },

  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#D9D9D9",
  },

  paginationDotActive: {
    width: 18,
    backgroundColor: "#FF5A5F",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: "700",
    color: "#111111",
    marginRight: 12,
  },

  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F6F6F6",
    alignItems: "center",
    justifyContent: "center",
  },

  description: {
    fontSize: 16,
    color: "#444444",
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    marginTop: 12,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },

  address: {
    flex: 1,
    fontSize: 15,
    color: "#666666",
  },

  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },

  mapButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
  },

  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  tag: {
    backgroundColor: "#FFECEC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  tagText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E85D75",
  },

  summaryBox: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 10,
  },

  summaryRow: {
    marginBottom: 12,
  },

  summaryCount: {
    fontSize: 14,
    color: "#555555",
    fontWeight: "600",
  },

  summaryBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  summaryBadge: {
    backgroundColor: "#F3F3F3",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  summaryBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555555",
  },

  summaryRecommendBadge: {
    backgroundColor: "#EEF9F1",
    borderColor: "#CFEBD8",
  },

  summaryRecommendText: {
    color: "#2E8B57",
  },

  summaryBadBadge: {
    backgroundColor: "#FFF1F1",
    borderColor: "#F3D0D0",
  },

  summaryBadText: {
    color: "#D05C5C",
  },

  reviewButton: {
    backgroundColor: "#111111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    marginTop: 5,
  },

  reviewButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  emptyReviewBox: {
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    padding: 16,
  },

  emptyReviewText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222222",
    marginBottom: 4,
  },

  emptyReviewSubText: {
    fontSize: 14,
    color: "#777777",
  },

  reviewCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },

  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  reviewNickname: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },

  reviewDate: {
    fontSize: 13,
    color: "#888888",
  },

  reviewComment: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333333",
    marginBottom: 10,
  },

  reviewBadgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  reviewBadge: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  reviewBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555555",
  },

  reviewBadgeRecommend: {
    backgroundColor: "#EEF9F1",
    borderColor: "#CFEBD8",
  },

  reviewBadgeRecommendText: {
    color: "#2E8B57",
  },

  reviewBadgeBad: {
    backgroundColor: "#FFF1F1",
    borderColor: "#F3D0D0",
  },

  reviewBadgeBadText: {
    color: "#D05C5C",
  },
  reportButton: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },

  reportButtonText: {
    fontSize: 13,
    color: "#999999",
    fontWeight: "600",
  },
  reviewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  imageModalImage: {
    width: "100%",
    height: "75%",
  },
});
