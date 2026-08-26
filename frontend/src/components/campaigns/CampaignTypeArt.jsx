/**
 * CampaignTypeArt — bigger, hand-drawn illustrations for the campaign-type
 * picker on CampaignForm, one per type, standing on their own (no tinted
 * background chip behind them — the colour lives in the artwork itself).
 *
 * Every stroke/fill comes from the EcoSetu brand tokens (index.css's
 * --ecosetu-* variables), never an arbitrary Tailwind hue, so the picker
 * reads as the same palette as the rest of the product. Each type gets its
 * own token so five cards in a row are still visually distinct:
 *   waste_collection  → --ecosetu-primary   (forest green)
 *   cleaning_drive     → --ecosetu-orange    (amber)
 *   plantation_drive   → --ecosetu-secondary (soft green)
 *   awareness_campaign → --ecosetu-primary-dark
 *   exhibition          → --ecosetu-accent    (warm peach), outlined in
 *                          primary-dark for contrast since peach alone
 *                          washes out on a light card in light mode.
 *   other               → --ecosetu-muted     (a dashed "define your own"
 *                          outline, deliberately unadorned — there's
 *                          nothing concrete to illustrate for a type that
 *                          hasn't been named yet).
 */

const WasteCollectionArt = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20 24h24l-2.4 30a4 4 0 0 1-4 3.6H26.4a4 4 0 0 1-4-3.6L20 24Z"
      stroke="var(--ecosetu-primary)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M16 24h32" stroke="var(--ecosetu-primary)" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M26 24V19a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" stroke="var(--ecosetu-primary)" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M27 31v18M32 31v18M37 31v18" stroke="var(--ecosetu-secondary)" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M32 4c4 3 6 6.5 6 10.5"
      stroke="var(--ecosetu-orange)"
      strokeWidth="2.3"
      strokeLinecap="round"
      transform="rotate(0 32 32)"
    />
    <path d="M35.2 11.8 38 14.5l.4-3.8" stroke="var(--ecosetu-orange)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CleaningDriveArt = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 8 22 42" stroke="var(--ecosetu-orange)" strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M22 42c-4 2-7 6-8 10 4.5-1 9-2.5 12-5.5l4-6-8 1.5Z"
      fill="var(--ecosetu-orange)"
      fillOpacity="0.18"
      stroke="var(--ecosetu-orange)"
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path d="M18 47.5c-1.5 1.5-2.5 3.5-3 5.5M14 55c1.5-.5 3-1.3 4-2.3" stroke="var(--ecosetu-orange)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="46" cy="14" r="1.6" fill="var(--ecosetu-primary)" />
    <circle cx="51" cy="22" r="1.3" fill="var(--ecosetu-secondary)" />
    <circle cx="42" cy="24" r="1.1" fill="var(--ecosetu-primary)" />
    <circle cx="48" cy="30" r="1.5" fill="var(--ecosetu-secondary)" />
  </svg>
);

const PlantationDriveArt = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 48c8-4 28-4 36 0" stroke="var(--ecosetu-secondary)" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 48V26" stroke="var(--ecosetu-primary)" strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M32 30c0-7-6-11-13-11 1 7 6 12 13 12Z"
      fill="var(--ecosetu-secondary)"
      fillOpacity="0.2"
      stroke="var(--ecosetu-secondary)"
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path
      d="M32 24c0-6.5 5.5-10.5 12-10.5-1 6.5-5.5 11-12 11Z"
      fill="var(--ecosetu-primary)"
      fillOpacity="0.15"
      stroke="var(--ecosetu-primary)"
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path d="M20 52c6-2.5 18-2.5 24 0" stroke="var(--ecosetu-primary)" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const AwarenessCampaignArt = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14 26v10a3 3 0 0 0 3 3h3l16 9V14l-16 9h-3a3 3 0 0 0-3 3Z"
      fill="var(--ecosetu-primary-dark)"
      fillOpacity="0.15"
      stroke="var(--ecosetu-primary-dark)"
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path d="M36 23c3 2.2 3 11.6 0 14" stroke="var(--ecosetu-primary-dark)" strokeWidth="2.3" strokeLinecap="round" />
    <path d="M42 17c6 6 6 20 0 26" stroke="var(--ecosetu-orange)" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M22 40l-2 9" stroke="var(--ecosetu-primary-dark)" strokeWidth="2.3" strokeLinecap="round" />
    <circle cx="48" cy="46" r="2" fill="var(--ecosetu-orange)" />
    <circle cx="53" cy="40" r="1.4" fill="var(--ecosetu-secondary)" />
    <circle cx="53" cy="52" r="1.4" fill="var(--ecosetu-secondary)" />
  </svg>
);

const ExhibitionArt = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 26 32 12l20 14" stroke="var(--ecosetu-primary-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M16 26h32v20a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V26Z"
      fill="var(--ecosetu-accent)"
      fillOpacity="0.35"
      stroke="var(--ecosetu-primary-dark)"
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path d="M22 48v-9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v9" stroke="var(--ecosetu-primary-dark)" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M32 12V6" stroke="var(--ecosetu-orange)" strokeWidth="2.3" strokeLinecap="round" />
    <path d="M32 6h7l-3.5 4L39 14h-7" fill="var(--ecosetu-orange)" stroke="var(--ecosetu-orange)" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

/** "Other" — a dashed outline with a plus at its centre, reading as "define your own." */
const OtherArt = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="19" stroke="var(--ecosetu-muted)" strokeWidth="2.3" strokeDasharray="5 5" />
    <path d="M32 24v16M24 32h16" stroke="var(--ecosetu-muted)" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

// Named component exports only, deliberately — mixing these with a plain
// object/function export from the same file (however convenient a
// getByKey() lookup would be) breaks React Fast Refresh's ability to treat
// this as a component-only file. The key → component lookup lives in
// CampaignForm.jsx instead, right next to its one other caller.
export { WasteCollectionArt, CleaningDriveArt, PlantationDriveArt, AwarenessCampaignArt, ExhibitionArt, OtherArt };
