import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFavorites } from "@/hooks/useFavorites";
import { getStores } from "@/lib/api/stores";
import type { Store } from "@/types/store";

export default function FavoritesScreen() {
  const router = useRouter();
  const {
    favoriteIds,
    isLoaded,
    reloadFavorites,
    isFavorite,
    toggleFavorite,
    favoriteCount,
  } = useFavorites();

  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  const fetchStores = useCallback(async () => {
    try {
      setLoadingStores(true);
      const data = await getStores();
      setStores(data);
    } catch (error) {
      console.log("FAVORITE STORES ERROR:", error);
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadFavorites();
      fetchStores();
    }, [reloadFavorites, fetchStores]),
  );

  const favoriteStores = useMemo(() => {
    const storeMap = new Map(stores.map((store) => [store.id, store]));
    return favoriteIds
      .map((id) => storeMap.get(id))
      .filter((store): store is Store => !!store);
  }, [stores, favoriteIds]);

  const handleToggleFavorite = (storeId: string, storeName: string) => {
    const favorite = isFavorite(storeId);

    if (!favorite) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleFavorite(storeId);
      return;
    }

    Alert.alert(
      "즐겨찾기 해제",
      `${storeName}을(를) 저장 목록에서 제거할까요?`,
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "제거",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleFavorite(storeId);
          },
        },
      ],
    );
  };

  if (!isLoaded || loadingStores) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#111111" />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (favoriteStores.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="heart-outline" size={34} color="#FF5A5F" />
          </View>

          <Text style={styles.title}>즐겨찾기</Text>
          <Text style={styles.description}>아직 저장한 매장이 없습니다.</Text>
          <Text style={styles.subText}>
            마음에 드는 매장을 즐겨찾기에 추가해보세요.
          </Text>

          <Pressable style={styles.button} onPress={() => router.push("/")}>
            <Text style={styles.buttonText}>지도에서 매장 찾기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screenContainer}>
        <Text style={styles.listTitle}>
          즐겨찾기 <Text style={styles.count}>({favoriteStores.length})</Text>
        </Text>

        <FlatList
          data={favoriteStores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const favorite = isFavorite(item.id);
            const hasImage = !!item.image_url;

            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/store/${item.id}`)}
              >
                {hasImage && (
                  <Image
                    source={{ uri: item.image_url! }}
                    style={styles.cardImage}
                  />
                )}

                <Pressable
                  style={styles.favoriteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(item.id, item.name);
                  }}
                >
                  <Ionicons
                    name={favorite ? "heart" : "heart-outline"}
                    size={20}
                    color={favorite ? "#FF5A5F" : "#666666"}
                  />
                </Pressable>

                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {item.address}
                  </Text>

                  <Pressable
                    style={styles.mapLinkButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push({
                        pathname: "/(tabs)",
                        params: {
                          storeId: item.id,
                          focusTs: Date.now().toString(),
                        },
                      });
                    }}
                  >
                    <Ionicons name="map-outline" size={15} color="#FF5A5F" />
                    <Text style={styles.mapLinkText}>지도 보기</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  listTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
    marginLeft: 8,
    marginBottom: 20,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF3F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 6,
  },
  subText: {
    fontSize: 14,
    color: "#777777",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#FF5A5F",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 15,
    color: "#666666",
  },
  card: {
    position: "relative",
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
  },
  cardImage: {
    width: 84,
    height: 84,
    borderRadius: 12,
    marginRight: 12,
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  cardTextWrap: {
    flex: 1,
    paddingRight: 28,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 6,
  },
  cardMeta: {
    fontSize: 12,
    color: "#888888",
    marginBottom: 6,
  },
  cardAddress: {
    fontSize: 13,
    color: "#666666",
  },
  mapLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF1F1",
  },
  mapLinkText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#FF5A5F",
  },
  count: {
    color: "#888",
    fontSize: 14,
  },
});
