import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, Users, ArrowLeft, FileText, LogOut, Calendar, Loader2,
  KeyRound, File, Heart, Plus, Award, ClipboardList, ExternalLink,
  Trash2, BarChart3, Github, Linkedin, Code2, RefreshCw, Settings, Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Note {
  id: string; title: string; content: string; date: string;
  note_type?: string; file_url?: string | null; file_name?: string | null;
}
interface Subject { id: string; name: string; icon: string; notes: Note[]; }
interface DevGroup { id: string; name: string; description: string; members: number; max_members: number; tags: string[]; }
interface MyTeacher { id: string; name: string; email: string; avatar: string; department: string; }
interface Task { id: string; title: string; description: string | null; due_date: string | null; completed: boolean; teacher_id: string; }
interface Certification { id: string; title: string; issuer: string | null; date: string | null; url: string | null; }

interface ProgressData {
  github_username: string | null;
  wakatime_api_key: string | null;
  linkedin_post_count: number;
  github_contributions: number | null;
  wakatime_seconds: number | null;
  login_count: number;
}

interface StudentDashboardProps {
  onLogout: () => void;
}

const StudentDashboard = ({ onLogout }: StudentDashboardProps) => {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [devGroups, setDevGroups] = useState<DevGroup[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);
  const [myTeachers, setMyTeachers] = useState<MyTeacher[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [studentName, setStudentName] = useState("Student");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Progress state
  const [progressData, setProgressData] = useState<ProgressData>({
    github_username: null, wakatime_api_key: null, linkedin_post_count: 0,
    github_contributions: null, wakatime_seconds: null, login_count: 0,
  });
  const [progressLoading, setProgressLoading] = useState(false);
  const [showProgressSettings, setShowProgressSettings] = useState(false);
  const [editGithub, setEditGithub] = useState("");
  const [editWakatime, setEditWakatime] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Join subject
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);

  // Join teacher bud
  const [budCode, setBudCode] = useState("");
  const [budError, setBudError] = useState<string | null>(null);
  const [budSuccess, setBudSuccess] = useState<string | null>(null);
  const [joiningBud, setJoiningBud] = useState(false);
  const [showBudInput, setShowBudInput] = useState(false);

  // Add certification
  const [showAddCert, setShowAddCert] = useState(false);
  const [certTitle, setCertTitle] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certDate, setCertDate] = useState("");
  const [certUrl, setCertUrl] = useState("");
  const [addingCert, setAddingCert] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: student } = await supabase.from("students")
        .select("name, github_username, wakatime_api_key, linkedin_post_count")
        .eq("id", user.id).single();
      if (student) {
        setStudentName(student.name);
        setProgressData(prev => ({
          ...prev,
          github_username: student.github_username,
          wakatime_api_key: student.wakatime_api_key,
          linkedin_post_count: student.linkedin_post_count ?? 0,
        }));
        setEditGithub(student.github_username ?? "");
        setEditWakatime(student.wakatime_api_key ?? "");
        setEditLinkedin(String(student.linkedin_post_count ?? 0));
      }

      // Subjects
      const { data: joinedSubjects } = await supabase.from("student_subjects").select("subject_id").eq("student_id", user.id);
      const joinedSubjectIds = joinedSubjects?.map((s) => s.subject_id) ?? [];
      if (joinedSubjectIds.length > 0) {
        const { data: subjectsData } = await supabase.from("subjects").select("*, notes(*)").in("id", joinedSubjectIds);
        if (subjectsData) setSubjects(subjectsData);
      } else { setSubjects([]); }

      const { data: groupsData } = await supabase.from("dev_groups").select("*");
      if (groupsData) setDevGroups(groupsData);

      const { data: joinedData } = await supabase.from("student_groups").select("group_id").eq("student_id", user.id);
      if (joinedData) setJoinedGroups(joinedData.map((g) => g.group_id));

      const { data: teacherLinks } = await supabase.from("teacher_students").select("teacher_id").eq("student_id", user.id);
      if (teacherLinks && teacherLinks.length > 0) {
        const teacherIds = teacherLinks.map((t) => t.teacher_id);
        const { data: teachersData } = await supabase.from("teachers").select("id, name, email, avatar, department").in("id", teacherIds);
        if (teachersData) setMyTeachers(teachersData);
      } else { setMyTeachers([]); }

      const { data: tasksData } = await supabase.from("tasks").select("*").eq("student_id", user.id).order("created_at", { ascending: false });
      if (tasksData) setTasks(tasksData);

      const { data: certsData } = await supabase.from("certifications").select("*").eq("student_id", user.id).order("date", { ascending: false });
      if (certsData) setCertifications(certsData);

      // Login count
      const { count } = await supabase.from("login_events").select("*", { count: "exact", head: true }).eq("student_id", user.id);
      setProgressData(prev => ({ ...prev, login_count: count ?? 0 }));

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressMetrics = async () => {
    setProgressLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: student } = await supabase.from("students")
        .select("github_username, wakatime_api_key, linkedin_post_count")
        .eq("id", user.id).single();

      if (!student) return;

      let github_contributions: number | null = null;
      let wakatime_seconds: number | null = null;

      // GitHub contributions (last 30 days via public API)
      if (student.github_username) {
        try {
          const response = await fetch(
            `https://api.github.com/users/${student.github_username}/events/public?per_page=100`
          );
          if (response.ok) {
            const events = await response.json();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            github_contributions = events.filter((e: any) =>
              e.type === "PushEvent" && new Date(e.created_at) > thirtyDaysAgo
            ).reduce((sum: number, e: any) => sum + (e.payload?.commits?.length ?? 1), 0);
          }
        } catch (e) { console.error("GitHub fetch failed", e); }
      }

      // WakaTime coding time (last 7 days)
      if (student.wakatime_api_key) {
        try {
          const encoded = btoa(student.wakatime_api_key);
          const response = await fetch(
            `https://wakatime.com/api/v1/users/current/stats/last_7_days`,
            { headers: { Authorization: `Basic ${encoded}` } }
          );
          if (response.ok) {
            const data = await response.json();
            wakatime_seconds = data.data?.total_seconds ?? null;
          }
        } catch (e) { console.error("WakaTime fetch failed", e); }
      }

      setProgressData(prev => ({
        ...prev,
        github_username: student.github_username,
        wakatime_api_key: student.wakatime_api_key,
        linkedin_post_count: student.linkedin_post_count ?? 0,
        github_contributions,
        wakatime_seconds,
      }));
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setProgressLoading(false);
    }
  };

  const handleSaveProgressSettings = async () => {
    if (!userId) return;
    setSavingSettings(true);
    try {
      await supabase.from("students").update({
        github_username: editGithub.trim() || null,
        wakatime_api_key: editWakatime.trim() || null,
        linkedin_post_count: parseInt(editLinkedin) || 0,
      }).eq("id", userId);
      setProgressData(prev => ({
        ...prev,
        github_username: editGithub.trim() || null,
        wakatime_api_key: editWakatime.trim() || null,
        linkedin_post_count: parseInt(editLinkedin) || 0,
      }));
      setSettingsSaved(true);
      setShowProgressSettings(false);
      setTimeout(() => setSettingsSaved(false), 2000);
      await fetchProgressMetrics();
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Score calculation (0-100)
  const calcProgressScore = () => {
    let score = 0;
    // GitHub: up to 30 pts (1 pt per commit, max 30)
    score += Math.min(30, progressData.github_contributions ?? 0);
    // Login frequency: up to 20 pts (2 pts per login, max 20)
    score += Math.min(20, (progressData.login_count ?? 0) * 2);
    // LinkedIn: up to 20 pts (4 pts per post, max 20)
    score += Math.min(20, (progressData.linkedin_post_count ?? 0) * 4);
    // WakaTime: up to 30 pts (1 pt per hour, max 30)
    const hours = Math.floor((progressData.wakatime_seconds ?? 0) / 3600);
    score += Math.min(30, hours);
    return Math.min(100, score);
  };

  const formatWakatime = (seconds: number | null) => {
    if (seconds === null) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const handleToggleTask = async (taskId: string, current: boolean) => {
    await supabase.from("tasks").update({ completed: !current }).eq("id", taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed: !current } : t));
  };

  const handleAddCertification = async () => {
    if (!certTitle.trim() || !userId) return;
    setAddingCert(true); setCertError(null);
    try {
      const { error } = await supabase.from("certifications").insert({
        id: `cert_${Date.now()}`, student_id: userId, title: certTitle.trim(),
        issuer: certIssuer.trim() || null, date: certDate || null, url: certUrl.trim() || null,
      });
      if (error) { setCertError("Failed to add certification."); return; }
      setCertTitle(""); setCertIssuer(""); setCertDate(""); setCertUrl("");
      setShowAddCert(false); await fetchData();
    } catch (err) { setCertError("Something went wrong."); } finally { setAddingCert(false); }
  };

  const handleDeleteCert = async (certId: string) => {
    if (!confirm("Delete this certification?")) return;
    await supabase.from("certifications").delete().eq("id", certId);
    setCertifications((prev) => prev.filter((c) => c.id !== certId));
  };

  const handleJoinSubject = async () => {
    if (!joinCode.trim() || !userId) return;
    setJoining(true); setJoinError(null); setJoinSuccess(null);
    try {
      const { data: subject, error } = await supabase.from("subjects").select("id, name").eq("join_code", joinCode.trim().toUpperCase()).single();
      if (error || !subject) { setJoinError("Invalid code. Please check and try again."); return; }
      const { data: existing } = await supabase.from("student_subjects").select("subject_id").eq("student_id", userId).eq("subject_id", subject.id).maybeSingle();
      if (existing) { setJoinError("You've already joined this subject."); return; }
      await supabase.from("student_subjects").insert({ student_id: userId, subject_id: subject.id });
      setJoinSuccess(`Successfully joined "${subject.name}"! 🎉`);
      setJoinCode(""); setShowJoinInput(false); await fetchData();
    } catch (err) { setJoinError("Something went wrong. Try again."); } finally { setJoining(false); }
  };

  const handleJoinTeacher = async () => {
    if (!budCode.trim() || !userId) return;
    setJoiningBud(true); setBudError(null); setBudSuccess(null);
    try {
      const { data: teacher, error } = await supabase.from("teachers").select("id, name").eq("bud_code", budCode.trim().toUpperCase()).single();
      if (error || !teacher) { setBudError("Invalid bud code. Ask your teacher for the correct code."); return; }
      const { data: existing } = await supabase.from("teacher_students").select("teacher_id").eq("teacher_id", teacher.id).eq("student_id", userId).maybeSingle();
      if (existing) { setBudError("You're already a bud of this teacher."); return; }
      await supabase.from("teacher_students").insert({ teacher_id: teacher.id, student_id: userId });
      setBudSuccess(`You are now a bud of ${teacher.name}! ❤️`);
      setBudCode(""); setShowBudInput(false); await fetchData();
    } catch (err) { setBudError("Something went wrong. Try again."); } finally { setJoiningBud(false); }
  };

  const toggleGroup = async (groupId: string) => {
    if (!userId) return;
    const isJoined = joinedGroups.includes(groupId);
    if (isJoined) {
      await supabase.from("student_groups").delete().eq("student_id", userId).eq("group_id", groupId);
      await supabase.from("dev_groups").update({ members: (devGroups.find(g => g.id === groupId)?.members ?? 1) - 1 }).eq("id", groupId);
      setJoinedGroups((prev) => prev.filter((id) => id !== groupId));
      setDevGroups((prev) => prev.map(g => g.id === groupId ? { ...g, members: g.members - 1 } : g));
    } else {
      await supabase.from("student_groups").insert({ student_id: userId, group_id: groupId });
      await supabase.from("dev_groups").update({ members: (devGroups.find(g => g.id === groupId)?.members ?? 0) + 1 }).eq("id", groupId);
      setJoinedGroups((prev) => [...prev, groupId]);
      setDevGroups((prev) => prev.map(g => g.id === groupId ? { ...g, members: g.members + 1 } : g));
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); onLogout(); };
  const completedTasks = tasks.filter((t) => t.completed).length;
  const overallScore = calcProgressScore();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Student Portal</h1>
              <p className="text-xs text-muted-foreground">Welcome back, {studentName}!</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground"><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="subjects" className="space-y-6">
          <TabsList className="bg-muted/60 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="subjects" className="gap-1.5"><FileText className="w-4 h-4" /> Subjects</TabsTrigger>
            <TabsTrigger value="progress" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Progress</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5">
              <ClipboardList className="w-4 h-4" /> Tasks
              {tasks.length - completedTasks > 0 && <Badge className="ml-1 h-4 px-1 text-xs bg-primary text-primary-foreground">{tasks.length - completedTasks}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="certifications" className="gap-1.5"><Award className="w-4 h-4" /> Certifications</TabsTrigger>
            <TabsTrigger value="myteachers" className="gap-1.5"><Heart className="w-4 h-4" /> My Teachers</TabsTrigger>
            <TabsTrigger value="devgroups" className="gap-1.5"><Users className="w-4 h-4" /> Dev Groups</TabsTrigger>
          </TabsList>

          {/* ── SUBJECTS TAB ── */}
          <TabsContent value="subjects">
            {selectedNote ? (
              <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground" onClick={() => setSelectedNote(null)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to {selectedSubject?.name}
                </Button>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="w-3.5 h-3.5" /> {selectedNote.date}
                      <Badge variant="secondary" className="ml-1 text-xs font-normal">{selectedNote.note_type === "file" ? "File" : "Text"}</Badge>
                    </div>
                    <CardTitle>{selectedNote.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedNote.note_type === "file" && selectedNote.file_url ? (
                      <a href={selectedNote.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                        <File className="w-4 h-4" />{selectedNote.file_name ?? "Download file"}
                      </a>
                    ) : (
                      <p className="text-foreground/80 leading-relaxed">{selectedNote.content}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : selectedSubject ? (
              <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground" onClick={() => setSelectedSubject(null)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> All Subjects
                </Button>
                <h2 className="text-2xl font-bold mb-1">{selectedSubject.icon} {selectedSubject.name}</h2>
                <p className="text-muted-foreground mb-5">{selectedSubject.notes.length} notes available</p>
                <div className="grid gap-3">
                  {selectedSubject.notes.length === 0 ? (
                    <Card><CardContent className="p-8 text-center text-muted-foreground">No notes yet for this subject.</CardContent></Card>
                  ) : selectedSubject.notes.map((note) => (
                    <Card key={note.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group" onClick={() => setSelectedNote(note)}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">{note.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-muted-foreground">{note.date}</p>
                            <Badge variant="secondary" className="text-xs font-normal">{note.note_type === "file" ? "File" : "Text"}</Badge>
                          </div>
                        </div>
                        {note.note_type === "file" ? <File className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" /> : <FileText className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-200">
                <div className="mb-6">
                  {joinSuccess && <div className="mb-3 text-sm text-accent bg-accent/10 px-3 py-2 rounded-lg">{joinSuccess}</div>}
                  {!showJoinInput ? (
                    <Button variant="outline" onClick={() => { setShowJoinInput(true); setJoinSuccess(null); }} className="gap-2"><KeyRound className="w-4 h-4" /> Join Subject with Code</Button>
                  ) : (
                    <Card className="border-primary/30">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium mb-3">Enter the subject join code from your teacher:</p>
                        <div className="flex gap-2">
                          <Input placeholder="e.g. DS101" value={joinCode} onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null); }} className="max-w-[160px] font-mono tracking-widest uppercase" onKeyDown={(e) => e.key === "Enter" && handleJoinSubject()} />
                          <Button onClick={handleJoinSubject} disabled={joining || !joinCode.trim()}>{joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}</Button>
                          <Button variant="ghost" onClick={() => { setShowJoinInput(false); setJoinError(null); setJoinCode(""); }}>Cancel</Button>
                        </div>
                        {joinError && <p className="text-sm text-destructive mt-2">{joinError}</p>}
                      </CardContent>
                    </Card>
                  )}
                </div>
                {subjects.length === 0 ? (
                  <Card className="border-dashed"><CardContent className="p-12 text-center"><KeyRound className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><h3 className="font-semibold text-lg mb-1">No subjects yet</h3><p className="text-muted-foreground text-sm">Ask your teacher for a join code to get started.</p></CardContent></Card>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((subject) => (
                      <Card key={subject.id} className="cursor-pointer hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all group" onClick={() => setSelectedSubject(subject)}>
                        <CardContent className="p-5">
                          <div className="text-3xl mb-3">{subject.icon}</div>
                          <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{subject.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{subject.notes.length} notes</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── PROGRESS TAB ── */}
          <TabsContent value="progress">
            <div className="space-y-5">

              {/* Overall Score Card */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-bold text-xl mb-1">Overall Activity Score</h3>
                      <p className="text-sm text-muted-foreground">Based on GitHub, logins, LinkedIn & VS Code activity</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-5xl font-bold text-primary">{overallScore}</p>
                        <p className="text-xs text-muted-foreground mt-1">/ 100</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={overallScore} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Beginner</span>
                      <span>Intermediate</span>
                      <span>Expert</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={fetchProgressMetrics} disabled={progressLoading} variant="outline" className="gap-2">
                  {progressLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Refresh Metrics
                </Button>
                <Button onClick={() => setShowProgressSettings(!showProgressSettings)} variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" /> {showProgressSettings ? "Hide Settings" : "Connect Accounts"}
                </Button>
                {settingsSaved && (
                  <span className="text-sm text-accent flex items-center gap-1"><Check className="w-4 h-4" /> Saved!</span>
                )}
              </div>

              {/* Settings Panel */}
              {showProgressSettings && (
                <Card className="border-primary/30 animate-in fade-in duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Connect Your Accounts</CardTitle>
                    <CardDescription>Link your accounts to automatically track your activity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Github className="w-4 h-4" /> GitHub Username</Label>
                      <Input placeholder="e.g. octocat" value={editGithub} onChange={(e) => setEditGithub(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Tracks your commit count in the last 30 days</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Code2 className="w-4 h-4" /> WakaTime API Key</Label>
                      <Input placeholder="waka_..." value={editWakatime} onChange={(e) => setEditWakatime(e.target.value)} type="password" />
                      <p className="text-xs text-muted-foreground">
                        Get your key at{" "}
                        <a href="https://wakatime.com/settings/api-key" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">wakatime.com/settings/api-key</a>
                        {" "}→ Install the VS Code extension to start tracking
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn Posts This Month</Label>
                      <Input type="number" min="0" placeholder="0" value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)} className="max-w-[120px]" />
                      <p className="text-xs text-muted-foreground">Manually enter your LinkedIn post count this month</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveProgressSettings} disabled={savingSettings}>
                        {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />} Save & Refresh
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowProgressSettings(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Metric Cards */}
              <div className="grid sm:grid-cols-2 gap-4">

                {/* GitHub */}
                <Card className={progressData.github_username ? "border-border" : "border-dashed"}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Github className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold">GitHub Contributions</h3>
                        <p className="text-xs text-muted-foreground">Last 30 days • commits</p>
                      </div>
                    </div>
                    {progressData.github_username ? (
                      <>
                        <p className="text-4xl font-bold text-primary mb-1">
                          {progressLoading ? <Loader2 className="w-6 h-6 animate-spin inline" /> : (progressData.github_contributions ?? "—")}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">@{progressData.github_username}</p>
                        <Progress value={Math.min(100, ((progressData.github_contributions ?? 0) / 30) * 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{Math.min(30, progressData.github_contributions ?? 0)} / 30 pts</p>
                      </>
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-sm text-muted-foreground mb-2">GitHub not connected</p>
                        <Button size="sm" variant="outline" onClick={() => setShowProgressSettings(true)} className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Connect</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Login Frequency */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-bold">Login Frequency</h3>
                        <p className="text-xs text-muted-foreground">Total portal logins</p>
                      </div>
                    </div>
                    <p className="text-4xl font-bold text-accent mb-1">{progressData.login_count}</p>
                    <p className="text-xs text-muted-foreground mb-3">times logged in</p>
                    <Progress value={Math.min(100, (progressData.login_count / 10) * 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{Math.min(20, progressData.login_count * 2)} / 20 pts</p>
                  </CardContent>
                </Card>

                {/* LinkedIn */}
                <Card className={progressData.linkedin_post_count > 0 ? "border-border" : "border-dashed"}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Linkedin className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-bold">LinkedIn Posts</h3>
                        <p className="text-xs text-muted-foreground">This month • manual entry</p>
                      </div>
                    </div>
                    {progressData.linkedin_post_count > 0 ? (
                      <>
                        <p className="text-4xl font-bold text-blue-500 mb-1">{progressData.linkedin_post_count}</p>
                        <p className="text-xs text-muted-foreground mb-3">posts this month</p>
                        <Progress value={Math.min(100, (progressData.linkedin_post_count / 5) * 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{Math.min(20, progressData.linkedin_post_count * 4)} / 20 pts</p>
                      </>
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-sm text-muted-foreground mb-2">No posts recorded</p>
                        <Button size="sm" variant="outline" onClick={() => setShowProgressSettings(true)} className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Update Count</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* WakaTime */}
                <Card className={progressData.wakatime_api_key ? "border-border" : "border-dashed"}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Code2 className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-bold">VS Code Time</h3>
                        <p className="text-xs text-muted-foreground">Last 7 days • via WakaTime</p>
                      </div>
                    </div>
                    {progressData.wakatime_api_key ? (
                      <>
                        <p className="text-4xl font-bold text-orange-500 mb-1">
                          {progressLoading ? <Loader2 className="w-6 h-6 animate-spin inline" /> : formatWakatime(progressData.wakatime_seconds)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">coding this week</p>
                        <Progress value={Math.min(100, (Math.floor((progressData.wakatime_seconds ?? 0) / 3600) / 30) * 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{Math.min(30, Math.floor((progressData.wakatime_seconds ?? 0) / 3600))} / 30 pts</p>
                      </>
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-sm text-muted-foreground mb-1">WakaTime not connected</p>
                        <p className="text-xs text-muted-foreground mb-2">Install the VS Code extension first</p>
                        <Button size="sm" variant="outline" onClick={() => setShowProgressSettings(true)} className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Connect</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Scoring breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">Scoring Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "GitHub commits (last 30d)", value: Math.min(30, progressData.github_contributions ?? 0), max: 30, color: "bg-primary" },
                    { label: "Login frequency", value: Math.min(20, progressData.login_count * 2), max: 20, color: "bg-accent" },
                    { label: "LinkedIn posts", value: Math.min(20, progressData.linkedin_post_count * 4), max: 20, color: "bg-blue-500" },
                    { label: "VS Code hours (last 7d)", value: Math.min(30, Math.floor((progressData.wakatime_seconds ?? 0) / 3600)), max: 30, color: "bg-orange-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <p className="text-xs text-muted-foreground w-48 shrink-0">{item.label}</p>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${(item.value / item.max) * 100}%` }} />
                      </div>
                      <p className="text-xs font-bold w-12 text-right">{item.value}/{item.max}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── TASKS TAB ── */}
          <TabsContent value="tasks">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{completedTasks} of {tasks.length} tasks completed</p>
                {tasks.length > 0 && (
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${tasks.length ? (completedTasks / tasks.length) * 100 : 0}%` }} />
                  </div>
                )}
              </div>
              {tasks.length === 0 ? (
                <Card className="border-dashed"><CardContent className="p-12 text-center"><ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><h3 className="font-semibold text-lg mb-1">No tasks yet</h3><p className="text-muted-foreground text-sm">Your teachers will assign tasks here.</p></CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const teacher = myTeachers.find((t) => t.id === task.teacher_id);
                    return (
                      <Card key={task.id} className={`transition-all ${task.completed ? "border-accent/30 bg-accent/5" : "hover:border-primary/20"}`}>
                        <CardContent className="p-4 flex items-start gap-3">
                          <Checkbox checked={task.completed} onCheckedChange={() => handleToggleTask(task.id, task.completed)} className="mt-0.5" />
                          <div className="flex-1">
                            <p className={`font-semibold ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                            {task.description && <p className="text-sm text-muted-foreground mt-0.5">{task.description}</p>}
                            <div className="flex items-center gap-3 mt-1.5">
                              {task.due_date && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {task.due_date}</span>}
                              {teacher && <span className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3 text-destructive" /> {teacher.name}</span>}
                            </div>
                          </div>
                          {task.completed && <Badge className="bg-accent/20 text-accent border-0 text-xs">Done ✓</Badge>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── CERTIFICATIONS TAB ── */}
          <TabsContent value="certifications">
            <div className="space-y-4">
              {!showAddCert ? (
                <Button onClick={() => setShowAddCert(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Certification</Button>
              ) : (
                <Card className="border-primary/30">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Add Certification</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2"><Label>Title *</Label><Input placeholder="e.g. AWS Certified Developer" value={certTitle} onChange={(e) => setCertTitle(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Issuer</Label><Input placeholder="e.g. Amazon" value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Date</Label><Input type="date" value={certDate} onChange={(e) => setCertDate(e.target.value)} /></div>
                    </div>
                    <div className="space-y-2"><Label>Certificate URL <span className="text-muted-foreground font-normal">(optional)</span></Label><Input placeholder="https://..." value={certUrl} onChange={(e) => setCertUrl(e.target.value)} /></div>
                    {certError && <p className="text-sm text-destructive">{certError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddCertification} disabled={addingCert || !certTitle.trim()}>
                        {addingCert ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowAddCert(false); setCertError(null); setCertTitle(""); setCertIssuer(""); setCertDate(""); setCertUrl(""); }}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {certifications.length === 0 ? (
                <Card className="border-dashed"><CardContent className="p-12 text-center"><Award className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><h3 className="font-semibold text-lg mb-1">No certifications yet</h3><p className="text-muted-foreground text-sm">Add your certifications to showcase your skills.</p></CardContent></Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {certifications.map((cert) => (
                    <Card key={cert.id} className="group hover:border-primary/30 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Award className="w-4 h-4 text-primary" /></div>
                            <div>
                              <h3 className="font-semibold">{cert.title}</h3>
                              {cert.issuer && <p className="text-sm text-muted-foreground">{cert.issuer}</p>}
                              {cert.date && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" />{cert.date}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {cert.url && <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 p-1"><ExternalLink className="w-4 h-4" /></a>}
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0 transition-all" onClick={() => handleDeleteCert(cert.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── MY TEACHERS TAB ── */}
          <TabsContent value="myteachers">
            <div className="space-y-4">
              <div>
                {budSuccess && <div className="mb-3 text-sm text-accent bg-accent/10 px-3 py-2 rounded-lg">{budSuccess}</div>}
                {!showBudInput ? (
                  <Button variant="outline" onClick={() => { setShowBudInput(true); setBudSuccess(null); }} className="gap-2"><Heart className="w-4 h-4" /> Join a Teacher with Bud Code</Button>
                ) : (
                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-3">Enter your teacher's bud code:</p>
                      <div className="flex gap-2">
                        <Input placeholder="e.g. BUD1234" value={budCode} onChange={(e) => { setBudCode(e.target.value.toUpperCase()); setBudError(null); }} className="max-w-[160px] font-mono tracking-widest uppercase" onKeyDown={(e) => e.key === "Enter" && handleJoinTeacher()} />
                        <Button onClick={handleJoinTeacher} disabled={joiningBud || !budCode.trim()}>{joiningBud ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}</Button>
                        <Button variant="ghost" onClick={() => { setShowBudInput(false); setBudError(null); setBudCode(""); }}>Cancel</Button>
                      </div>
                      {budError && <p className="text-sm text-destructive mt-2">{budError}</p>}
                    </CardContent>
                  </Card>
                )}
              </div>
              {myTeachers.length === 0 ? (
                <Card className="border-dashed"><CardContent className="p-12 text-center"><Heart className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><h3 className="font-semibold text-lg mb-1">No teachers yet</h3><p className="text-muted-foreground text-sm">Ask your teacher for their bud code to connect.</p></CardContent></Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myTeachers.map((teacher) => (
                    <Card key={teacher.id} className="hover:border-primary/30 hover:shadow-md transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-12 h-12"><AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{teacher.avatar}</AvatarFallback></Avatar>
                          <div><h3 className="font-bold">{teacher.name}</h3><p className="text-xs text-muted-foreground">{teacher.email}</p></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-normal">{teacher.department}</Badge>
                          <Badge className="bg-primary/10 text-primary text-xs font-normal border-0">My Teacher ❤️</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── DEV GROUPS TAB ── */}
          <TabsContent value="devgroups">
            <div className="grid sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
              {devGroups.map((group) => {
                const isJoined = joinedGroups.includes(group.id);
                return (
                  <Card key={group.id} className={`transition-all ${isJoined ? "border-primary/40 shadow-md shadow-primary/5" : ""}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{group.name}</CardTitle>
                          <CardDescription className="mt-1">{group.description}</CardDescription>
                        </div>
                        {isJoined && <Badge className="bg-accent text-accent-foreground text-xs">Joined</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {group.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{group.members}/{group.max_members} members</span>
                        <Button size="sm" variant={isJoined ? "outline" : "default"} onClick={() => toggleGroup(group.id)}>{isJoined ? "Leave" : "Join"}</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
