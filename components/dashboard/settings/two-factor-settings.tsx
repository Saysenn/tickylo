"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Step = "idle" | "enroll" | "verify" | "disable";

interface Factor {
  id: string;
  friendly_name?: string;
}

export function TwoFactorSettings() {
  const [step, setStep] = useState<Step>("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifiedFactors, setVerifiedFactors] = useState<Factor[]>([]);
  const [code, setCode] = useState("");

  useEffect(() => {
    loadFactors();
  }, []);

  async function loadFactors() {
    setIsLoading(true);
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setVerifiedFactors(data?.totp?.filter((f) => f.status === "verified") ?? []);
    setIsLoading(false);
  }

  async function handleStartEnroll() {
    setIsBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator App",
    });
    if (enrollError || !data) {
      setError(enrollError?.message ?? "Failed to start 2FA setup.");
      setIsBusy(false);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep("enroll");
    setIsBusy(false);
  }

  async function handleVerifyEnroll() {
    if (!factorId || code.length !== 6) return;
    setIsBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      setError(challengeError?.message ?? "Failed to create challenge.");
      setIsBusy(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });
    if (verifyError) {
      setError("Invalid code. Please try again.");
      setIsBusy(false);
      return;
    }
    setSuccess("Two-factor authentication enabled successfully.");
    setStep("idle");
    setCode("");
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    await loadFactors();
    setIsBusy(false);
  }

  async function handleStartDisable() {
    const factor = verifiedFactors[0];
    if (!factor) return;
    setFactorId(factor.id);
    setStep("disable");
    setError(null);
    setSuccess(null);
    setCode("");
  }

  async function handleVerifyDisable() {
    if (!factorId || code.length !== 6) return;
    setIsBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      setError(challengeError?.message ?? "Failed to verify. Please try again.");
      setIsBusy(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });
    if (verifyError) {
      setError("Invalid code. Please try again.");
      setIsBusy(false);
      return;
    }
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    if (unenrollError) {
      setError(unenrollError.message ?? "Failed to disable 2FA.");
      setIsBusy(false);
      return;
    }
    setSuccess("Two-factor authentication disabled.");
    setStep("idle");
    setCode("");
    setFactorId(null);
    await loadFactors();
    setIsBusy(false);
  }

  const isEnabled = verifiedFactors.length > 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-mint/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-ink-2" />
            </div>
            <div>
              <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
              <CardDescription className="mt-0.5">
                Protect your account with a TOTP authenticator app.
              </CardDescription>
            </div>
          </div>
          {!isLoading && step === "idle" && (
            <Badge
              variant={isEnabled ? "default" : "secondary"}
              className={isEnabled ? "bg-mint/20 text-ink-2 hover:bg-mint/20 border-0" : ""}
            >
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 -mt-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-sm text-ink-2 bg-mint/12 border border-mint/30 rounded-xl">
                {success}
              </div>
            )}

            {/* Idle state */}
            {step === "idle" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isEnabled
                    ? "Your account is protected. You'll need your authenticator app code each time you sign in."
                    : "Add an extra layer of security. When enabled, you'll need your authenticator app (e.g. Google Authenticator, Authy) every time you sign in."}
                </p>
                {isEnabled ? (
                  <Button
                    variant="destructive"
                    onClick={handleStartDisable}
                    isLoading={isBusy}
                    className="gap-2"
                  >
                    <ShieldOff className="w-4 h-4" />
                    Disable 2FA
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartEnroll}
                    isLoading={isBusy}
                    className="bg-mint hover:bg-mint-hover text-ink shadow-[0_2px_12px_rgba(128,237,153,0.30)] gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Enable 2FA
                  </Button>
                )}
              </div>
            )}

            {/* Enroll: show QR + verify */}
            {step === "enroll" && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Scan the QR code with your authenticator app, then enter the 6-digit code.
                </p>
                {qrCode && (
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-xl border inline-block shadow-sm">
                      <img src={qrCode} alt="2FA QR Code" className="w-44 h-44" />
                    </div>
                  </div>
                )}
                {secret && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">Manual entry key</p>
                    <p className="font-mono text-sm text-foreground break-all select-all">{secret}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="enroll-code" className="text-ink-2 text-sm font-medium">
                    Verification code
                  </Label>
                  <Input
                    id="enroll-code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000 000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleVerifyEnroll}
                    isLoading={isBusy}
                    disabled={code.length !== 6}
                    className="flex-1 bg-mint hover:bg-mint-hover text-ink"
                  >
                    Confirm &amp; Enable
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("idle");
                      setCode("");
                      setQrCode(null);
                      setSecret(null);
                      setFactorId(null);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Disable: verify then unenroll */}
            {step === "disable" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to confirm disabling 2FA.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="disable-code" className="text-ink-2 text-sm font-medium">
                    Authentication code
                  </Label>
                  <Input
                    id="disable-code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000 000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleVerifyDisable}
                    isLoading={isBusy}
                    disabled={code.length !== 6}
                    className="flex-1"
                  >
                    Confirm Disable
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("idle");
                      setCode("");
                      setFactorId(null);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
