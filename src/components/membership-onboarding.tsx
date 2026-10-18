"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import styles from "./auth-flow.module.css";

export function OnboardingSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className={styles.steps} aria-label="Application progress">
      {["About you", "Student details", "Application sent"].map(
        (label, index) => (
          <li
            key={label}
            className={styles.step}
            data-active={index + 1 <= step}
            aria-current={index + 1 === step ? "step" : undefined}
          >
            <span>
              {index + 1}. {label}
            </span>
          </li>
        ),
      )}
    </ol>
  );
}

export function ApplicationSent({ approved = false }: { approved?: boolean }) {
  return (
    <>
      <OnboardingSteps step={3} />
      <div className={styles.applicationMessage}>
        <div className={styles.success}>
          <Check size={28} aria-hidden="true" />
        </div>
        <h1>Congratulations!</h1>
        <p className="auth-description">
          {approved
            ? "Your details are saved. Your membership is already approved."
            : "Your application is sent. Please wait for approval."}
        </p>
        <p className="auth-description">
          {approved
            ? "You can now open your student dashboard."
            : "Once approved, sign in to open your club account."}
        </p>
        <Button asChild>
          <Link href={approved ? "/member" : "/"}>
            {approved ? "Open dashboard" : "Back to website"}
          </Link>
        </Button>
      </div>
    </>
  );
}

export function MembershipOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [values, setValues] = useState({
    name: "",
    phone: "",
    registrationNumber: "",
    course: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step === 1) {
      if (
        values.name.trim().length < 2 ||
        !/^\+?[\d\s()-]{9,25}$/.test(values.phone.trim())
      ) {
        setError("Enter your name and a valid phone number.");
        return;
      }
      setStep(2);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, action: "complete_profile" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.push(result.destination);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const field = (
    id: keyof typeof values,
    label: string,
    type = "text",
    autoComplete?: string,
  ) => (
    <div className="field" key={id}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        required
        value={values[id]}
        onChange={(event) => setValues({ ...values, [id]: event.target.value })}
        autoComplete={autoComplete}
        minLength={id === "phone" ? 9 : id === "registrationNumber" ? 3 : 2}
        maxLength={id === "name" ? 120 : id === "phone" ? 25 : 80}
      />
    </div>
  );
  return (
    <>
      <OnboardingSteps step={step} />
      <h1>{step === 1 ? "Tell us about you." : "Your student details."}</h1>
      <p className="auth-description">
        {step === 1
          ? "Your email is verified. Let’s finish your application."
          : "Add your registration number and course."}
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <form className="form-stack" onSubmit={submit}>
        {step === 1 ? (
          <>
            {field("name", "Full name", "text", "name")}
            {field("phone", "Phone number", "tel", "tel")}
          </>
        ) : (
          <>
            {field("registrationNumber", "Registration number")}
            {field("course", "Course")}
          </>
        )}
        <div className={styles.actions}>
          {step === 2 && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setError("");
                setStep(1);
              }}
            >
              Back
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : step === 1 ? "Next" : "Send application"}
          </Button>
        </div>
      </form>
    </>
  );
}
