import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiJson, ApiError } from "../../shared/api/client";

export function VerifyPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [msg, setMsg] = useState("Verifying…");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!token) {
      setMsg("Missing token.");
      return;
    }
    apiJson("/api/v1/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => {
        setOk(true);
        setMsg("Email verified. You can log in.");
      })
      .catch((e: Error) => setMsg(e instanceof ApiError ? e.message : "Verification failed"));
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Verify email</h1>
      <p className="mt-4 text-sm text-neutral-600">{msg}</p>
      {ok ? (
        <Link to="/login" className="mt-6 inline-block text-gold">
          Log in
        </Link>
      ) : null}
    </div>
  );
}
