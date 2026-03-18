import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF5A5F",
        tabBarInactiveTintColor: "#999999",
        tabBarStyle: {
          height: 66 + Math.max(insets.bottom, 8),
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarItemStyle: {
          paddingVertical: 3,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "지도",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size ?? 24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: "즐겨찾기",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size ?? 24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="mypage"
        options={{
          title: "내정보",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size ?? 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
