/**
 * Achievement icon map — data carries the string key, the UI resolves it here.
 *
 * Lives in its own module so AchievementGrid and AchievementDialog can both
 * use it without importing each other.
 */

import {
  Award,
  Compass,
  Flame,
  Medal,
  Recycle,
  Repeat,
  Shield,
  Sparkles,
  Truck,
} from "lucide-react";

export const ACHIEVEMENT_ICONS = {
  truck: Truck,
  recycle: Recycle,
  compass: Compass,
  repeat: Repeat,
  sparkles: Sparkles,
  shield: Shield,
  medal: Medal,
  flame: Flame,
  award: Award,
};

/**
 * Fallback used at call sites as `ACHIEVEMENT_ICONS[key] ?? FALLBACK_...`.
 * Resolved by property lookup rather than a helper call so the react-hooks
 * static-components rule can see the reference is stable.
 */
export const FALLBACK_ACHIEVEMENT_ICON = Award;

export default ACHIEVEMENT_ICONS;
