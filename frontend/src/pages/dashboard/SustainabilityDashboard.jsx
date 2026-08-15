/**
 * SustainabilityDashboard — the impact detail surface, reachable from the
 * profile menu.
 *
 * Home answers "what matters right now?"; this page answers "what have I
 * achieved?". The headline impact metrics live here rather than on Home so the
 * dashboard stays action-focused.
 *
 * Available to every signed-in role — collectors see their own collection
 * impact alongside households and organizations.
 */

import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { getOrganizationLabel } from "@/config/domain";

import PageContainer from "@/components/common/PageContainer";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { StatsSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import ImpactSummary from "@/components/home/ImpactSummary";
import { Leaf } from "lucide-react";

const SustainabilityDashboard = () => {
  const { user, role } = useAuth();
  const { data, loading, error, refetch } = useDashboardData();

  const isOrganization = role === "organization";
  const orgLabel = getOrganizationLabel(user?.organizationType);

  const subtitle = isOrganization
    ? `The environmental impact your ${orgLabel.sentenceNoun} has made through EcoSetu.`
    : role === "collector"
      ? "The environmental impact of everything you've collected."
      : "The environmental impact of everything you've recycled.";

  return (
    <PageContainer className="space-y-8 py-6 sm:py-8">
      <header className="min-w-0">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 mb-2 h-8 text-muted-foreground hover:text-foreground"
        >
          <Link to="/">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Home
          </Link>
        </Button>

        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Sustainability dashboard
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </header>

      {error ? (
        <ErrorState
          title="We couldn't load your impact"
          description={error}
          onRetry={refetch}
        />
      ) : loading ? (
        <StatsSkeleton />
      ) : data?.impact ? (
        <ImpactSummary impact={data.impact} isOrganization={isOrganization} />
      ) : (
        <EmptyState
          icon={Leaf}
          title="No impact recorded yet"
          description="Complete your first pickup and your recycling impact will start showing up here."
        />
      )}
    </PageContainer>
  );
};

export default SustainabilityDashboard;
