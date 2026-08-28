/**
 * AdminUsers — searchable, filterable user management page.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { formatRelativeTime } from "@/lib/format";
import useAdminUsers from "@/hooks/useAdminUsers";
import StatusBadge from "@/components/admin/StatusBadge";
import EmptyState from "@/components/admin/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLE_COLORS = {
  household: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  organization: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  collector: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  admin: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const { data, loading, error, filters, updateFilters, setPage } = useAdminUsers();
  const [searchInput, setSearchInput] = useState("");

  const users = data?.users ?? [];
  const pagination = data?.pagination ?? {};

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage all platform users
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          <Select value={filters.role || "all"} onValueChange={(v) => updateFilters({ role: v === "all" ? "" : v })}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="household">Household</SelectItem>
              <SelectItem value="organization">Organization</SelectItem>
              <SelectItem value="collector">Collector</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.status || "all"} onValueChange={(v) => updateFilters({ status: v === "all" ? "" : v })}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try adjusting your search or filters." />
      ) : (
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden border-b border-border/40 bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[1fr_120px_100px_120px_120px_80px]">
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
            <span>Location</span>
            <span>Joined</span>
            <span className="text-right">Eco Pts</span>
          </div>

          {users.map((user, i) => {
            const initials = user.name
              ? user.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "?";

            return (
              <motion.div
                key={user._id || user.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                onClick={() => navigate(`/admin/users/${user._id || user.id}`)}
                className="grid cursor-pointer items-center gap-3 border-b border-border/30 px-4 py-3 transition-colors hover:bg-muted/20 last:border-b-0 md:grid-cols-[1fr_120px_100px_120px_120px_80px]"
              >
                {/* User info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.profileImage} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <Badge variant="outline" className={cn("border-0 text-[11px] font-semibold", ROLE_COLORS[user.role])}>
                    {user.role === "organization" && user.organizationType
                      ? `${user.organizationType.toUpperCase()}`
                      : user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                  </Badge>
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={user.isActive ? "active" : "inactive"} />
                </div>

                {/* Location */}
                <p className="text-sm text-muted-foreground truncate">
                  {user.location || "—"}
                </p>

                {/* Joined */}
                <p className="text-xs text-muted-foreground">
                  {user.createdAt ? formatRelativeTime(user.createdAt) : "—"}
                </p>

                {/* Eco Points */}
                <p className="text-sm font-medium text-foreground text-right">
                  {user.ecoPoints?.toLocaleString() ?? 0}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
