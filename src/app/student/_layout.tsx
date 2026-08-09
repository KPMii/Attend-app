import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../../../stores/authStore";

export default function StudentLayout() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const loading = useAuthStore((s) => s.loading);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading || hasRedirected.current) return;
    if (!role) return;

    // Any non-student role should be redirected away from student screens
    if (role !== "student") {
      hasRedirected.current = true;
      if (role === "student_council_officer") {
        router.replace("/faculty/student-council");
      } else if (role === "admin") {
        router.replace("/admin");
      } else if (role === "faculty") {
        router.replace("/faculty");
      }
    }
  }, [role, loading]);

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
