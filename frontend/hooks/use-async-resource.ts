"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ReloadOptions = {
  force?: boolean;
};

type AsyncResourceOptions = {
  cacheKey?: string;
  staleTimeMs?: number;
  keepPreviousData?: boolean;
};

const resourceCache = new Map<string, { data: unknown; timestamp: number }>();
const inflightCache = new Map<string, Promise<unknown>>();

function getFreshCacheEntry<T>(cacheKey?: string, staleTimeMs = 0): T | null {
  if (!cacheKey) {
    return null;
  }

  const cached = resourceCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (staleTimeMs > 0 && Date.now() - cached.timestamp > staleTimeMs) {
    return null;
  }

  return cached.data as T;
}

export function useAsyncResource<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList,
  enabled = true,
  options: AsyncResourceOptions = {},
) {
  const { cacheKey, staleTimeMs = 0, keepPreviousData = true } = options;
  const initialCache = getFreshCacheEntry<T>(cacheKey, staleTimeMs);
  const [data, setData] = useState<T | null>(initialCache);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(enabled && initialCache === null);
  const loaderRef = useRef(loader);
  const dataRef = useRef<T | null>(initialCache);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const reload = useCallback(async (reloadOptions?: ReloadOptions) => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      setData(null);
      return null;
    }

    const force = reloadOptions?.force ?? false;
    const cached = !force ? getFreshCacheEntry<T>(cacheKey, staleTimeMs) : null;
    if (cached !== null) {
      setData(cached);
      setError(null);
      setLoading(false);
      return cached;
    }

    const inflight = !force && cacheKey ? inflightCache.get(cacheKey) : null;
    if (inflight) {
      setLoading(dataRef.current === null);
      try {
        const result = (await inflight) as T;
        setData(result);
        setError(null);
        return result;
      } catch (err) {
        setError(err);
        if (!keepPreviousData) {
          setData(null);
        }
        return null;
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    setError(null);
    if (!keepPreviousData) {
      setData(null);
    }

    const request = loaderRef.current().then((result) => {
      if (cacheKey) {
        resourceCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }
      return result;
    });

    if (cacheKey) {
      inflightCache.set(cacheKey, request);
    }

    try {
      const result = await request;
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      if (!keepPreviousData) {
        setData(null);
      }
      return null;
    } finally {
      if (cacheKey) {
        inflightCache.delete(cacheKey);
      }
      setLoading(false);
    }
  }, [cacheKey, enabled, keepPreviousData, staleTimeMs]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }

    void reload();
  }, [enabled, reload, ...deps]);

  return {
    data,
    error,
    loading,
    reload,
    setData,
  };
}
