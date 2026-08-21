/**
 * WishlistButton — the heart toggle, used on cards and on product details.
 *
 * Optimistic by design: the fill animates immediately, then the real
 * /api/marketplace/wishlist request confirms it. A failure rolls the visual
 * state back and says so — it never leaves a filled heart for something the
 * server didn't actually save.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

import * as wishlistService from "@/services/wishlistService";
import { cn } from "@/lib/utils";

const WishlistButton = ({ productId, isWishlisted = false, onToggled, className, size = "default" }) => {
  const [saved, setSaved] = useState(isWishlisted);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  const handleClick = async (event) => {
    // Cards wrap this in a Link — without these the whole card navigates.
    event.preventDefault();
    event.stopPropagation();

    if (pending) return;

    const next = !saved;
    setSaved(next);
    setPending(true);

    try {
      if (next) {
        await wishlistService.addToWishlist(productId);
        toast.success("Added to wishlist", {
          action: { label: "View wishlist", onClick: () => navigate("/marketplace/wishlist") },
        });
      } else {
        await wishlistService.removeFromWishlist(productId);
      }
      onToggled?.(productId, next);
    } catch (err) {
      setSaved(!next); // roll back — the server didn't accept it
      toast.error(err.message || "Couldn't update your wishlist.");
    } finally {
      setPending(false);
    }
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const boxSize = size === "sm" ? "h-7 w-7" : "h-9 w-9";

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.85 }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition-colors",
        boxSize,
        saved
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-background/90 text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {pending ? (
        <Loader2 className={cn(iconSize, "animate-spin")} />
      ) : (
        <Heart className={cn(iconSize, saved && "fill-current")} />
      )}
    </motion.button>
  );
};

export default WishlistButton;
