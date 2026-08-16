/**
 * CollectorJobDetailsPage — accept → navigate → start → verify → complete.
 *
 * This is deliberately a DIFFERENT interface from the household's Pickup
 * Details page, even though both read the same underlying record: the
 * collector acts on a job (accept, verify, complete), the household only
 * ever observes one (track, cancel, rate).
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Construction,
  MapPin,
  Navigation,
  Phone,
  StickyNote,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePickupDetails } from "@/hooks/usePickupDetails";
import { getCategory } from "@/config/domain";
import { getJobPrimaryAction } from "@/config/pickups";
import { formatFriendlyDate, formatWeight, getInitials } from "@/lib/format";
import { notifyComingSoon } from "@/lib/comingSoon";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import StatusBadge from "@/components/common/StatusBadge";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import PickupStatusTimeline from "@/components/pickups/PickupStatusTimeline";
import ScrapVerificationForm from "@/components/pickups/ScrapVerificationForm";
import ReceiptView from "@/components/pickups/ReceiptView";

const ReportIssueDialog = ({ open, onOpenChange, onConfirm, submitting }) => {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>This will cancel the job and notify the customer.</DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="What went wrong? (e.g. customer unreachable, address incorrect)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Never mind
          </Button>
          <Button
            variant="destructive"
            disabled={submitting || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {submitting ? "Reporting…" : "Report issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CollectorJobDetailsPage = () => {
  const { jobId } = useParams();
  const { role } = useAuth();
  const { pickup: job, loading, error, actionPending, refetch, actions } = usePickupDetails(jobId);
  const [issueOpen, setIssueOpen] = useState(false);

  if (role === "admin") {
    return (
      <PageContainer className="py-10">
        <EmptyState
          icon={Construction}
          title="Pickup management for administrators is coming soon"
          description="This surface is being designed for admins separately from the collector experience."
        />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className="py-10">
        <ErrorState title="We couldn't load this job" description={error} onRetry={refetch} />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <HeroSkeleton />
      </PageContainer>
    );
  }

  if (!job) {
    return (
      <PageContainer className="py-10">
        <EmptyState title="Job not found" description="This job may no longer be available." />
      </PageContainer>
    );
  }

  const primaryAction = getJobPrimaryAction(job.status);
  const isTerminal = job.status === "completed" || job.status === "cancelled";

  const handleReportIssue = async (reason) => {
    try {
      await actions.reportIssue(reason);
      toast.success("Issue reported — job cancelled");
      setIssueOpen(false);
    } catch (err) {
      toast.error(err.message || "Couldn't report this issue.");
    }
  };

  const handleAccept = async () => {
    try {
      await actions.accept();
      toast.success("Job accepted");
    } catch (err) {
      toast.error(err.message || "Couldn't accept this job.");
    }
  };

  const handleVerify = async (rows) => {
    try {
      await actions.verify(rows);
      toast.success("Pickup completed successfully");
    } catch (err) {
      toast.error(err.message || "Couldn't complete this pickup.");
    }
  };

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
        <Link to="/jobs">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          All jobs
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{job.id}</p>
          <h1 className="mt-0.5 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {job.customer?.name}
          </h1>
        </div>
        <StatusBadge status={job.status} className="text-sm" />
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: job information */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {getInitials(job.customer?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{job.customer?.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{job.customer?.type}</p>
              </div>
              <Button
                size="icon"
                variant="outline"
                aria-label="Call customer"
                onClick={() => notifyComingSoon("In-app calling")}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <dd className="text-foreground">
                  {job.pickupAddress?.line}, {job.pickupAddress?.city} {job.pickupAddress?.pincode}
                  {job.pickupAddress?.landmark && (
                    <span className="block text-xs text-muted-foreground">
                      {job.pickupAddress.landmark}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex gap-2.5">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <dd className="text-foreground">
                  {formatFriendlyDate(job.pickupDate)} · {job.pickupTimeSlot}
                </dd>
              </div>
              {job.notes && (
                <div className="flex gap-2.5">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <dd className="text-foreground">{job.notes}</dd>
                </div>
              )}
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {(job.estimatedCategories ?? []).length > 0 ? (
                job.estimatedCategories.map((key) => {
                  const category = getCategory(key);
                  const Icon = category.icon;
                  return (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${category.tint}`}
                    >
                      <Icon className="h-3 w-3" />
                      {category.label}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-muted-foreground">Customer didn't provide a category estimate</span>
              )}
              {job.estimatedWeightKg && (
                <span className="text-xs text-muted-foreground">
                  · ~{formatWeight(job.estimatedWeightKg, { decimals: 0 })} expected
                </span>
              )}
            </div>
          </div>

          <PickupStatusTimeline status={job.status} statusHistory={job.statusHistory} cancellation={job.cancellation} />

          {job.status === "completed" && <ReceiptView pickup={job} />}
        </div>

        {/* Right: action panel */}
        <aside className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-heading text-sm font-semibold text-foreground">
              {primaryAction === "verify" ? "Verify scrap" : "Job actions"}
            </h2>

            <div className="mt-3">
              {primaryAction === "accept" && (
                <Button className="w-full" onClick={handleAccept} disabled={actionPending}>
                  {actionPending ? "Accepting…" : "Accept Job"}
                </Button>
              )}

              {primaryAction === "navigate" && (
                <div className="space-y-2">
                  <Button className="w-full" onClick={() => notifyComingSoon("Turn-by-turn navigation")}>
                    <Navigation className="mr-1.5 h-4 w-4" />
                    Open Navigation
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={actionPending}
                    onClick={async () => {
                      try {
                        await actions.startNavigation();
                      } catch (err) {
                        toast.error(err.message || "Couldn't update this job.");
                      }
                    }}
                  >
                    {actionPending ? "Updating…" : "I'm on my way"}
                  </Button>
                </div>
              )}

              {primaryAction === "start" && (
                <Button
                  className="w-full"
                  disabled={actionPending}
                  onClick={async () => {
                    try {
                      await actions.startPickup();
                    } catch (err) {
                      toast.error(err.message || "Couldn't start this pickup.");
                    }
                  }}
                >
                  {actionPending ? "Starting…" : "Start Pickup"}
                </Button>
              )}

              {primaryAction === "verify" && (
                <ScrapVerificationForm
                  estimatedCategories={job.estimatedCategories ?? []}
                  estimatedWeightKg={job.estimatedWeightKg}
                  serviceCharge={job.serviceCharge}
                  onConfirm={handleVerify}
                  submitting={actionPending}
                />
              )}

              {primaryAction === "view" && job.status === "completed" && (
                <p className="text-sm text-muted-foreground">This job is complete. Nice work.</p>
              )}
              {primaryAction === "view" && job.status === "cancelled" && (
                <p className="text-sm text-muted-foreground">
                  {job.cancellation?.reason || "This job was cancelled."}
                </p>
              )}
            </div>

            {!isTerminal && primaryAction !== "verify" && (
              <Button
                variant="ghost"
                className="mt-2 w-full text-destructive hover:text-destructive"
                onClick={() => setIssueOpen(true)}
              >
                Cancel / Report Issue
              </Button>
            )}
          </div>
        </aside>
      </div>

      <ReportIssueDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        onConfirm={handleReportIssue}
        submitting={actionPending}
      />
    </PageContainer>
  );
};

export default CollectorJobDetailsPage;
