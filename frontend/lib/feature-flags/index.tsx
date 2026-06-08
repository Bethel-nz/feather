import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
  type ReactElement,
} from "react";

type EvaluateResult = { enabled: boolean; reason: string };

type FeatureFlagContextValue = {
  contextKey: string;
  evaluate: (flagKey: string, contextKey: string) => Promise<EvaluateResult>;
  version: number;
  refresh: () => Promise<void>;
};

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

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
  const [version, setVersion] = useState(0);
  const refresh = useCallback(async () => {
    setVersion((v) => v + 1);
  }, []);

  const evaluate = useCallback(
    async (flagKey: string, ctxKey: string): Promise<EvaluateResult> => {
      const res = await fetch(`${serverUrl}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sdkKey ? { Authorization: `Bearer ${sdkKey}` } : {}),
        },
        body: JSON.stringify({ key: flagKey, context_key: ctxKey }),
      });
      if (!res.ok) throw new Error(`evaluate failed: ${res.status}`);
      return res.json();
    },
    [serverUrl, sdkKey],
  );

  const value = useMemo<FeatureFlagContextValue>(
    () => ({ contextKey, evaluate, version, refresh }),
    [contextKey, evaluate, version, refresh],
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

  const [isLoading, setIsLoading] = useState(true);
  const [enabled, setEnabled] = useState(options.defaultValue);
  const [reason, setReason] = useState("loading...");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);

    ctx.evaluate(flagKey, ctx.contextKey).then(
      (res) => {
        if (!mountedRef.current) return;
        setEnabled(res.enabled);
        setReason(res.reason);
        setIsLoading(false);
      },
      () => {
        if (!mountedRef.current) return;
        setEnabled(options.defaultValue);
        setReason("feature-flags offline, using default");
        setIsLoading(false);
      },
    );

    return () => { mountedRef.current = false; };
  }, [flagKey, ctx.contextKey, ctx.version, options.defaultValue, ctx.evaluate]);

  const render = useCallback(
    (whenOn: ReactElement, whenOff?: ReactElement) => (enabled ? whenOn : whenOff ?? null),
    [enabled],
  );

  return {
    isLoading,
    enabled,
    reason,
    render,
    refresh: ctx.refresh,
    contextKey: ctx.contextKey,
  };
}
