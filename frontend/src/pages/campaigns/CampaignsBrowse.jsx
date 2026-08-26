/**
 * CampaignsBrowse — the Campaigns landing page.
 *
 * Every authenticated role can browse (household, organization, collector).
 * Status tabs (All/Active/Upcoming/Completed) + search + category/city
 * filters all run against the real API — never a hardcoded array filtered
 * client-side.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CAMPAIGN_STATUS_TABS, EMPTY_CAMPAIGN_FILTERS } from "@/config/campaigns";

import PageContainer from "@/components/common/PageContainer";
import ErrorState from "@/components/common/ErrorState";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignHeader from "@/components/campaigns/CampaignHeader";
import CampaignFilters from "@/components/campaigns/CampaignFilters";
import CampaignGrid from "@/components/campaigns/CampaignGrid";

const CampaignsBrowse = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState(EMPTY_CAMPAIGN_FILTERS);
  const search = useDebouncedValue(searchInput, 350);

  const queryFilters = useMemo(
    () => ({
      status: tab,
      search: search.trim() || undefined,
      campaignType: filters.campaignType,
      category: filters.category,
      city: filters.city?.trim() || undefined,
      sort: filters.sort,
    }),
    [tab, search, filters]
  );

  const { campaigns, pagination, loading, error, refetch } = useCampaigns(queryFilters);

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <CampaignHeader
        description="Collection drives run by NGOs, schools and universities near you."
        showCreateAction
        showMineLink
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search campaigns by name or city"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
          aria-label="Search campaigns"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="w-max min-w-full sm:w-fit sm:min-w-0">
              {CAMPAIGN_STATUS_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <CampaignFilters filters={filters} onChange={setFilters} />
        </div>

        {CAMPAIGN_STATUS_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-5 space-y-3">
            {error ? (
              <ErrorState title="Unable to load campaigns" description={error} onRetry={refetch} />
            ) : (
              <>
                {!loading && (
                  <p className="text-sm text-muted-foreground">
                    {pagination.total} {pagination.total === 1 ? "campaign" : "campaigns"} found
                  </p>
                )}
                <CampaignGrid
                  campaigns={campaigns}
                  loading={loading}
                  emptyTitle={t.value === "all" ? "No campaigns yet" : `No ${t.label.toLowerCase()} campaigns`}
                  emptyDescription={
                    role === "organization"
                      ? "Start a collection drive to rally your community around a goal."
                      : "Check back soon, or try a different filter."
                  }
                  emptyAction={
                    role === "organization" ? { label: "Create a campaign", onClick: () => navigate("/campaigns/new") } : undefined
                  }
                />
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </PageContainer>
  );
};

export default CampaignsBrowse;
