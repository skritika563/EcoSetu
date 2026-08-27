/**
 * AdminUserDetails — view full user profile, role-specific metrics, and manage user status/role.
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import * as adminService from "@/services/adminService";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

const AdminUserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [roleStats, setRoleStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  // Action states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedOrgType, setSelectedOrgType] = useState("ngo");

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getUserDetails(id);
      setUserData(res.user);
      setRoleStats(res.roleStats);
      setRecentActivity(res.recentActivity || []);
      setSelectedRole(res.user.role);
      if (res.user.organizationType) setSelectedOrgType(res.user.organizationType);
    } catch (err) {
      setError(err.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleToggleStatus = async () => {
    try {
      setActionLoading(true);
      const nextStatus = !userData.isActive;
      await adminService.updateUserStatus(id, nextStatus);
      setUserData((prev) => ({ ...prev, isActive: nextStatus }));
      setStatusDialogOpen(false);
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    try {
      setActionLoading(true);
      const orgTypeParam = selectedRole === "organization" ? selectedOrgType : null;
      await adminService.updateUserRole(id, selectedRole, orgTypeParam);
      setUserData((prev) => ({
        ...prev,
        role: selectedRole,
        organizationType: orgTypeParam,
      }));
      setRoleDialogOpen(false);
      loadUser();
    } catch (err) {
      alert(err.message || "Failed to update role");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setActionLoading(true);
      await adminService.deleteUser(id);
      setDeleteDialogOpen(false);
      navigate("/admin/users");
    } catch (err) {
      alert(err.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 rounded-xl md:col-span-1" />
          <Skeleton className="h-64 rounded-xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertCircle className="mb-2 h-6 w-6" />
          <p className="font-semibold">{error || "User not found"}</p>
        </div>
      </div>
    );
  }

  const isSelf = currentAdmin?._id === userData._id || currentAdmin?.id === userData.id;

  const initials = userData.name
    ? userData.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <div className="space-y-6">
      {/* Header & Back */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Button>
        {!isSelf && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={userData.isActive ? "outline" : "default"}
              size="sm"
              onClick={() => setStatusDialogOpen(true)}
            >
              {userData.isActive ? (
                <>
                  <XCircle className="mr-1.5 h-4 w-4 text-amber-500" /> Deactivate Account
                </>
              ) : (
                <>
                  <CheckCircle className="mr-1.5 h-4 w-4 text-emerald-500" /> Activate Account
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={() => setRoleDialogOpen(true)}>
              <Shield className="mr-1.5 h-4 w-4" /> Change Role
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Deactivate (Soft Delete)
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Profile Card */}
        <div className="space-y-6 rounded-xl border border-border/60 bg-card p-6 shadow-sm md:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={userData.profileImage} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-3 font-heading text-lg font-bold text-foreground">{userData.name}</h2>
            <p className="text-sm text-muted-foreground">{userData.email}</p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge variant="outline" className="capitalize">
                {userData.role}
                {userData.organizationType ? ` (${userData.organizationType})` : ""}
              </Badge>
              <StatusBadge status={userData.isActive ? "active" : "inactive"} />
            </div>
          </div>

          <div className="space-y-3 border-t border-border/40 pt-4 text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" />
              <span className="truncate text-foreground">{userData.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-foreground">{userData.phone || "Not provided"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-foreground">{userData.location || "Not specified"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-foreground">
                Joined {userData.createdAt ? format(new Date(userData.createdAt), "MMM d, yyyy") : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Role Metrics & Activity */}
        <div className="space-y-6 md:col-span-2">
          {/* Role Stats Box */}
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-heading text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Platform Contributions & Metrics
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-muted/40 p-3.5">
                <p className="text-xs font-medium uppercase text-muted-foreground">Eco Points</p>
                <p className="mt-1 font-heading text-xl font-bold text-foreground">
                  {userData.ecoPoints?.toLocaleString() ?? 0}
                </p>
              </div>

              {roleStats && Object.entries(roleStats).map(([key, val]) => (
                <div key={key} className="rounded-lg bg-muted/40 p-3.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="mt-1 font-heading text-xl font-bold text-foreground">
                    {typeof val === "number" ? val.toLocaleString() : val}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-heading text-base font-semibold text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Recent Pickups & Activity
            </h3>

            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent pickup activity for this user.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => navigate(`/admin/pickups/${act.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-border/40 p-3 transition hover:bg-muted/30"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Pickup ID: <span className="font-mono text-xs text-muted-foreground">{act.id}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {act.date ? format(new Date(act.date), "PPP p") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {act.amount !== undefined && (
                        <span className="text-sm font-semibold text-foreground">
                          ₹{act.amount}
                        </span>
                      )}
                      <StatusBadge status={act.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title={userData.isActive ? "Deactivate User" : "Activate User"}
        description={`Are you sure you want to ${
          userData.isActive ? "deactivate" : "activate"
        } ${userData.name}? ${
          userData.isActive
            ? "They will no longer be able to log in or perform actions on the platform."
            : "They will regain access to their account."
        }`}
        confirmLabel={userData.isActive ? "Deactivate" : "Activate"}
        variant={userData.isActive ? "destructive" : "default"}
        loading={actionLoading}
        onConfirm={handleToggleStatus}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Soft Delete User"
        description={`Are you sure you want to delete ${userData.name}? This will mark their profile as inactive.`}
        confirmLabel="Deactivate Account"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleDeleteUser}
      />

      {/* Role Change Modal */}
      {roleDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="font-heading text-lg font-semibold text-foreground">Change User Role</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a new role for {userData.name}.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="household">Household</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="collector">Scrap Collector</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole === "organization" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Organization Type
                  </label>
                  <Select value={selectedOrgType} onValueChange={setSelectedOrgType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ngo">NGO</SelectItem>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="university">University</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRoleDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={actionLoading}>
                {actionLoading ? "Updating…" : "Save Role"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDetails;
