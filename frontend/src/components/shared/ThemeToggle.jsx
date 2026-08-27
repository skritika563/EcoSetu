/**
 * ThemeToggle — smooth animated theme switcher (Sun / Moon) for light/dark mode.
 */
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export const ThemeToggle = ({ className }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      id="theme-toggle"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("h-9 w-9 rounded-full relative overflow-hidden transition-colors hover:bg-muted/80", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex items-center justify-center text-foreground"
        >
          {isDark ? (
            <Moon className="h-4 w-4 text-amber-300" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500" />
          )}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
};

export default ThemeToggle;
