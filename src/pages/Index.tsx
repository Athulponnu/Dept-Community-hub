import { useState, useEffect } from "react";
import LoginPage from "@/components/LoginPage";
import StudentDashboard from "@/components/StudentDashboard";
import TeacherDashboard from "@/components/TeacherDashboard";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Safety timeout — if session check takes >3s, show login
    const timeout = setTimeout(() => setChecking(false), 3000);

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();
          if (profile?.role) setRole(profile.role as "student" | "teacher");
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        clearTimeout(timeout);
        setChecking(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) { setRole(null); return; }
    });

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const handleLogin = async (userRole: "student" | "teacher") => {
    if (userRole === "student") {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("login_events").insert({
            id: `login_${Date.now()}`,
            student_id: user.id,
            logged_in_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Failed to log login event:", err);
      }
    }
    setRole(userRole);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading CHUB...</p>
        </div>
      </div>
    );
  }

  if (!role) return <LoginPage onLogin={handleLogin} />;
  if (role === "student") return <StudentDashboard onLogout={() => setRole(null)} />;
  return <TeacherDashboard onLogout={() => setRole(null)} />;
};

export default Index;