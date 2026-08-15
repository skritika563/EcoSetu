/**
 * EcoJourney — the signature section: twelve monthly plants, or the whole year
 * as one tree.
 *
 * The Monthly/Yearly switch is the same data at two zoom levels, which is why
 * it lives behind a toggle rather than as two competing sections.
 *
 * Mobile keeps the plants as a horizontal scroller rather than shrinking them
 * into an unreadable grid.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MonthlyPlant from "@/components/sustainability/MonthlyPlant";
import YearlyEcoTree from "@/components/sustainability/YearlyEcoTree";
import { cn } from "@/lib/utils";

const EcoJourney = ({ months = [], summary, className }) => {
  const currentMonthIndex = new Date().getMonth();

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      <Tabs defaultValue="monthly">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Your Eco Journey
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Every sustainable action helps your plants grow.
            </p>
          </div>

          <TabsList aria-label="Switch between monthly and yearly view">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="monthly">
          <div
            className={cn(
              "flex gap-1 overflow-x-auto pb-2",
              "sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible sm:pb-0 md:grid-cols-6"
            )}
          >
            {months.map((month, index) => (
              <MonthlyPlant
                key={month.month}
                month={month}
                index={index}
                isCurrent={index === currentMonthIndex}
                className="min-w-[74px] shrink-0 sm:min-w-0"
              />
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Plant size reflects each month&apos;s Eco Activity Score — pickups, recycling,
            marketplace reuse and campaigns all contribute.
          </p>
        </TabsContent>

        <TabsContent value="yearly">
          <YearlyEcoTree months={months} summary={summary} />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default EcoJourney;
