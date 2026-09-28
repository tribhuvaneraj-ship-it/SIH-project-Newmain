import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [accountType, setAccountType] = useState<"customer" | "worker">("customer");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();
  const onSuccess = async () => {
    await utils.auth.me.invalidate();
    onOpenChange(false);
  };
  const login = trpc.auth.login.useMutation({ onSuccess, onError: (cause) => setError(cause.message) });
  const register = trpc.auth.register.useMutation({ onSuccess, onError: (cause) => setError(cause.message) });
  const isPending = login.isPending || register.isPending;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    if (mode === "login") {
      login.mutate({ email, password });
    } else {
      if (password !== String(form.get("confirmPassword") ?? "")) {
        setError("Passwords do not match");
        return;
      }
      register.mutate({
        name: String(form.get("name") ?? ""),
        email,
        password,
        userType: accountType,
        workerCategory: accountType === "worker" ? String(form.get("workerCategory") ?? "") : undefined,
        neighborhood: accountType === "worker" ? String(form.get("neighborhood") ?? "") : undefined,
      });
    }
  };

  const selectMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    setError("");
    login.reset();
    register.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] max-w-[430px] gap-0 overflow-y-auto border-[#dce8df] bg-[#fbfdfb] p-0">
        <div className="border-b border-[#e3ece5] px-6 pb-5 pt-7 sm:px-8">
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-[#e1f2e3] text-[#2c7040]">
            <ShieldCheck className="size-5" />
          </div>
          <DialogHeader className="gap-2 text-left">
            <DialogTitle className="text-[25px] font-bold tracking-[-0.02em] text-[#18221e]">
              {mode === "login" ? "Welcome back" : "Join Co-opLink"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#68776d]">
              {mode === "login" ? "Sign in to manage requests and connect with your local community." : "Create an account to request trusted local services."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="mb-6 grid grid-cols-2 border-b border-[#dfe9e1]" role="tablist" aria-label="Account access">
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={mode === item}
                onClick={() => selectMode(item)}
                className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${mode === item ? "border-[#347747] text-[#245d35]" : "border-transparent text-[#819087] hover:text-[#35483b]"}`}
              >
                {item === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "register" && (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Account type</legend>
                <div className="grid grid-cols-2 rounded-md border border-[#dce8df] bg-white p-1" role="radiogroup" aria-label="Account type">
                  {(["customer", "worker"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={accountType === type}
                      onClick={() => setAccountType(type)}
                      className={`h-9 rounded-sm text-sm font-semibold ${accountType === type ? "bg-[#e6f3e7] text-[#245d35]" : "text-[#819087] hover:text-[#35483b]"}`}
                    >
                      {type === "customer" ? "Find services" : "Offer services"}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="auth-name">Full name</Label>
                <Input id="auth-name" name="name" autoComplete="name" required minLength={2} maxLength={120} disabled={isPending} />
              </div>
            )}
            {mode === "register" && accountType === "worker" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="auth-worker-category">Service category</Label>
                  <select id="auth-worker-category" name="workerCategory" defaultValue="Electrical" className="h-10 w-full rounded-md border border-[#d8e5da] bg-white px-3 text-sm" disabled={isPending}>
                    {["Electrical", "Plumbing", "Carpentry", "Cleaning", "Appliance Repair", "Gardening", "Farm Assistance", "Painting"].map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-neighborhood">Neighborhood</Label>
                  <Input id="auth-neighborhood" name="neighborhood" autoComplete="address-level3" required minLength={2} maxLength={120} defaultValue="Pune" disabled={isPending} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email address</Label>
              <Input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={320} disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                id="auth-password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "register" ? 8 : 1}
                maxLength={128}
                disabled={isPending}
              />
              {mode === "register" && <p className="text-xs text-[#77867c]">Use at least 8 characters.</p>}
            </div>
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="auth-confirm-password">Confirm password</Label>
                <Input id="auth-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={isPending} />
              </div>
            )}
            {error && <p role="alert" className="text-sm font-medium text-[#b33636]">{error}</p>}
            <Button type="submit" className="h-11 w-full bg-[#2f7041] text-white hover:bg-[#245d35]" disabled={isPending}>
              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
              {!isPending && <ArrowRight className="size-4" />}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}