import { useEffect, useId, useState, type ReactNode } from "react";
import { copyText } from "../../shared/copy";

let activeId: string | null = null;
let timer: number | null = null;
const listeners = new Set<() => void>();

export function resetCopyToasts() {
  activeId = null;
  if (timer != null) window.clearTimeout(timer);
  timer = null;
  bump();
}

function bump() {
  for (const fn of listeners) fn();
}

export function CopyContact({
  value,
  label,
  children,
  className = "hover:bg-chip",
}: {
  value: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const [tick, setTick] = useState(0);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, []);

  const shown = activeId === id ? text : null;

  async function onClick() {
    const ok = await copyText(value);
    setText(ok ? value : `Could not copy ${label}`);
    activeId = id;
    if (timer != null) window.clearTimeout(timer);
    bump();
    timer = window.setTimeout(() => {
      if (activeId === id) {
        activeId = null;
        bump();
      }
      timer = null;
    }, 2500);
  }

  return (
    <button
      type="button"
      onClick={() => onClick()}
      className={`relative rounded p-1 ${className}`}
      aria-label={`Copy ${label}`}
    >
      {children}
      {shown ? (
        <span
          role="status"
          className="absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded bg-header px-2 py-1 text-xs text-white"
        >
          {shown}
        </span>
      ) : null}
    </button>
  );
}
