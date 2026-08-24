import NetInfo from "@react-native-community/netinfo";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { syncPendingQueue } from "../lib/syncQueue";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

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

  if (!fontsLoaded) {
    return null;
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
