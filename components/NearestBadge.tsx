import type { Store } from "@/types/store";
import { Pressable, StyleSheet, Text } from "react-native";

type NearestBadgeProps = {
  nearestStore: {
    store: Store;
    distance: number;
  } | null;
  onPress: () => void;
};

export function NearestBadge({ nearestStore, onPress }: NearestBadgeProps) {
  if (!nearestStore) return null;

  return (
    <Pressable style={styles.nearestBadge} onPress={onPress}>
      <Text style={styles.nearestText}>
        내 주변 추천: {nearestStore.store.name}
      </Text>
      <Text style={styles.nearestDistance}>
        {nearestStore.distance < 1000
          ? `약 ${Math.round(nearestStore.distance)}m 거리`
          : `약 ${(nearestStore.distance / 1000).toFixed(1)}km 거리`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nearestBadge: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    borderColor: "#FFB8C2",
    borderWidth: 1,
    backgroundColor: "#FFE4E6",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  nearestText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
  },
  nearestDistance: {
    marginTop: 4,
    fontSize: 13,
    color: "#666666",
  },
});
