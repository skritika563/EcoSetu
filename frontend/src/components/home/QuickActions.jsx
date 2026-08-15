/**
 * QuickActions — compact row of the four actions a role reaches for most.
 *
 * At rest the tiles are quiet cards. On hover a gradient drawn from the
 * EcoSetu palette (forest, sage, amber, peach — never the page background)
 * fades in behind the content.
 *
 * The gradient lives on its own absolutely-positioned layer and animates via
 * opacity: `background-image` itself cannot be transitioned, so painting it
 * directly on the tile would snap instead of fade.
 *
 * Foreground colours are paired per accent so the label stays readable on both
 * the dark green and the light warm gradients.
 *
 * Actions come from config/navigation.js; unbuilt destinations announce
 * themselves rather than routing nowhere.
 */

import { Link } from "react-router-dom";

import { getQuickActions } from "@/config/navigation";
import { notifyComingSoon } from "@/lib/comingSoon";
import { cn } from "@/lib/utils";

/**
 * Hover gradients — four soft pastel washes (blue, purple, orange, teal) so a
 * row of tiles is scannable without shouting. Every colour is a token in
 * index.css and is redefined under `.dark`, so the tiles quietly swap to muted
 * low-lightness versions in dark mode instead of glaring.
 *
 * Each accent pairs its wash with a deep foreground of the same hue, which is
 * what keeps the labels readable in both themes.
 */
const ACCENTS = {
  blue: {
    gradient: "from-action-blue-from to-action-blue-to",
    text: "group-hover:text-action-blue-fg",
  },
  purple: {
    gradient: "from-action-purple-from to-action-purple-to",
    text: "group-hover:text-action-purple-fg",
  },
  orange: {
    gradient: "from-action-orange-from to-action-orange-to",
    text: "group-hover:text-action-orange-fg",
  },
  teal: {
    gradient: "from-action-teal-from to-action-teal-to",
    text: "group-hover:text-action-teal-fg",
  },
};

/** Icon chip wash — `foreground/10` tints correctly in both themes. */
const CHIP_HOVER = "group-hover:bg-foreground/10";

const TILE_CLASSES =
  "group relative flex flex-col items-start gap-2.5 overflow-hidden rounded-xl border border-border bg-card p-3.5 text-left " +
  "transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-sm " +
  "focus-visible:-translate-y-0.5 focus-visible:shadow-sm";

const TileContent = ({ action, accent }) => {
  const Icon = action.icon;

  return (
    <>
      {/* Animatable gradient layer */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100",
          accent.gradient
        )}
      />

      <span
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-300",
          CHIP_HOVER,
          accent.text
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>

      <span
        className={cn(
          "relative text-sm font-medium leading-tight text-foreground transition-colors duration-300",
          accent.text
        )}
      >
        {action.label}
      </span>
    </>
  );
};

const ActionTile = ({ action }) => {
  const accent = ACCENTS[action.accent] ?? ACCENTS.blue;

  if (!action.available) {
    return (
      <button
        type="button"
        onClick={() => notifyComingSoon(action.label)}
        className={TILE_CLASSES}
      >
        <TileContent action={action} accent={accent} />
      </button>
    );
  }

  return (
    <Link to={action.to} className={TILE_CLASSES}>
      <TileContent action={action} accent={accent} />
    </Link>
  );
};

const QuickActions = ({ role, className }) => {
  const actions = getQuickActions(role);
  if (actions.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {actions.map((action) => (
        <ActionTile key={action.key} action={action} />
      ))}
    </div>
  );
};

export default QuickActions;
