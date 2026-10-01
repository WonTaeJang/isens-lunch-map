'use client';

import { useEffect, useState } from 'react';
import type { AdminStatistics } from './statistics-model';
import { loadAdminStatistics } from './admin-api';

export default function useAdminStatistics(password: string) {
  const [data, setData] = useState<AdminStatistics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await loadAdminStatistics(password, controller.signal);
        if (!controller.signal.aborted) setData(result);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '통계를 불러오지 못했습니다.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [password, revision]);
  return { data, error, loading, reload: () => setRevision((value) => value + 1) };
}
