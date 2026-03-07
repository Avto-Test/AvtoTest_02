"use client";

import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PremiumUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function PremiumUpgradeDialog({
  open,
  onOpenChange,
  title = "Premium imkoniyatlari yopiq",
  description = "Premium bilan cheksiz testlar, adaptiv AI testlari va batafsil analitikani ochasiz.",
}: PremiumUpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          <div>Unlimited tests</div>
          <div>Adaptive AI tests</div>
          <div>Detailed analytics</div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
          <Button asChild>
            <Link href="/upgrade">Premiumga o‘tish</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
