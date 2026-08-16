/**
 * ReceiptView — the completed-pickup receipt shown on Pickup Details.
 *
 * Reuses PriceBreakdownTable for the line items (identical arithmetic to the
 * collector's verification screen) and adds the EcoSetu / transaction
 * metadata a receipt needs. "Download Receipt" hands off to lib/receipt.js.
 */

import { Download, Leaf } from "lucide-react";

import { downloadReceipt } from "@/lib/receipt";
import { formatFriendlyDate } from "@/lib/format";
import { getPaymentStatus } from "@/config/pickups";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import PriceBreakdownTable from "@/components/pickups/PriceBreakdownTable";
import { cn } from "@/lib/utils";

const ReceiptView = ({ pickup }) => {
  const payment = getPaymentStatus(pickup.paymentStatus);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Leaf className="h-4 w-4" />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">EcoSetu Receipt</p>
            <p className="text-xs text-muted-foreground">{pickup.id}</p>
          </div>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", payment.tone)}>{payment.label}</span>
      </div>

      <Separator className="my-4" />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Date</dt>
          <dd className="mt-0.5 text-foreground">{formatFriendlyDate(pickup.pickupDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Customer</dt>
          <dd className="mt-0.5 truncate text-foreground">{pickup.customer?.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Collector</dt>
          <dd className="mt-0.5 truncate text-foreground">{pickup.collector?.name ?? "—"}</dd>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <dt className="text-xs text-muted-foreground">Address</dt>
          <dd className="mt-0.5 text-foreground">
            {pickup.pickupAddress?.line}, {pickup.pickupAddress?.city} {pickup.pickupAddress?.pincode}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <PriceBreakdownTable
          lines={pickup.verifiedCategories}
          totalAmount={pickup.totalAmount}
          serviceCharge={pickup.serviceCharge}
          mode="final"
        />
      </div>

      <Button variant="outline" className="mt-4 w-full" onClick={() => downloadReceipt(pickup)}>
        <Download className="mr-1.5 h-4 w-4" />
        Download Receipt
      </Button>
    </div>
  );
};

export default ReceiptView;
