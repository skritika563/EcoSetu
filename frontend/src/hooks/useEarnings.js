/**
 * useEarnings — a collector's income/payout/net figures over a rolling
 * window of months. Built on the shared useAsyncResource hook.
 */
import { useCallback, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as earningsService from "@/services/earningsService";

export const useEarnings = (initialMonths = 6) => {
  const [months, setMonths] = useState(initialMonths);
  const fetcher = useCallback(() => earningsService.getEarnings(months), [months]);
  const resource = useAsyncResource(fetcher, { initialData: null });
  return { ...resource, months, setMonths };
};

export default useEarnings;
