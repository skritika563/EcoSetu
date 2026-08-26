/**
 * CertificatePage — view and "download" one campaign certificate.
 *
 * ELIGIBILITY / GENERATION / DOWNLOAD are kept as separate concerns here
 * too, mirroring backend/controllers/certificateController.js exactly:
 *   - Eligibility + generation both happen server-side, the moment this
 *     page's GET request lands (getCertificate is idempotent: real data
 *     back if eligible, a clear reason back if not).
 *   - Download is real: the browser's own print-to-PDF, via window.print()
 *     scoped to just the certificate (everything else carries a `no-print`
 *     class). That's an actual generated file the browser produces, not a
 *     pretend download link — the honest option until a server-side PDF
 *     renderer exists (see certificateController's header comment).
 */

import { useCallback } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Award, Download, ShieldCheck } from "lucide-react";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as campaignService from "@/services/campaignService";
import { formatFriendlyDate } from "@/lib/format";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";

const BackLink = ({ campaignId }) => (
  <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground no-print">
    <Link to={`/campaigns/${campaignId}`}>
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
      Back to campaign
    </Link>
  </Button>
);

const CertificatePage = () => {
  const { campaignId } = useParams();
  const [searchParams] = useSearchParams();
  // `?type=participant|volunteer` disambiguates when the viewer has both
  // kinds of registration on this campaign (see MyParticipationPage, which
  // now shows one card per campaign with a certificate link per role).
  const type = searchParams.get("type");
  const fetcher = useCallback(() => campaignService.getCertificate(campaignId, type), [campaignId, type]);
  const { data: certificate, loading, error } = useAsyncResource(fetcher, {
    enabled: !!campaignId,
    errorMessage: "You aren't eligible for a certificate on this campaign yet.",
  });

  if (loading) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <BackLink campaignId={campaignId} />
        <HeroSkeleton />
      </PageContainer>
    );
  }

  if (error || !certificate) {
    return (
      <PageContainer className="py-10">
        <BackLink campaignId={campaignId} />
        <EmptyState
          icon={Award}
          title="Certificate not available"
          description={error || "You aren't eligible for a certificate on this campaign yet."}
          className="mt-4"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <BackLink campaignId={campaignId} />

      <div className="mx-auto w-full max-w-2xl">
        {/* ── The printable certificate ──────────────────────────────── */}
        <div className="certificate-print-area relative overflow-hidden rounded-2xl border-4 border-double border-primary/40 bg-card p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mt-4 font-heading text-xs font-semibold uppercase tracking-[0.2em] text-primary">EcoSetu</p>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Certificate of Participation</h1>

          <p className="mt-8 text-sm text-muted-foreground">This certifies that</p>
          <p className="mt-1 font-heading text-xl font-semibold text-foreground sm:text-2xl">{certificate.participant.name}</p>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {certificate.participant.participationType === "volunteer" ? "volunteered for" : "participated in"} the campaign
          </p>
          <p className="mt-1 font-heading text-lg font-semibold text-foreground">"{certificate.campaign.name}"</p>
          <p className="mt-1 text-sm text-muted-foreground">organized by {certificate.campaign.organizationName}</p>

          <p className="mt-6 text-xs text-muted-foreground">
            {formatFriendlyDate(certificate.campaign.startDate)} – {formatFriendlyDate(certificate.campaign.endDate)}
          </p>

          <div className="mt-8 flex items-center justify-between border-t border-dashed border-border pt-4 text-left text-xs text-muted-foreground">
            <span>Certificate ID: {certificate.certificateNumber}</span>
            <span>Issued {formatFriendlyDate(certificate.issuedAt)}</span>
          </div>
        </div>

        <Button onClick={() => window.print()} className="mt-6 w-full no-print">
          <Download className="mr-1.5 h-4 w-4" />
          Download certificate
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground no-print">
          Opens your browser's print dialog — choose "Save as PDF" to download.
        </p>
      </div>

      {/*
        Print-scoping: the certificate lives inside AppShell (navbar,
        bottom nav, footer) which this page doesn't own and shouldn't
        modify — so printing hides EVERYTHING except the certificate card
        by visibility, rather than only the few elements tagged
        `no-print` above. That standard technique works regardless of
        what other chrome the shell renders around this page.
      */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .certificate-print-area, .certificate-print-area * { visibility: visible; }
          .certificate-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
        }
      `}</style>
    </PageContainer>
  );
};

export default CertificatePage;
