/**
 * useAdminUserDetails — fetches one user's full admin profile (user record,
 * role-specific stats, recent activity) and exposes status/role/delete
 * mutations that patch local state on success. Built on useAsyncResource.
 */
import { useCallback } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

export const useAdminUserDetails = (id) => {
  const fetcher = useCallback(() => adminService.getUserDetails(id), [id]);
  const resource = useAsyncResource(fetcher, { initialData: null, enabled: !!id });

  const toggleStatus = useCallback(
    async (nextIsActive) => {
      await adminService.updateUserStatus(id, nextIsActive);
      resource.applyData((prev) => ({ ...prev, user: { ...prev.user, isActive: nextIsActive } }));
    },
    [id, resource]
  );

  const updateRole = useCallback(
    async (role, organizationType) => {
      await adminService.updateUserRole(id, role, organizationType);
      // Role-specific stats depend on the (now different) role, so a full
      // refetch is needed rather than a local patch.
      await resource.refetch();
    },
    [id, resource]
  );

  const deleteUser = useCallback(async () => {
    await adminService.deleteUser(id);
  }, [id]);

  return { ...resource, toggleStatus, updateRole, deleteUser };
};

export default useAdminUserDetails;
