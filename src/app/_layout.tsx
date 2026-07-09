import NetInfo from "@react-native-community/netinfo";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { syncPendingQueue } from "../../lib/syncQueue";
import { useAuthStore } from "../../stores/authStore";

export default function RootLayout() {
  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    // Try sync on app start
    syncPendingQueue();

    // Listen for when device comes back online
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        console.log("[Network] Back online — retrying sync...");
        syncPendingQueue();
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
