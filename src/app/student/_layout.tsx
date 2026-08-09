import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../../../stores/authStore";

export default function StudentLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const loading = useAuthStore((s) => s.loading);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading || hasRedirected.current) return;
    if (!role) return;

    // Student council officers are still students, so they may use the
    // QR scanner to record their own attendance in class & event sessions.
    const isScannerRoute =
      pathname === "/student/scanner/QRScanner" ||
      pathname === "/student/debug-scan";

    if (
      role !== "student" &&
      !(role === "student_council_officer" && isScannerRoute)
    ) {
      hasRedirected.current = true;
      if (role === "student_council_officer") {
        router.replace("/faculty/student-council");
      } else if (role === "admin") {
        router.replace("/admin");
      } else if (role === "faculty") {
        router.replace("/faculty");
      }
    }
  }, [role, loading, pathname]);

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
