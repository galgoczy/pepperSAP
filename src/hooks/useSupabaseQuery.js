import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isAuthError, emitAuthError } from '../lib/supabase';

/**
 * Custom hook for Supabase queries with auth error handling and timeout
 * @param {Function} queryFn - Function that returns a Supabase query promise
 * @param {Array} deps - Dependencies array for re-running the query
 * @param {Object} options - Options like enabled, timeout
 */
export function useSupabaseQuery(queryFn, deps = [], options = {}) {
  const { enabled = true, timeout = 15000 } = options;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const abortRef = useRef(false);

  const execute = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    abortRef.current = false;
    setLoading(true);
    setError(null);

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeout);
      });

      // Race between query and timeout
      const result = await Promise.race([queryFn(), timeoutPromise]);

      if (abortRef.current) return;

      if (result.error) {
        // Check if it's an auth error
        if (isAuthError(result.error)) {
          emitAuthError(result.error);
        }
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      if (abortRef.current) return;

      if (isAuthError(err)) {
        emitAuthError(err);
      }
      setError(err);
      setData(null);
    } finally {
      if (!abortRef.current) {
        setLoading(false);
      }
    }
  }, [queryFn, enabled, timeout]);

  useEffect(() => {
    execute();
    return () => {
      abortRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, execute]);

  return {
    data,
    error,
    loading,
    refetch: execute,
  };
}

/**
 * Wrapper for Supabase mutations with auth error handling
 */
export async function safeSupabaseMutation(mutationFn) {
  try {
    const result = await Promise.race([
      mutationFn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Mutation timeout')), 30000)
      ),
    ]);

    if (result.error) {
      if (isAuthError(result.error)) {
        emitAuthError(result.error);
      }
      throw result.error;
    }

    return result.data;
  } catch (error) {
    if (isAuthError(error)) {
      emitAuthError(error);
    }
    throw error;
  }
}

export { supabase };
