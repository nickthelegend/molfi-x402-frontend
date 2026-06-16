import { useState } from 'react';

export function useAdRequest(apiBase: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestSlot = async (
    slotId: string,
    session: string,
    surface: 'frontend' | 'extension'
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}/v1/ads/slot?slotId=${slotId}&session=${session}&surface=${surface}`,
        {
          method: 'POST',
        }
      );
      if (res.status === 204) {
        return null;
      }
      if (!res.ok) {
        throw new Error('Failed to load ad slot');
      }
      return await res.json();
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { requestSlot, loading, error };
}
