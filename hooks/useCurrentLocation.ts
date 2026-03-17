import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

export function useCurrentLocation() {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const loadLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== "granted") {
        setUserLocation(null);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.log("LOCATION ERROR:", error);
      setUserLocation(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setUserLocation(null);
        return;
      }

      await loadLocation();
    };

    init();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadLocation(); // 🔥 설정 갔다 돌아오면 다시 읽음
      }
    });

    return () => subscription.remove();
  }, []);

  return userLocation;
}
