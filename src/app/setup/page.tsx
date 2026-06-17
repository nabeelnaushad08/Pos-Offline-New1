"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Step = "db" | "license" | "admin";

interface StepStatus {
  db: "pending" | "loading" | "done" | "error";
  license: "pending" | "loading" | "done" | "error";
  admin: "pending" | "loading" | "done" | "error";
}

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("db");
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    db: "pending",
    license: "pending",
    admin: "pending",
  });
  const [machineId, setMachineId] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseError, setLicenseError] = useState("");
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [adminError, setAdminError] = useState("");
  const [dbError, setDbError] = useState("");

  // Step 1: Auto-init DB on mount
  useEffect(() => {
    initDb();
  }, []);

  async function initDb() {
    setStepStatus((s) => ({ ...s, db: "loading" }));
    setDbError("");
    try {
      const res = await fetch("/api/setup/db-status");
      const data = await res.json();
      if (data.connected) {
        setStepStatus((s) => ({ ...s, db: "done" }));
        // Fetch machine ID for license step
        const midRes = await fetch("/api/setup/machine-id");
        const midData = await midRes.json();
        setMachineId(midData.machineId || "");
        setCurrentStep("license");
      } else {
        setStepStatus((s) => ({ ...s, db: "error" }));
        setDbError(data.error || "Failed to initialize database");
      }
    } catch (err) {
      setStepStatus((s) => ({ ...s, db: "error" }));
      setDbError("Network error initializing database");
    }
  }

  async function activateLicense() {
    setLicenseError("");
    setStepStatus((s) => ({ ...s, license: "loading" }));
    try {
      const res = await fetch("/api/setup/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: licenseKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStepStatus((s) => ({ ...s, license: "done" }));
        setCurrentStep("admin");
      } else {
        setStepStatus((s) => ({ ...s, license: "error" }));
        setLicenseError(data.error || "License activation failed");
      }
    } catch {
      setStepStatus((s) => ({ ...s, license: "error" }));
      setLicenseError("Network error during activation");
    }
  }

  async function createAdmin() {
    setAdminError("");
    if (!adminForm.name || !adminForm.email || !adminForm.password) {
      setAdminError("All fields are required");
      return;
    }
    if (adminForm.password !== adminForm.confirmPassword) {
      setAdminError("Passwords do not match");
      return;
    }
    if (adminForm.password.length < 8) {
      setAdminError("Password must be at least 8 characters");
      return;
    }
    setStepStatus((s) => ({ ...s, admin: "loading" }));
    try {
      const res = await fetch("/api/setup/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: adminForm.name,
          email: adminForm.email,
          password: adminForm.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStepStatus((s) => ({ ...s, admin: "done" }));
        setTimeout(() => router.push("/login"), 1500);
      } else {
        setStepStatus((s) => ({ ...s, admin: "error" }));
        setAdminError(data.error || "Failed to create admin account");
      }
    } catch {
      setStepStatus((s) => ({ ...s, admin: "error" }));
      setAdminError("Network error creating admin");
    }
  }

  const steps = [
    { key: "db", label: "Database", icon: "🗄️" },
    { key: "license", label: "License", icon: "🔑" },
    { key: "admin", label: "Admin Account", icon: "👤" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-2xl font-bold text-white">POS System Setup</h1>
          <p className="text-slate-400 text-sm mt-1">Powered by Zenthoz Technologies</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  currentStep === step.key
                    ? "bg-blue-600 text-white"
                    : stepStatus[step.key as Step] === "done"
                    ? "bg-green-600/20 text-green-400"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                <span>{step.icon}</span>
                <span>{step.label}</span>
                {stepStatus[step.key as Step] === "done" && <span>✓</span>}
              </div>
              {idx < steps.length - 1 && (
                <div className="w-6 h-px bg-slate-700 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          {/* DB Step */}
          {currentStep === "db" && (
            <div className="text-center">
              <div className="text-4xl mb-4">🗄️</div>
              <h2 className="text-xl font-semibold text-white mb-2">Initializing Database</h2>
              <p className="text-slate-400 text-sm mb-6">
                Setting up the local SQLite database for offline operation.
              </p>
              {stepStatus.db === "loading" && (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-slate-300 text-sm">Initializing...</span>
                </div>
              )}
              {stepStatus.db === "error" && (
                <div className="space-y-3">
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
                    {dbError}
                  </div>
                  <button
                    onClick={initDb}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* License Step */}
          {currentStep === "license" && (
            <div>
              <div className="text-center mb-5">
                <div className="text-4xl mb-3">🔑</div>
                <h2 className="text-xl font-semibold text-white">Activate License</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Enter your license key to activate this installation.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-slate-500 mb-1">Device ID (share with Zenthoz for license)</p>
                <p className="text-sm font-mono text-blue-300 select-all">{machineId || "Loading..."}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">License Key</label>
                  <input
                    type="text"
                    placeholder="ZPOS-XXXX-XXXX-XXXX-XXXX"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                {licenseError && (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
                    {licenseError}
                  </div>
                )}
                <button
                  onClick={activateLicense}
                  disabled={!licenseKey || stepStatus.license === "loading"}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {stepStatus.license === "loading" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Activating...
                    </>
                  ) : (
                    "Activate License"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Admin Step */}
          {currentStep === "admin" && (
            <div>
              <div className="text-center mb-5">
                <div className="text-4xl mb-3">👤</div>
                <h2 className="text-xl font-semibold text-white">Create Admin Account</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Set up the administrator account for this POS system.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    placeholder="Admin Name"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Email</label>
                  <input
                    type="email"
                    placeholder="admin@example.com"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Password</label>
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    value={adminForm.confirmPassword}
                    onChange={(e) => setAdminForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                {adminError && (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
                    {adminError}
                  </div>
                )}
                {stepStatus.admin === "done" && (
                  <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-green-400 text-sm text-center">
                    Admin account created! Redirecting to login...
                  </div>
                )}
                <button
                  onClick={createAdmin}
                  disabled={stepStatus.admin === "loading" || stepStatus.admin === "done"}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {stepStatus.admin === "loading" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Admin & Finish"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Zenthoz Technologies &copy; 2024
        </p>
      </div>
    </div>
  );
}
