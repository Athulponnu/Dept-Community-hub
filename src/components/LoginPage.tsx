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

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Sign in with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      // 2. Fetch role from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("Could not fetch user role. Contact admin.");
        return;
      }

      // 3. Check if selected role matches actual role in DB
      if (profile.role !== selectedRole) {
        setError(`This account is not registered as a ${selectedRole}.`);
        await supabase.auth.signOut();
        return;
      }

      // 4. All good — pass role up to App.tsx
      onLogin(profile.role as "student" | "teacher");

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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Department Portal</h1>
          <p className="text-muted-foreground mt-2">Select your role to continue</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => { setSelectedRole("student"); setError(null); }}
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
            onClick={() => { setSelectedRole("teacher"); setError(null); }}
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
              <CardTitle className="text-lg">
                {selectedRole === "student" ? "Student" : "Teacher"} Login
              </CardTitle>
              <CardDescription>Enter your credentials to access the portal</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={`${selectedRole}@dept.edu`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Error message */}
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LoginPage;