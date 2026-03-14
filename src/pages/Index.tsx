import { useState } from "react";
import LoginPage from "@/components/LoginPage";
import StudentDashboard from "@/components/StudentDashboard";
import TeacherDashboard from "@/components/TeacherDashboard";
import { supabase } from "@/lib/supabase";

const Index = () => {
  const [role, setRole] = useState<"student" | "teacher" | null>(null);

  const handleLogin = async (userRole: "student" | "teacher") => {
    // Track login event for students
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

  if (!role) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (role === "student") {
    return <StudentDashboard onLogout={() => setRole(null)} />;
  }

  return <TeacherDashboard onLogout={() => setRole(null)} />;
};

export default Index;
