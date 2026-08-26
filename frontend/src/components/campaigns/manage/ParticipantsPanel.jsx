/**
 * ParticipantsPanel — owner-only list of a campaign's participants OR
 * volunteers (same component, `type` prop picks which). Approve/reject and
 * attendance are simple row actions — no separate "Attendance" screen, per
 * the module spec's "don't overcomplicate it."
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, ClipboardCheck, UserX } from "lucide-react";

import { useCampaignPeople } from "@/hooks/useCampaigns";
import * as campaignService from "@/services/campaignService";
import { getParticipantStatusFilterTabs, getParticipationStatusMeta } from "@/config/campaigns";
import { formatFriendlyDate } from "@/lib/format";

import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PersonRow = ({ person, onApprove, onReject, onToggleAttendance, working }) => {
  const meta = getParticipationStatusMeta(person.status, person.participationType, person.cancelledBy);
  const isWorking = working === person.id;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
      <div className="min-w-0">
        {person.user ? (
          <Link to={`/campaigns/users/${person.user.id}`} className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline">
            {person.user.name}
          </Link>
        ) : (
          <p className="truncate text-sm font-medium text-foreground">Unknown user</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {person.user?.role === "organization" ? person.user.organizationType : person.user?.role} · Registered{" "}
          {formatFriendlyDate(person.registeredAt)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", meta.className)}>{meta.label}</span>

        {person.status === "registered" && (
          <>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onApprove(person)} disabled={isWorking}>
              <Check className="mr-1 h-3 w-3" />
              Approve
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => onReject(person)} disabled={isWorking}>
              <UserX className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </>
        )}

        {(person.status === "approved" || person.status === "attended") && (
          <Button
            size="sm"
            variant={person.status === "attended" ? "outline" : "default"}
            className="h-7 px-2 text-xs"
            onClick={() => onToggleAttendance(person)}
            disabled={isWorking}
          >
            <ClipboardCheck className="mr-1 h-3 w-3" />
            {person.status === "attended" ? "Unmark attended" : "Mark attended"}
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * `onCampaignChanged` — approving/rejecting/marking attendance all shift the
 * OWNER's participantCount/volunteerCount on the campaign document itself
 * (server-side, in campaignController.updateParticipantStatus/
 * markAttendance), but this panel only knows about its own people LIST, not
 * the parent CampaignManagePage's separately-fetched `campaign` object — so
 * without this callback, the Overview tab's stat cards would keep showing
 * whatever counts were true when the page first loaded, stale until a full
 * reload. Re-fetching the campaign (rather than incrementing a local counter
 * here) keeps this panel from ever having to duplicate the server's own
 * approval/counting logic.
 */
const ParticipantsPanel = ({ campaignId, type, onCampaignChanged }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const { people, loading, error, refetch, patchLocal } = useCampaignPeople(campaignId, type, statusFilter === "all" ? undefined : statusFilter);
  const [working, setWorking] = useState(null);

  const handleApprove = async (person) => {
    setWorking(person.id);
    try {
      const updated = await campaignService.updateParticipantStatus(campaignId, person.id, "approved");
      patchLocal(person.id, updated);
      onCampaignChanged?.();
      toast.success("Approved");
    } catch (err) {
      toast.error(err.message || "Couldn't approve this registration.");
    } finally {
      setWorking(null);
    }
  };

  const handleReject = async (person) => {
    setWorking(person.id);
    try {
      const updated = await campaignService.updateParticipantStatus(campaignId, person.id, "cancelled");
      patchLocal(person.id, updated);
      onCampaignChanged?.();
      toast.success("Registration declined");
    } catch (err) {
      toast.error(err.message || "Couldn't decline this registration.");
    } finally {
      setWorking(null);
    }
  };

  const handleToggleAttendance = async (person) => {
    setWorking(person.id);
    try {
      const updated = await campaignService.markAttendance(campaignId, person.id, person.status !== "attended");
      patchLocal(person.id, updated);
      onCampaignChanged?.();
      toast.success(updated.status === "attended" ? "Marked attended" : "Attendance unmarked");
    } catch (err) {
      toast.error(err.message || "Couldn't update attendance.");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-4">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {getParticipantStatusFilterTabs(type).map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error ? (
        <ErrorState title="Unable to load this list" description={error} onRetry={refetch} />
      ) : loading ? (
        <ListSkeleton count={3} />
      ) : people.length === 0 ? (
        <EmptyState title={type === "volunteer" ? "No volunteers yet" : "No participants yet"} className="py-10" />
      ) : (
        <div className="space-y-2.5">
          {people.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              onApprove={handleApprove}
              onReject={handleReject}
              onToggleAttendance={handleToggleAttendance}
              working={working}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantsPanel;
