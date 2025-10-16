"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

type CompletionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  closeLabel?: string;
};

export default function CompletionModal({
  open,
  onOpenChange,
  title,
  description,
  actionButton,
  closeLabel = "Entendido",
}: CompletionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <DialogTitle className="text-center text-2xl">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {actionButton && (
            <Button
              onClick={actionButton.onClick}
              size="lg"
              className="w-full"
            >
              {actionButton.label}
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            size="lg"
            variant={actionButton ? "outline" : "default"}
            className="w-full"
          >
            {closeLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
