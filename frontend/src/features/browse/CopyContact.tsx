import { useState, type ReactNode } from "react";
import { copyText } from "../../shared/copy";

export function CopyContact({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children: ReactNode;
}) {
  const [shown, setShown] = useState<string | null>(null);

  async function onClick() {
    const ok = await copyText(value);
    setShown(ok ? value : `Could not copy ${label}`);
    window.setTimeout(() => setShown(null), 2500);
  }

  return (
    <button
      type="button"
      onClick={() => onClick()}
      className="relative rounded p-1 hover:bg-chip"
      aria-label={`Copy ${label}`}
    >
      {children}
      {shown ? (
        <span
          role="status"
          className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-header px-2 py-1 text-xs text-white"
        >
          Copied {shown}
        </span>
      ) : null}
    </button>
  );
}
