import { router } from "expo-router";
import { logout } from "./auth";

export async function logoutAndRedirect() {
  await logout();
  try {
    router.dismissAll();
  } catch {
  }
  router.replace("/");
}