import { NearestBadge } from "@/components/NearestBadge";
import { StoreCard } from "@/components/StoreCard";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { getStoresWithReviews } from "@/lib/api/stores";
import type { Store } from "@/types/store";
import { getDistance } from "@/utils/distance";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Image,
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function HomeScreen() {
  const [mapKey, setMapKey] = useState(0);
  const [didRemountMap, setDidRemountMap] = useState(false);
  const { storeId, focusTs } = useLocalSearchParams<{
    storeId?: string;
    focusTs?: string;
  }>();

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [nearestStore, setNearestStore] = useState<{
    store: Store;
    distance: number;
  } | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const userLocation = useCurrentLocation();
  const mapRef = useRef<MapView | null>(null);

  const currentSelectedStore = selectedStore
    ? (stores.find((store) => store.id === selectedStore.id) ?? selectedStore)
    : null;

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStoresWithReviews();
      setStores(data);
    } catch (error) {
      console.log("FETCH STORES ERROR:", error);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const focusOnStore = (
    store: Store,
    options?: { keepSearchText?: boolean },
  ) => {
    if (!store) return;

    const latitude = Number(store.latitude);
    const longitude = Number(store.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.log("INVALID STORE COORDS:", store);
      return;
    }

    setSelectedStore({
      ...store,
      latitude,
      longitude,
    });
    setIsCardVisible(true);

    if (!options?.keepSearchText) {
      setSearchText("");
      setIsSearchFocused(false);
      Keyboard.dismiss();
    }

    if (!mapReady) return;

    setTimeout(() => {
      try {
        if (
          !mapRef.current ||
          typeof mapRef.current.animateCamera !== "function"
        ) {
          return;
        }

        mapRef.current.animateCamera(
          {
            center: {
              latitude,
              longitude,
            },
            zoom: 17,
          },
          { duration: 500 },
        );
      } catch (error) {
        console.log("FOCUS CAMERA ERROR:", error);
      }
    }, 250);
  };

  useEffect(() => {
    console.log("HOME PARAMS:", { storeId, focusTs });
  }, [storeId, focusTs]);

  useFocusEffect(
    useCallback(() => {
      fetchStores();
    }, [fetchStores]),
  );

  useEffect(() => {
    if (!mapReady || !storeId || stores.length === 0) return;

    const targetStore = stores.find((store) => store.id === storeId);

    console.log("FOCUS TARGET:", targetStore?.name, targetStore?.id);

    if (!targetStore) return;

    const timer = setTimeout(() => {
      focusOnStore(targetStore);
    }, 500);

    return () => clearTimeout(timer);
  }, [mapReady, storeId, focusTs, stores]);

  useEffect(() => {
    if (!mapReady || !userLocation || storeId) return;

    const latitude = Number(userLocation.latitude);
    const longitude = Number(userLocation.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    setTimeout(() => {
      try {
        if (
          !mapRef.current ||
          typeof mapRef.current.animateToRegion !== "function"
        ) {
          return;
        }

        mapRef.current.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          700,
        );
      } catch (error) {
        console.log("USER LOCATION REGION ERROR:", error);
      }
    }, 250);
  }, [mapReady, userLocation, storeId]);

  useEffect(() => {
    if (!userLocation || stores.length === 0) return;

    let closestStore = stores[0];
    let closestDistance = getDistance(
      userLocation.latitude,
      userLocation.longitude,
      stores[0].latitude,
      stores[0].longitude,
    );

    stores.forEach((store) => {
      const distance = getDistance(
        userLocation.latitude,
        userLocation.longitude,
        store.latitude,
        store.longitude,
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestStore = store;
      }
    });

    setNearestStore({
      store: closestStore,
      distance: closestDistance,
    });
  }, [userLocation, stores]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchStores();

        if (
          userLocation &&
          mapRef.current &&
          typeof mapRef.current.animateToRegion === "function"
        ) {
          const latitude = Number(userLocation.latitude);
          const longitude = Number(userLocation.longitude);

          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            setTimeout(() => {
              mapRef.current?.animateToRegion(
                {
                  latitude,
                  longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                },
                400,
              );
            }, 250);
          }
        }
      }
    });

    return () => subscription.remove();
  }, [fetchStores, userLocation]);

  const handleFocusNearestStore = () => {
    if (!nearestStore) return;
    focusOnStore(nearestStore.store);
  };

  const handleMoveToCurrentLocation = () => {
    if (!userLocation || !mapReady) return;

    const latitude = Number(userLocation.latitude);
    const longitude = Number(userLocation.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.log("INVALID USER LOCATION:", userLocation);
      return;
    }

    Keyboard.dismiss();
    setIsCardVisible(false);
    setIsSearchFocused(false);
    setSearchText("");

    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          if (
            !mapRef.current ||
            typeof mapRef.current.animateToRegion !== "function"
          ) {
            return;
          }

          mapRef.current.animateToRegion(
            {
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            800,
          );
        } catch (error) {
          console.log("CURRENT LOCATION ANIMATE ERROR:", error);
        }
      }, 250);
    });
  };

  const handleSelectSearchStore = (store: Store) => {
    Keyboard.dismiss();
    setSearchText("");
    setIsSearchFocused(false);
    focusOnStore(store);
  };

  const filteredStores = stores.filter((store) =>
    store.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderLocationPermissionCard = () => {
    if (userLocation) return null;

    return (
      <View style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <Ionicons name="location-outline" size={18} color="#FF5A5F" />
          <Text style={styles.permissionTitle}>위치 권한이 필요해요</Text>
        </View>

        <Text style={styles.permissionBody}>
          위치 권한을 허용하면 내 주변 인형뽑기 매장을 추천받을 수 있어요.
        </Text>

        <Pressable
          style={styles.permissionButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.permissionButtonText}>설정으로 이동</Text>
        </Pressable>
      </View>
    );
  };

  const markers = useMemo(() => {
    return stores.map((store) => {
      const latitude = Number(store.latitude);
      const longitude = Number(store.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
        return null;

      const isSelected = selectedStore?.id === store.id;

      return (
        <Marker
          key={store.id}
          coordinate={{ latitude, longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={(e) => {
            e.stopPropagation();
            focusOnStore(store);
          }}
        >
          <Image
            source={
              isSelected
                ? require("../../assets/padded-claw-selected2.png")
                : require("../../assets/padded-claw2.png")
            }
            style={styles.markerImage}
          />
        </Marker>
      );
    });
  }, [stores, selectedStore]);

  const nearestBadgeTop = 60;
  const permissionCardTop = 120;

  const currentLocationButtonTop = userLocation ? 195 : 280;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="매장 이름으로 검색"
            placeholderTextColor="#999999"
            style={styles.searchInput}
          />

          {searchText.length > 0 && (
            <Pressable
              style={styles.clearButton}
              onPress={() => {
                setSearchText("");
                setIsSearchFocused(false);
                Keyboard.dismiss();
              }}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </Pressable>
          )}
        </View>

        {isSearchFocused && searchText.trim().length > 0 && (
          <View style={styles.searchResultBox}>
            {filteredStores.length > 0 ? (
              filteredStores.slice(0, 5).map((store, index) => (
                <Pressable
                  key={store.id}
                  style={[
                    styles.searchResultItem,
                    index === filteredStores.slice(0, 5).length - 1 &&
                      styles.lastSearchItem,
                  ]}
                  onPress={() => handleSelectSearchStore(store)}
                >
                  <Text style={styles.searchResultName}>{store.name}</Text>
                  <Text style={styles.searchResultAddress} numberOfLines={1}>
                    {store.address}
                  </Text>
                </Pressable>
              ))
            ) : (
              <View style={styles.searchEmpty}>
                <Text style={styles.searchEmptyText}>
                  검색 결과가 없습니다.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="standard"
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle="light"
        moveOnMarkerPress={false}
        loadingEnabled
        loadingIndicatorColor="#111111"
        loadingBackgroundColor="#FFFFFF"
        initialRegion={{
          latitude: 37.5665,
          longitude: 126.978,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onMapReady={() => {
          setMapReady(true);

          // 🔥 1회 재마운트
          if (!didRemountMap) {
            setDidRemountMap(true);
            setTimeout(() => {}, 200);
          }
        }}
        onPress={() => {
          Keyboard.dismiss();
          setIsSearchFocused(false);
        }}
      >
        {markers}
      </MapView>

      {userLocation ? (
        <Pressable
          style={[styles.nearestBadgeWrapper, { top: nearestBadgeTop }]}
          onPress={handleFocusNearestStore}
        >
          <NearestBadge
            nearestStore={nearestStore}
            onPress={handleFocusNearestStore}
          />
        </Pressable>
      ) : (
        <View
          style={[
            styles.permissionWrapper,
            {
              top: permissionCardTop,
            },
          ]}
        >
          {renderLocationPermissionCard()}
        </View>
      )}

      <Pressable
        style={[
          styles.currentLocationButton,
          {
            top: currentLocationButtonTop,
          },
        ]}
        onPress={handleMoveToCurrentLocation}
      >
        <Ionicons name="locate" size={22} color="#111111" />
      </Pressable>

      <StoreCard
        store={isCardVisible ? currentSelectedStore : null}
        onCardPress={() => {
          if (!currentSelectedStore) return;
          focusOnStore(currentSelectedStore, { keepSearchText: true });
        }}
        onDetailPress={() => {
          if (!currentSelectedStore?.id) return;
          router.push(`/store/${currentSelectedStore.id}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  userLocationMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#2F80ED",
    borderWidth: 3,
    borderColor: "white",
  },

  markerImage: {
    width: 42,
    height: 42,
    resizeMode: "contain",
  },

  searchContainer: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 20,
  },

  searchInputWrapper: {
    position: "relative",
    justifyContent: "center",
  },

  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 48,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111111",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  searchResultBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 8,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },

  lastSearchItem: {
    borderBottomWidth: 0,
  },

  searchResultName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 4,
  },

  searchResultAddress: {
    fontSize: 12,
    color: "#777777",
  },

  searchEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  searchEmptyText: {
    fontSize: 14,
    color: "#777777",
  },

  clearButton: {
    position: "absolute",
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F1F1",
    alignItems: "center",
    justifyContent: "center",
  },

  clearButtonText: {
    fontSize: 14,
    color: "#777777",
    fontWeight: "700",
  },

  loadingOverlay: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 30,
  },

  loadingText: {
    fontSize: 13,
    color: "#333333",
  },

  nearestBadgeWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 15,
  },

  permissionWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 15,
  },

  currentLocationButton: {
    position: "absolute",
    right: 16,
    width: 45,
    height: 45,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    zIndex: 18,
  },

  permissionCard: {
    backgroundColor: "#FFF8F8",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFD9DB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  permissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },

  permissionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },

  permissionBody: {
    fontSize: 13,
    lineHeight: 19,
    color: "#555555",
    marginBottom: 12,
  },

  permissionButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FF5A5F",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  permissionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
