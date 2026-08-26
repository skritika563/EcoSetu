/**
 * CampaignFormPage — create (/campaigns/new) and edit (/campaigns/:id/edit).
 * Mirrors pages/marketplace/ListingFormPage.jsx exactly, including its
 * partial-failure handling: if the campaign is created but its banner fails
 * to upload, the campaign is NOT discarded and the failure is NOT hidden.
 */

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { useCampaign } from "@/hooks/useCampaigns";
import * as campaignService from "@/services/campaignService";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import CampaignForm from "@/components/campaigns/CampaignForm";

const BackLink = ({ isEdit, campaignId }) => (
  <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
    <Link to={isEdit ? `/campaigns/${campaignId}` : "/campaigns/mine"}>
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
      {isEdit ? "Back to campaign" : "My Campaigns"}
    </Link>
  </Button>
);

const CampaignFormPage = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!campaignId;

  const { campaign, loading, error, refetch } = useCampaign(campaignId);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload, bannerFile) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await campaignService.updateCampaign(campaignId, payload);
        toast.success("Campaign updated");
        navigate(`/campaigns/${campaignId}`);
        return;
      }

      const created = await campaignService.createCampaign(payload);

      if (bannerFile) {
        try {
          await campaignService.uploadCampaignBanner(created.id, bannerFile);
        } catch (uploadError) {
          toast.error(
            `Campaign created, but the banner didn't upload: ${uploadError.message}. You can add it from the campaign.`,
            { duration: 8000 }
          );
          navigate(`/campaigns/${created.id}`);
          return;
        }
      }

      toast.success(payload.status === "draft" ? "Draft saved" : "Campaign published");
      navigate(`/campaigns/${created.id}`);
    } catch (err) {
      toast.error(err.message || "Couldn't save this campaign. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && error) {
    return (
      <PageContainer className="py-10">
        <BackLink isEdit={isEdit} campaignId={campaignId} />
        <ErrorState title="We couldn't load this campaign" description={error} onRetry={refetch} className="mt-4" />
      </PageContainer>
    );
  }

  if (isEdit && loading) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <BackLink isEdit={isEdit} campaignId={campaignId} />
        <HeroSkeleton />
      </PageContainer>
    );
  }

  // The backend returns 404 for a campaign that isn't yours, so a
  // non-owner landing on the edit URL lands here rather than an editable form.
  if (isEdit && !campaign) {
    return (
      <PageContainer className="py-10">
        <BackLink isEdit={isEdit} campaignId={campaignId} />
        <EmptyState title="Campaign not found" description="It may have been removed, or it isn't yours to edit." className="mt-4" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <BackLink isEdit={isEdit} campaignId={campaignId} />

      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {isEdit ? "Edit campaign" : "Create a campaign"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit ? "Update the details participants see." : "Rally your community around a collection goal."}
          </p>
        </header>

        <CampaignForm
          campaign={isEdit ? campaign : undefined}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={isEdit ? "Save changes" : "Publish campaign"}
        />
      </div>
    </PageContainer>
  );
};

export default CampaignFormPage;
