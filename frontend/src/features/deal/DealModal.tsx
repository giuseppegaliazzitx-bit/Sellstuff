import { DealView } from "./DealPage";

export function DealModal({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Property details"
      data-testid="deal-modal"
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-header/70 px-3 py-8"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-4xl rounded-2xl bg-card p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DealView id={dealId} variant="modal" onClose={onClose} />
      </div>
    </div>
  );
}
