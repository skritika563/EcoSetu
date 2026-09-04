/**
 * useAddresses — the signed-in user's saved pickup addresses.
 *
 * Backed by /api/addresses (services/addressService.js). Replaces the
 * synchronous mock list from data/pickupData.js that BookPickupPage used to
 * seed its address step from directly.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import * as addressService from "@/services/addressService";

export const useAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await addressService.getAddresses();
      if (requestRef.current !== requestId) return;
      setAddresses(result);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      console.error("Failed to load addresses:", err);
      setError(err.message || "Failed to load your saved addresses.");
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  const addAddress = useCallback(async (address) => {
    const created = await addressService.createAddress(address);
    setAddresses((prev) => [...prev, created]);
    return created;
  }, []);

  const updateAddress = useCallback(async (id, patch) => {
    const updated = await addressService.updateAddress(id, patch);
    setAddresses((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }, []);

  return { addresses, loading, error, addAddress, updateAddress, refetch: load };
};

export default useAddresses;
