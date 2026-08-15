/**
 * useTheme — re-exported from ThemeContext.
 *
 * The implementation moved to contexts/ThemeContext.jsx so every toggle shares
 * one source of truth. This module is kept so existing
 * `import { useTheme } from "@/hooks/useTheme"` paths keep working; prefer
 * importing from "@/contexts/ThemeContext" in new code.
 */

export { useTheme } from "@/contexts/ThemeContext";
