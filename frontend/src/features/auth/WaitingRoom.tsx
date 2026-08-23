import { useAuth } from "../../shared/auth";
import { useConfig } from "../../shared/config";

export function WaitingRoom() {
  const cfg = useConfig();
  const { user, logout } = useAuth();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">You’re on the list</h1>
      <p className="mt-3 text-sm text-neutral-600">
        {cfg.brand_name} is reviewing {user?.email}. Off-market inventory stays hidden until an admin
        approves your account.
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        {user?.email_verified ? "Email verified." : "Email not verified yet — that’s OK while mail is sandboxed."}
      </p>
      <button
        type="button"
        onClick={() => logout()}
        className="mt-8 text-sm text-gold hover:text-gold-hover"
      >
        Log out
      </button>
    </div>
  );
}
