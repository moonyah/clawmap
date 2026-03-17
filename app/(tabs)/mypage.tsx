import { useFavorites } from "@/hooks/useFavorites";
import { getStores } from "@/lib/api/stores";
import type { Store } from "@/types/store";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MyPageScreen() {
  const router = useRouter();
  const { favoriteIds, isLoaded, reloadFavorites } = useFavorites();
  const [stores, setStores] = useState<Store[]>([]);

  const fetchStores = useCallback(async () => {
    try {
      const data = await getStores();
      setStores(data);
    } catch (error) {
      console.log("MY PAGE STORES ERROR:", error);
      setStores([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadFavorites();
      fetchStores();
    }, [reloadFavorites, fetchStores]),
  );

  const validFavoriteCount = useMemo(() => {
    return stores.filter((store) => favoriteIds.includes(store.id)).length;
  }, [stores, favoriteIds]);

  const handlePressFavorites = () => {
    router.push("/favorites");
  };

  const handlePressSubmitStore = () => {
    router.push("/submit-store");
  };

  const handlePressContact = async () => {
    const url = "https://forms.gle/yGVFfC9id4gevzPS8";

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.log("URL을 열 수 없습니다:", url);
    }
  };

  const handlePressPrivacy = async () => {
    const url =
      "https://www.notion.so/ClawMap-3269909c46258093b013f1392d72fadc?source=copy_link";

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.log("URL을 열 수 없습니다:", url);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>내정보</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#FF5A5F"
              />
            </View>
            <Text style={styles.label}>내가 쓴 후기 수</Text>
          </View>
          <Text style={styles.body}>로그인 기능 추가 후 제공 예정입니다.</Text>
        </View>

        <Pressable style={styles.card} onPress={handlePressFavorites}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name="heart-outline" size={18} color="#FF5A5F" />
            </View>
            <Text style={styles.label}>저장한 매장 수</Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.value}>
              {isLoaded ? `${validFavoriteCount}개` : "불러오는 중..."}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#BBBBBB" />
          </View>
        </Pressable>

        <Pressable style={styles.card} onPress={handlePressSubmitStore}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name="add-circle-outline" size={18} color="#FF5A5F" />
            </View>
            <Text style={styles.label}>매장 제보하기</Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.bodyInline}>지도에 없는 매장을 등록 요청</Text>
            <Ionicons name="chevron-forward" size={18} color="#BBBBBB" />
          </View>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#FF5A5F"
              />
            </View>
            <Text style={styles.label}>앱 소개</Text>
          </View>
          <Text style={styles.body}>
            인형뽑기 매장과 리뷰를 쉽게 찾는 지도 앱입니다.
          </Text>
        </View>

        <Pressable style={styles.card} onPress={handlePressContact}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#FF5A5F"
              />
            </View>
            <Text style={styles.label}>문의하기</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.bodyInline}>오류 제보 및 의견 남기기</Text>
            <Ionicons name="open-outline" size={18} color="#BBBBBB" />
          </View>
        </Pressable>

        <Pressable style={styles.card} onPress={handlePressPrivacy}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color="#FF5A5F"
              />
            </View>
            <Text style={styles.label}>개인정보처리방침</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.bodyInline}>개인정보 처리 방침 확인</Text>
            <Ionicons name="open-outline" size={18} color="#BBBBBB" />
          </View>
        </Pressable>

        <Text style={styles.version}>ClawMap v1.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
    marginLeft: 8,
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFF3F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },

  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF5A5F",
  },

  body: {
    fontSize: 14,
    lineHeight: 21,
    color: "#555555",
  },

  bodyInline: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: "#555555",
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  version: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13,
    color: "#999999",
  },
});
