import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LoginPageProps {
  onLogin: (role: "student" | "teacher") => void;
}

type Mode = "login" | "signup";

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | null>(null);
  const [mode, setMode] = useState<Mode>("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup fields
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

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    resetFields();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true); setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError("Invalid email or password. Please try again."); return; }

      const { data: profile, error: profileError } = await supabase
        .from("profiles").select("role").eq("id", data.user.id).single();

      if (profileError || !profile) { setError("Could not fetch user role. Contact admin."); return; }

      if (profile.role !== selectedRole) {
        setError(`This account is not registered as a ${selectedRole}.`);
        await supabase.auth.signOut();
        return;
      }

      onLogin(profile.role as "student" | "teacher");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true); setError(null); setSuccessMsg(null);

    // Validations
    if (!signupName.trim()) { setError("Please enter your full name."); setLoading(false); return; }
    if (signupPassword.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
    if (signupPassword !== signupConfirmPassword) { setError("Passwords do not match."); setLoading(false); return; }
    if (selectedRole === "teacher" && !signupDepartment.trim()) { setError("Please enter your department."); setLoading(false); return; }

    try {
      // 1. Sign up with Supabase Auth
      const { data, error: signupError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      });

      if (signupError) { setError(signupError.message); return; }
      if (!data.user) { setError("Signup failed. Please try again."); return; }

      const userId = data.user.id;
      const avatarInitials = signupName.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

      // 2. Insert into profiles
      await supabase.from("profiles").insert({ id: userId, role: selectedRole });

      // 3. Insert into students or teachers
      if (selectedRole === "student") {
        await supabase.from("students").insert({
          id: userId,
          name: signupName.trim(),
          email: signupEmail,
          avatar: avatarInitials,
          contributions: 0,
        });
      } else {
        await supabase.from("teachers").insert({
          id: userId,
          name: signupName.trim(),
          email: signupEmail,
          avatar: avatarInitials,
          department: signupDepartment.trim(),
          subjects: [],
        });
      }

      setSuccessMsg(`Account created! ${data.session ? "Signing you in..." : "Please check your email to confirm your account."}`);

      // If session exists (email confirmation disabled), log them in
      if (data.session) {
        setTimeout(() => onLogin(selectedRole), 1000);
      } else {
        setTimeout(() => switchMode("login"), 2000);
      }

    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-[-120px] left-[-120px] w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[350px] h-[350px] rounded-full bg-accent/10 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Department Portal</h1>
          <p className="text-muted-foreground mt-2">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => { setSelectedRole("student"); resetFields(); }}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${
              selectedRole === "student"
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border hover:border-primary/40 bg-card"
            }`}
          >
            <BookOpen className={`w-7 h-7 ${selectedRole === "student" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`font-semibold text-sm ${selectedRole === "student" ? "text-primary" : "text-foreground"}`}>Student</span>
          </button>

          <button
            onClick={() => { setSelectedRole("teacher"); resetFields(); }}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${
              selectedRole === "teacher"
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border hover:border-primary/40 bg-card"
            }`}
          >
            <GraduationCap className={`w-7 h-7 ${selectedRole === "teacher" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`font-semibold text-sm ${selectedRole === "teacher" ? "text-primary" : "text-foreground"}`}>Teacher</span>
          </button>
        </div>

        {selectedRole && (
          <Card className="border-border/60 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-4">
              {/* Login / Signup Toggle */}
              <div className="flex rounded-lg bg-muted p-1 mb-2">
                <button
                  onClick={() => switchMode("login")}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${mode === "login" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => switchMode("signup")}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${mode === "signup" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Create Account
                </button>
              </div>
              <CardTitle className="text-lg">
                {mode === "login" ? `${selectedRole === "student" ? "Student" : "Teacher"} Sign In` : `${selectedRole === "student" ? "Student" : "Teacher"} Registration`}
              </CardTitle>
              <CardDescription>
                {mode === "login" ? "Enter your credentials to access the portal" : "Fill in your details to create an account"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* SUCCESS MESSAGE */}
              {successMsg && (
                <div className="mb-4 text-sm text-accent bg-accent/10 px-3 py-2 rounded-lg">
                  {successMsg}
                </div>
              )}

              {/* ── LOGIN FORM ── */}
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder={`${selectedRole}@dept.edu`} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  </div>
                  {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
                  <Button type="submit" className="w-full font-semibold" disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Don't have an account?{" "}
                    <button type="button" onClick={() => switchMode("signup")} className="text-primary hover:underline font-medium">Create one</button>
                  </p>
                </form>
              )}

              {/* ── SIGNUP FORM ── */}
              {mode === "signup" && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" type="text" placeholder={selectedRole === "student" ? "e.g. Aarav Sharma" : "e.g. Dr. Meera Nair"} value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder={`${selectedRole}@dept.edu`} value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  {selectedRole === "teacher" && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-dept">Department</Label>
                      <Input id="signup-dept" type="text" placeholder="e.g. Computer Science" value={signupDepartment} onChange={(e) => setSignupDepartment(e.target.value)} required />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" placeholder="Min. 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required autoComplete="new-password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input id="signup-confirm" type="password" placeholder="••••••••" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} required autoComplete="new-password" />
                  </div>
                  {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
                  <Button type="submit" className="w-full font-semibold" disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</> : "Create Account"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={() => switchMode("login")} className="text-primary hover:underline font-medium">Sign in</button>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
