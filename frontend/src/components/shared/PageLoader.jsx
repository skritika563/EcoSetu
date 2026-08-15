/**
 * PageLoader — full-screen loading state.
 * Used by ProtectedRoute and initial auth loading.
 */

import { Leaf } from "lucide-react";
import { motion } from "framer-motion";

const PageLoader = ({ message = "Loading..." }) => {
  return (
    <div
      id="page-loader"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-5 bg-background"
      aria-live="polite"
      aria-label={message}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
      >
        <Leaf className="h-6 w-6 text-primary" strokeWidth={2.2} />
      </motion.div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
};

export default PageLoader;
