import { useState } from "react";
import LoginPage from "@/components/LoginPage";
import StudentDashboard from "@/components/StudentDashboard";
import TeacherDashboard from "@/components/TeacherDashboard";

const Index = () => {
  const [role, setRole] = useState<"student" | "teacher" | null>(null);

  if (!role) {
    return <LoginPage onLogin={setRole} />;
  }

  if (role === "student") {
    return <StudentDashboard onLogout={() => setRole(null)} />;
  }

  return <TeacherDashboard onLogout={() => setRole(null)} />;
};

export default Index;
