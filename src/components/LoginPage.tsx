import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LoginPageProps {
  onLogin: (role: "student" | "teacher") => void;
}

type Mode = "login" | "signup";

// ── Lightning bolt SVG (layered glow like the reference image) ──
const LightningBolt = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 100 140" className={className} xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
    <defs>
      <radialGradient id="bolt-core" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFFDE5" />
        <stop offset="40%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#FF8C00" />
      </radialGradient>
      <radialGradient id="bolt-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFAA00" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#FF6600" stopOpacity="0" />
      </radialGradient>
      <filter id="blur-heavy">
        <feGaussianBlur stdDeviation="12" />
      </filter>
      <filter id="blur-medium">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id="blur-light">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    </defs>
    {/* Layer 4 — outer glow radial blob */}
    <ellipse cx="50" cy="80" rx="55" ry="70" fill="url(#bolt-glow)" filter="url(#blur-heavy)" opacity="0.5" style={{ mixBlendMode: "plus-lighter" as any }} />
    {/* Layer 3 — medium glow */}
    <path d="M58 5 L18 72 L45 72 L42 135 L82 68 L55 68 Z" fill="#FFAA00" filter="url(#blur-medium)" opacity="0.5" style={{ mixBlendMode: "plus-lighter" as any }} />
    {/* Layer 2 — white soft blur */}
    <path d="M58 5 L18 72 L45 72 L42 135 L82 68 L55 68 Z" fill="white" filter="url(#blur-light)" opacity="0.7" />
    {/* Layer 1 — crisp outline */}
    <path d="M58 5 L18 72 L45 72 L42 135 L82 68 L55 68 Z" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
    {/* Core bolt */}
    <path d="M58 5 L18 72 L45 72 L42 135 L82 68 L55 68 Z" fill="url(#bolt-core)" />
  </svg>
);

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | null>(null);
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupDepartment, setSignupDepartment] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetFields = () => {
    setEmail(""); setPassword("");
    setSignupName(""); setSignupEmail("");
    setSignupPassword(""); setSignupConfirmPassword("");
    setSignupDepartment("");
    setError(null); setSuccessMsg(null);
  };

  const switchMode = (newMode: Mode) => { setMode(newMode); resetFields(); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true); setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError("Invalid email or password."); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      if (!profile) { setError("Could not fetch user role. Contact admin."); return; }
      if (profile.role !== selectedRole) {
        setError(`This account is not registered as a ${selectedRole}.`);
        await supabase.auth.signOut(); return;
      }
      onLogin(profile.role as "student" | "teacher");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true); setError(null); setSuccessMsg(null);
    if (!signupName.trim()) { setError("Please enter your full name."); setLoading(false); return; }
    if (signupPassword.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
    if (signupPassword !== signupConfirmPassword) { setError("Passwords do not match."); setLoading(false); return; }
    if (selectedRole === "teacher" && !signupDepartment.trim()) { setError("Please enter your department."); setLoading(false); return; }
    try {
      const { data, error: signupError } = await supabase.auth.signUp({ email: signupEmail, password: signupPassword });
      if (signupError) { setError(signupError.message); return; }
      if (!data.user) { setError("Signup failed. Please try again."); return; }
      const userId = data.user.id;
      const avatarInitials = signupName.trim().split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
      await supabase.from("profiles").insert({ id: userId, role: selectedRole });
      if (selectedRole === "student") {
        await supabase.from("students").insert({ id: userId, name: signupName.trim(), email: signupEmail, avatar: avatarInitials, contributions: 0 });
      } else {
        await supabase.from("teachers").insert({ id: userId, name: signupName.trim(), email: signupEmail, avatar: avatarInitials, department: signupDepartment.trim(), subjects: [] });
      }
      setSuccessMsg(data.session ? "Account created! Signing you in..." : "Check your email to confirm your account.");
      if (data.session) setTimeout(() => onLogin(selectedRole), 1000);
      else setTimeout(() => switchMode("login"), 2000);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  // ── Accent colors per role ──
  const isStudent = selectedRole === "student";
  const isTeacher = selectedRole === "teacher";
  const accentColor = isTeacher ? "#a78bfa" : "#FFD700";
  const accentGlow = isTeacher ? "rgba(167,139,250,0.15)" : "rgba(255,215,0,0.12)";
  const accentBorder = isTeacher ? "rgba(167,139,250,0.4)" : "rgba(255,215,0,0.4)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');

        .chub-input {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: white !important;
          border-radius: 10px !important;
          height: 44px !important;
          font-family: 'Sora', sans-serif !important;
          font-size: 13px !important;
          transition: border-color 0.2s, background 0.2s !important;
        }
        .chub-input:focus {
          outline: none !important;
          border-color: var(--accent-color, #FFD700) !important;
          background: rgba(255,255,255,0.08) !important;
          box-shadow: 0 0 0 3px var(--accent-glow, rgba(255,215,0,0.12)) !important;
        }
        .chub-input::placeholder { color: rgba(255,255,255,0.3) !important; }
        .chub-label { color: rgba(255,255,255,0.6) !important; font-size: 12px !important; font-weight: 500 !important; letter-spacing: 0.05em !important; text-transform: uppercase !important; }

        .role-btn { transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1) !important; }
        .role-btn:hover { transform: translateY(-2px) !important; }

        .bolt-float { animation: boltFloat 4s ease-in-out infinite; }
        @keyframes boltFloat {
          0%, 100% { transform: translateY(0px) rotate(-5deg); }
          50% { transform: translateY(-12px) rotate(-5deg); }
        }

        .shimmer-line {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          animation: shimmer 3s infinite;
        }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

        .form-slide { animation: formSlide 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes formSlide { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        .tab-active {
          background: rgba(255,255,255,0.1) !important;
          color: white !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
        }

        .glow-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.2s !important;
        }
        .glow-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%);
          transition: transform 0.4s;
        }
        .glow-btn:hover::before { transform: translateX(100%); }
        .glow-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px var(--btn-shadow, rgba(255,215,0,0.3)) !important; }

        .noise-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.4;
        }
      `}</style>

      {/* Noise texture */}
      <div className="noise-overlay" />

      {/* Background orbs */}
      <div style={{ position: "fixed", top: "-200px", left: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,165,0,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-200px", right: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(100,60,255,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: "800px", height: "400px", background: "radial-gradient(ellipse, rgba(255,200,0,0.03) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Grid lines */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none", zIndex: 0 }} />

      {/* Main container */}
      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 10 }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          {/* Lightning bolt hero */}
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", position: "relative" }}>
            <div style={{ position: "absolute", width: "120px", height: "120px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,200,0,0.2) 0%, transparent 70%)", filter: "blur(20px)" }} />
            <LightningBolt className="bolt-float" style={{ width: "52px", height: "72px", position: "relative", zIndex: 1 } as any} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ height: "1px", width: "40px", background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.4))" }} />
            <h1 style={{ fontSize: "32px", fontWeight: "800", color: "white", letterSpacing: "-0.02em", margin: 0 }}>
              C<span style={{ color: "#FFD700" }}>HUB</span>
            </h1>
            <div style={{ height: "1px", width: "40px", background: "linear-gradient(90deg, rgba(255,215,0,0.4), transparent)" }} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", fontWeight: "400", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
            Department Harmony Hub
          </p>
        </div>

        {/* ── ROLE SELECTION ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
          {/* Student */}
          <button
            className="role-btn"
            onClick={() => { setSelectedRole("student"); resetFields(); setMode("login"); }}
            style={{
              padding: "20px 16px",
              borderRadius: "16px",
              border: `1px solid ${isStudent ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.08)"}`,
              background: isStudent ? "rgba(255,215,0,0.08)" : "rgba(255,255,255,0.03)",
              cursor: "pointer",
              boxShadow: isStudent ? "0 0 24px rgba(255,215,0,0.1), inset 0 1px 0 rgba(255,215,0,0.2)" : "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isStudent && <div className="shimmer-line" style={{ position: "absolute", inset: 0, height: "100%" }} />}
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>⚡</div>
            <p style={{ color: isStudent ? "#FFD700" : "rgba(255,255,255,0.5)", fontWeight: "600", fontSize: "14px", margin: 0, fontFamily: "'Sora', sans-serif" }}>Student</p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", margin: "3px 0 0 0", fontFamily: "'Sora', sans-serif" }}>Learn & grow</p>
          </button>

          {/* Teacher */}
          <button
            className="role-btn"
            onClick={() => { setSelectedRole("teacher"); resetFields(); setMode("login"); }}
            style={{
              padding: "20px 16px",
              borderRadius: "16px",
              border: `1px solid ${isTeacher ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.08)"}`,
              background: isTeacher ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.03)",
              cursor: "pointer",
              boxShadow: isTeacher ? "0 0 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(167,139,250,0.2)" : "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isTeacher && <div className="shimmer-line" style={{ position: "absolute", inset: 0, height: "100%" }} />}
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎓</div>
            <p style={{ color: isTeacher ? "#a78bfa" : "rgba(255,255,255,0.5)", fontWeight: "600", fontSize: "14px", margin: 0, fontFamily: "'Sora', sans-serif" }}>Teacher</p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", margin: "3px 0 0 0", fontFamily: "'Sora', sans-serif" }}>Guide & inspire</p>
          </button>
        </div>

        {/* ── FORM CARD ── */}
        {selectedRole && (
          <div
            className="form-slide"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${accentBorder}`,
              borderRadius: "20px",
              padding: "28px",
              backdropFilter: "blur(20px)",
              boxShadow: `0 0 40px ${accentGlow}, 0 20px 60px rgba(0,0,0,0.4)`,
              "--accent-color": accentColor,
              "--accent-glow": accentGlow,
              "--btn-shadow": accentGlow.replace("0.12", "0.4"),
            } as React.CSSProperties}
          >
            {/* Role indicator strip */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <div style={{ width: "3px", height: "20px", borderRadius: "2px", background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
              <span style={{ color: accentColor, fontSize: "11px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {selectedRole} portal
              </span>
            </div>

            {/* Mode tabs */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "3px", marginBottom: "24px", gap: "2px" }}>
              {(["login", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={mode === m ? "tab-active" : ""}
                  style={{
                    flex: 1, padding: "8px", borderRadius: "8px", border: "none",
                    background: "transparent", color: mode === m ? "white" : "rgba(255,255,255,0.35)",
                    fontWeight: "600", fontSize: "13px", cursor: "pointer",
                    fontFamily: "'Sora', sans-serif", transition: "all 0.2s",
                    letterSpacing: "0.02em",
                  }}
                >
                  {m === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            {/* Success message */}
            {successMsg && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "10px", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", fontSize: "13px" }}>
                {successMsg}
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {mode === "login" && (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Label htmlFor="email" className="chub-label">Email Address</Label>
                  <Input id="email" type="email" placeholder={`you@dept.edu`} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="chub-input" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Label htmlFor="password" className="chub-label">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="chub-input" />
                </div>
                {error && (
                  <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "13px" }}>{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="glow-btn"
                  style={{
                    width: "100%", padding: "12px", borderRadius: "12px", border: "none",
                    background: isTeacher
                      ? "linear-gradient(135deg, #7c3aed, #a78bfa)"
                      : "linear-gradient(135deg, #d97706, #FFD700)",
                    color: isTeacher ? "white" : "#1a0e00",
                    fontWeight: "700", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "'Sora', sans-serif", letterSpacing: "0.04em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    opacity: loading ? 0.7 : 1,
                    "--btn-shadow": isTeacher ? "rgba(124,58,237,0.5)" : "rgba(255,215,0,0.4)",
                  } as React.CSSProperties}
                >
                  {loading ? <><Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Signing in...</> : `Enter as ${selectedRole === "student" ? "Student" : "Teacher"} →`}
                </button>
                <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.3)", margin: 0 }}>
                  No account?{" "}
                  <button type="button" onClick={() => switchMode("signup")} style={{ color: accentColor, background: "none", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "12px", fontFamily: "'Sora', sans-serif" }}>
                    Create one
                  </button>
                </p>
              </form>
            )}

            {/* ── SIGNUP FORM ── */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Label className="chub-label">Full Name</Label>
                  <Input type="text" placeholder={selectedRole === "student" ? "e.g. Aarav Sharma" : "e.g. Dr. Meera Nair"} value={signupName} onChange={(e) => setSignupName(e.target.value)} required className="chub-input" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Label className="chub-label">Email Address</Label>
                  <Input type="email" placeholder="you@dept.edu" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required autoComplete="email" className="chub-input" />
                </div>
                {selectedRole === "teacher" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <Label className="chub-label">Department</Label>
                    <Input type="text" placeholder="e.g. Computer Science" value={signupDepartment} onChange={(e) => setSignupDepartment(e.target.value)} required className="chub-input" />
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <Label className="chub-label">Password</Label>
                    <Input type="password" placeholder="Min. 6 chars" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required autoComplete="new-password" className="chub-input" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <Label className="chub-label">Confirm</Label>
                    <Input type="password" placeholder="••••••••" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} required autoComplete="new-password" className="chub-input" />
                  </div>
                </div>
                {error && (
                  <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "13px" }}>{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="glow-btn"
                  style={{
                    width: "100%", padding: "12px", borderRadius: "12px", border: "none",
                    background: isTeacher
                      ? "linear-gradient(135deg, #7c3aed, #a78bfa)"
                      : "linear-gradient(135deg, #d97706, #FFD700)",
                    color: isTeacher ? "white" : "#1a0e00",
                    fontWeight: "700", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "'Sora', sans-serif", letterSpacing: "0.04em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    opacity: loading ? 0.7 : 1,
                    "--btn-shadow": isTeacher ? "rgba(124,58,237,0.5)" : "rgba(255,215,0,0.4)",
                  } as React.CSSProperties}
                >
                  {loading ? <><Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Creating...</> : "Create Account →"}
                </button>
                <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.3)", margin: 0 }}>
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchMode("login")} style={{ color: accentColor, background: "none", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "12px", fontFamily: "'Sora', sans-serif" }}>
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px" }}>
            <div style={{ height: "1px", flex: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08))" }} />
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase" }}>crafted with</span>
            <span style={{ fontSize: "12px" }}>⚡</span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase" }}>by</span>
            <div style={{ height: "1px", flex: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)" }} />
          </div>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", fontFamily: "'Sora', sans-serif" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Buddies from </span>
            <span style={{
              background: "linear-gradient(90deg, #FFD700, #FF8C00, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>AI &amp; Machine Learning</span>
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "10px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.05em" }}>
            CHUB © 2026 · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
