"use client";

import { useSyncExternalStore } from "react";
import { getServerState, getState, subscribe, type AppState } from "./store";

/** Subscribe to the whole app state (small, single-user documents). */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

const emptySubscribe = () => () => {};

/**
 * true only on the client after hydration — used to skip SSR HTML for
 * localStorage-backed screens without setState-in-effect churn.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
