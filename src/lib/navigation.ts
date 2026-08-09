import { router } from "expo-router";
import { logout } from "./auth";

/**
 * Centralized logout that clears the entire navigation stack.
 * Prevents the bug where pressing back after logout returns to
 * an authenticated screen (faculty home, admin, student, etc).
 */
export async function logoutAndRedirect() {
  await logout();
  // Clear every screen from the navigation stack so the back
  // button cannot navigate back into authenticated areas.
  try {
    router.dismissAll();
  } catch {
    // dismissAll may no-op if there's nothing to dismiss
  }
  router.replace("/");
}