import NetInfo from "@react-native-community/netinfo";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { syncPendingQueue } from "../lib/syncQueue";
import { useAuthStore } from "../../stores/authStore";

export default function RootLayout() {
  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    syncPendingQueue();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        console.log("[Network] Back online - retrying sync...");
        syncPendingQueue();
      }
    });

    return () => unsubscribe();
  }, []);

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