import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../../../stores/authStore";

export default function StudentLayout() {
  const loading = useAuthStore((s) => s.loading);

  // Show a loading spinner while the auth store is hydrating
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0D0D0D",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#C8F04D" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 300,
      }}
    />
  );
}
