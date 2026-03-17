import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const FAVORITES_KEY = "favorite_store_ids";

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);

      if (stored) {
        setFavoriteIds(JSON.parse(stored));
      } else {
        setFavoriteIds([]);
      }
    } catch (error) {
      console.error("즐겨찾기 불러오기 실패:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = async (storeId: string) => {
    try {
      const isAlreadyFavorite = favoriteIds.includes(storeId);

      const updatedIds = isAlreadyFavorite
        ? favoriteIds.filter((id) => id !== storeId)
        : [storeId, ...favoriteIds];

      setFavoriteIds(updatedIds);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedIds));
    } catch (error) {
      console.error("즐겨찾기 저장 실패:", error);
    }
  };

  const isFavorite = (storeId: string) => {
    return favoriteIds.includes(storeId);
  };

  return {
    favoriteIds,
    isLoaded,
    favoriteCount: favoriteIds.length,
    isFavorite,
    toggleFavorite,
    reloadFavorites: loadFavorites,
  };
}
