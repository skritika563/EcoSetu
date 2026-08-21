/**
 * ListingFormPage — create (/listings/new) and edit (/listings/:id/edit).
 *
 * One page for both: the only real difference is whether a product is loaded
 * first, and whether images upload immediately or after creation (see
 * ListingForm's header for that ordering constraint).
 *
 * PARTIAL FAILURE, handled honestly: if the listing is created but its
 * photos fail to upload, the listing is NOT silently discarded and the
 * failure is NOT hidden. The user is told the listing exists without its
 * photos and sent to it, where they can add them — same approach the pickup
 * booking flow takes for exactly the same situation.
 */

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { useProduct } from "@/hooks/useProducts";
import * as productService from "@/services/productService";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import ListingForm from "@/components/marketplace/ListingForm";

const BackLink = () => (
  <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
    <Link to="/marketplace/listings">
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
      My Listings
    </Link>
  </Button>
);

const ListingFormPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!productId;

  const { product, loading, error, refetch } = useProduct(productId);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload, files) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await productService.updateProduct(productId, payload);
        toast.success("Listing updated");
        navigate(`/marketplace/product/${productId}`);
        return;
      }

      const created = await productService.createProduct(payload);

      // Images can only be attached once the listing has an id.
      if (files.length > 0) {
        try {
          await productService.uploadProductImages(created.id, files);
        } catch (uploadError) {
          // The listing is real and saved — say exactly that rather than
          // reporting a total failure or pretending the photos went up.
          toast.error(
            `Listing created, but the photos didn't upload: ${uploadError.message}. You can add them from the listing.`,
            { duration: 8000 }
          );
          navigate(`/marketplace/product/${created.id}`);
          return;
        }
      }

      toast.success(payload.status === "draft" ? "Draft saved" : "Listing published");
      navigate(`/marketplace/product/${created.id}`);
    } catch (err) {
      toast.error(err.message || "Couldn't save this listing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && error) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <ErrorState title="We couldn't load this listing" description={error} onRetry={refetch} className="mt-4" />
      </PageContainer>
    );
  }

  if (isEdit && loading) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <BackLink />
        <HeroSkeleton />
      </PageContainer>
    );
  }

  // The backend returns 404 for a listing that isn't yours, so a non-owner
  // landing on the edit URL lands here rather than on an editable form.
  if (isEdit && !product) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <EmptyState
          title="Listing not found"
          description="It may have been removed, or it isn't yours to edit."
          className="mt-4"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <BackLink />

      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {isEdit ? "Edit listing" : "Sell an item"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit
              ? "Update the details buyers see."
              : "Give something a second life — recovered materials, reusable goods or upcycled products."}
          </p>
        </header>

        <ListingForm
          product={isEdit ? product : undefined}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={isEdit ? "Save changes" : "Publish listing"}
        />
      </div>
    </PageContainer>
  );
};

export default ListingFormPage;
