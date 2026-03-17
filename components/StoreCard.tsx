import { useFavorites } from "@/hooks/useFavorites";
import type { Store } from "@/types/store";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  store: Store | null;
  onCardPress: () => void;
  onDetailPress: () => void;
};

export function StoreCard({ store, onCardPress, onDetailPress }: Props) {
  const { isFavorite, toggleFavorite, reloadFavorites } = useFavorites();

  useFocusEffect(
    useCallback(() => {
      reloadFavorites();
    }, [reloadFavorites]),
  );

  if (!store) return null;

  const reviews = store.reviews ?? [];

  let recommendCount = 0;
  let neutralCount = 0;
  let notRecommendCount = 0;

  reviews.forEach((review) => {
    if (review.recommend === "추천") recommendCount++;
    else if (review.recommend === "애매") neutralCount++;
    else if (review.recommend === "비추천") notRecommendCount++;
  });

  const favorite = isFavorite(store.id);
  const hasImage = !!store.image_url;

  return (
    <Pressable style={styles.card} onPress={onCardPress}>
      {hasImage && (
        <View style={styles.imageWrap}>
          <Image source={{ uri: store.image_url! }} style={styles.cardImage} />
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {store.name}
          </Text>
          <Text style={styles.cardAddress} numberOfLines={1}>
            {store.address}
          </Text>
        </View>

        <Pressable
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
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

      <View style={styles.reviewSummaryRow}>
        <Text style={styles.reviewSummaryCount}>후기 {reviews.length}개</Text>

        <View style={[styles.reviewInlineBadge, styles.reviewRecommendBadge]}>
          <Text style={[styles.reviewInlineBadgeText, styles.recommendText]}>
            추천 {recommendCount}
          </Text>
        </View>

        <View style={styles.reviewInlineBadge}>
          <Text style={styles.reviewInlineBadgeText}>애매 {neutralCount}</Text>
        </View>

        <View style={[styles.reviewInlineBadge, styles.reviewBadBadge]}>
          <Text style={[styles.reviewInlineBadgeText, styles.badText]}>
            비추천 {notRecommendCount}
          </Text>
        </View>
      </View>

      <Pressable
        style={styles.button}
        onPress={(e) => {
          e.stopPropagation();
          onDetailPress();
        }}
      >
        <Text style={styles.buttonText}>매장 상세 보기</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },

  imageWrap: {
    marginBottom: 12,
  },

  cardImage: {
    width: "100%",
    height: 160,
    borderRadius: 16,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },

  titleWrap: {
    flex: 1,
  },

  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F6F6F6",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 4,
  },

  cardAddress: {
    fontSize: 13,
    color: "#666666",
    marginBottom: 6,
  },

  reviewSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },

  reviewSummaryCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333333",
    marginRight: 2,
  },

  reviewInlineBadge: {
    backgroundColor: "#F3F3F3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E2E2",
  },

  reviewInlineBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555555",
  },

  reviewRecommendBadge: {
    backgroundColor: "#E8F7EE",
    borderColor: "#BFE8CE",
  },

  reviewBadBadge: {
    backgroundColor: "#FFF1F1",
    borderColor: "#F1CACA",
  },

  recommendText: {
    color: "#2E8B57",
  },

  badText: {
    color: "#D05C5C",
  },

  button: {
    backgroundColor: "#FF5A5F",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
