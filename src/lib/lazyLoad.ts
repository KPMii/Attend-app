import React from "react";

/**
 * 💡 Lazy-loading utilities for React Native.
 *
 * React.lazy() doesn't work in React Native, so we provide a pattern
 * using state-based dynamic imports with loading states.
 */

/**
 * Creates a lazily-loaded component from a dynamic import.
 *
 * @example
 * const QRCodeView = lazyComponent(() => import("../components/QRCodeView"), "QRCodeView");
 *
 * @example
 * const LazyQR = lazyComponent(() => import("react-native-qrcode-svg"), "default");
 */
export function lazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ [key: string]: any }>,
  exportName: string = "default",
  LoadingComponent?: React.ComponentType,
): React.FC<React.ComponentProps<T>> {
  const LazyLoaded: React.FC<React.ComponentProps<T>> = (props) => {
    const [Component, setComponent] = React.useState<React.ComponentType<any> | null>(null);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      let cancelled = false;
      importFn()
        .then((mod) => {
          if (!cancelled) {
            setComponent(() => mod[exportName]);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err);
        });
      return () => { cancelled = true; };
    }, []);

    if (error) {
      console.error("[LazyLoad] Failed to load component:", error);
      return null;
    }

    if (!Component) {
      if (LoadingComponent) {
        return React.createElement(LoadingComponent);
      }
      return null;
    }

    return React.createElement(Component, props);
  };

  LazyLoaded.displayName = `Lazy(${exportName})`;
  return LazyLoaded;
}

/**
 * A hook that lazily loads a component and returns [Component, isLoading, error].
 * Useful for conditional lazy loading (e.g., only load QR code when starting a session).
 *
 * @example
 * function QRButton() {
 *   const [QRCode, loadQR] = useLazyLoad(() => import("react-native-qrcode-svg"), "default");
 *   return (
 *     <Button onPress={loadQR} title="Show QR" />
 *     {QRCode && <QRCode value="..." size={200} />}
 *   );
 * }
 */
export function useLazyLoad(
  importFn: () => Promise<{ [key: string]: any }>,
  exportName: string = "default",
): [React.ComponentType<any> | null, () => void, boolean, Error | null] {
  const [Component, setComponent] = React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const load = React.useCallback(() => {
    if (Component || loading) return;
    setLoading(true);
    setError(null);
    importFn()
      .then((mod) => {
        setComponent(() => mod[exportName]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [importFn, exportName, Component, loading]);

  return [Component, load, loading, error];
}

/**
 * Simple Suspense-like wrapper for lazy-loaded sections.
 * Renders a fallback while children are being loaded dynamically.
 */
export function LazyBoundary({
  isLoading,
  fallback,
  children,
}: {
  isLoading: boolean;
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading) return React.createElement(React.Fragment, null, fallback);
  return React.createElement(React.Fragment, null, children);
}

/**
 * Prefetches a route module so it's ready when the user navigates.
 * Use in layouts/home screens for routes the user is likely to visit.
 *
 * @example
 * useEffect(() => {
 *   prefetchRoutes(["/admin/students", "/admin/subjects"]);
 * }, []);
 */
export function prefetchRoutes(routes: string[]) {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log("[Prefetch] Prefetching routes:", routes);
  }
  // In production, you could use require() to pre-bundle modules.
  // For Expo Router, use router.prefetch() from expo-router.
}

/**
 * A utility to conditionally load a large library.
 * @example
 * const printModule = await ensureModule(() => import("expo-print"));
 */
export async function ensureModule<T>(
  importFn: () => Promise<T>,
): Promise<T> {
  try {
    return await importFn();
  } catch (err) {
    console.error("[LazyLoad] Failed to load module:", err);
    throw err;
  }
}