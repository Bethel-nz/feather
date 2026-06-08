import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
  type ReactElement,
} from "react";
import { useQuery } from "@tanstack/react-query";

type FeatureFlagContextValue = {
  contextKey: string;
  features: Set<string>;
  isLoading: boolean;
  offline: boolean;
};

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

async function fetchFeatures(
  serverUrl: string,
  contextKey: string,
  sdkKey?: string,
): Promise<Set<string>> {
  const url = `${serverUrl}/features?context_key=${encodeURIComponent(contextKey)}`;
  const res = await fetch(url, {
    headers: sdkKey ? { Authorization: `Bearer ${sdkKey}` } : {},
  });
  if (!res.ok) throw new Error(`features failed: ${res.status}`);
  const data = (await res.json()) as { features: string[] };
  return new Set(data.features ?? []);
}

export function FeatureFlagProvider({
  serverUrl,
  contextKey,
  sdkKey,
  children,
}: {
  serverUrl: string;
  contextKey: string;
  sdkKey?: string;
  children: ReactNode;
}) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["features", serverUrl, contextKey, sdkKey],
    queryFn: () => fetchFeatures(serverUrl, contextKey, sdkKey),
    // Poll so flag changes in the admin show up automatically.
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    // Keep showing the last known features while a refetch is in flight,
    // so the UI never flickers back to "loading" every 3s.
    placeholderData: (prev) => prev,
  });

  const value = useMemo<FeatureFlagContextValue>(
    () => ({
      contextKey,
      features: data ?? new Set<string>(),
      isLoading: isPending,
      offline: isError,
    }),
    [contextKey, data, isPending, isError],
  );

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(
  flagKey: string,
  options: { defaultValue: boolean },
) {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) throw new Error("useFeatureFlag must be used within FeatureFlagProvider");

  const enabled =
    ctx.isLoading || ctx.offline ? options.defaultValue : ctx.features.has(flagKey);

  const reason = ctx.isLoading
    ? "loading..."
    : ctx.offline
      ? "feature-flags offline, using default"
      : enabled
        ? "enabled for this user"
        : "not in rollout for this user";

  const render = (whenOn: ReactElement, whenOff?: ReactElement) =>
    enabled ? whenOn : whenOff ?? null;

  return {
    isLoading: ctx.isLoading,
    enabled,
    reason,
    render,
    contextKey: ctx.contextKey,
  };
}
