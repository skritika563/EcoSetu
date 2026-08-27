/**
 * EmptyState — admin-styled empty state placeholder.
 */
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

const EmptyState = ({ icon: Icon = Inbox, title = "No data found", description = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
        <Icon className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <h3 className="mt-4 font-heading text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
    </motion.div>
  );
};

export default EmptyState;
