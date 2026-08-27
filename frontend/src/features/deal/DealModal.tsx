import { useEffect } from "react";
import type { MarketManager } from "../../shared/api/types";
import { DealView } from "./DealPage";

export function DealModal({
  dealId,
  onClose,
  manager = null,
}: {
  dealId: string;
  onClose: () => void;
  manager?: MarketManager | null;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Property details"
      data-testid="deal-modal"
      className="fixed inset-0 z-[2000] flex justify-center overflow-y-auto bg-black/50"
      onClick={onClose}
    >
      <div
        className="flex min-h-full w-full max-w-[1000px] flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <DealView id={dealId} variant="modal" onClose={onClose} manager={manager} />
      </div>
    </div>
  );
}
