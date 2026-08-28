/**
 * useAdminNotifications — fetches recent broadcast history and exposes a
 * `send` mutation that refetches history on success. Built on useAsyncResource.
 */
import { useCallback } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

export const useAdminNotifications = () => {
  const historyFetcher = useCallback(() => adminService.listNotifications({ limit: 20 }), []);
  const history = useAsyncResource(historyFetcher, { initialData: { notifications: [] } });

  const send = useCallback(
    async (payload) => {
      const res = await adminService.sendNotification(payload);
      history.refetch();
      return res;
    },
    [history]
  );

  return { history, send };
};

export default useAdminNotifications;
