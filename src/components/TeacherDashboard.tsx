import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GraduationCap, LogOut, BarChart3, Users, Award, TrendingUp, Loader2, Plus, Copy, Check, BookOpen, Trash2, ArrowLeft, FileText, Upload, File, Calendar, Heart, ClipboardList, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  contributions: number;
  progress: Record<string, number>;
  joinedGroups: string[];
}

interface Bud {
  id: string;
  name: string;
  email: string;
  avatar: string;
  contributions: number;
}

interface BudProfile extends Bud {
  certifications: Certification[];
  enrolledSubjects: { id: string; name: string; icon: string }[];
  tasks: Task[];
  progress: Record<string, number>;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  student_id: string;
  teacher_id: string;
}

interface Certification {
  id: string;
  title: string;
  issuer: string | null;
  date: string | null;
  url: string | null;
}

interface Subject {
  id: string;
  name: string;
  icon: string;
  join_code: string;
  teacher_id: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  note_type: string;
  file_url: string | null;
  file_name: string | null;
  subject_id: string;
}

interface DevGroup {
  id: string;
  name: string;
}

interface TeacherDashboardProps {
  onLogout: () => void;
}

const ICONS = ["🧩", "⚙️", "🗄️", "🌐", "💻", "📐", "🔬", "📊", "🧠", "🎯"];

const TeacherDashboard = ({ onLogout }: TeacherDashboardProps) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedBud, setSelectedBud] = useState<BudProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [buds, setBuds] = useState<Bud[]>([]);
  const [budCode, setBudCode] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectNotes, setSubjectNotes] = useState<Note[]>([]);
  const [devGroups, setDevGroups] = useState<DevGroup[]>([]);
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [budProfileLoading, setBudProfileLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create subject
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectIcon, setNewSubjectIcon] = useState("📚");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Add note
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteType, setNoteType] = useState<"text" | "file">("text");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Assign task
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [assigningTask, setAssigningTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (selectedSubject) fetchNotes(selectedSubject.id); }, [selectedSubject]);

  const generateCode = (name: string) => {
    const base = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
    const rand = Math.floor(100 + Math.random() * 900);
    return `${base}${rand}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setTeacherId(user.id);

      const { data: teacher } = await supabase.from("teachers").select("name, bud_code").eq("id", user.id).maybeSingle();
      if (teacher) { setTeacherName(teacher.name); setBudCode(teacher.bud_code); }

      const { data: subjectsData } = await supabase.from("subjects").select("id, name, icon, join_code, teacher_id").eq("teacher_id", user.id);
      if (subjectsData) setSubjects(subjectsData);

      const { data: groupsData } = await supabase.from("dev_groups").select("id, name");
      if (groupsData) setDevGroups(groupsData);

      const { data: studentsData } = await supabase.from("students").select("id, name, email, avatar, contributions");
      if (studentsData) {
        const enriched = await Promise.all(
          studentsData.map(async (s) => {
            const { data: progressData } = await supabase.from("student_progress").select("subject_id, percentage").eq("student_id", s.id);
            const { data: groupData } = await supabase.from("student_groups").select("group_id").eq("student_id", s.id);
            const progress: Record<string, number> = {};
            progressData?.forEach((p) => { progress[p.subject_id] = p.percentage; });
            return { ...s, progress, joinedGroups: groupData?.map((g) => g.group_id) ?? [] };
          })
        );
        setStudents(enriched);
      }

      const { data: budsData } = await supabase.from("teacher_students").select("student_id").eq("teacher_id", user.id);
      if (budsData && budsData.length > 0) {
        const budIds = budsData.map((b) => b.student_id);
        const { data: budStudents } = await supabase.from("students").select("id, name, email, avatar, contributions").in("id", budIds);
        if (budStudents) setBuds(budStudents);
      } else {
        setBuds([]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudProfile = async (bud: Bud) => {
    setBudProfileLoading(true);
    try {
      // Certifications
      const { data: certs } = await supabase.from("certifications").select("*").eq("student_id", bud.id).order("date", { ascending: false });

      // Enrolled subjects
      const { data: enrolledLinks } = await supabase.from("student_subjects").select("subject_id").eq("student_id", bud.id);
      const subjectIds = enrolledLinks?.map((e) => e.subject_id) ?? [];
      let enrolledSubjects: { id: string; name: string; icon: string }[] = [];
      if (subjectIds.length > 0) {
        const { data: subjData } = await supabase.from("subjects").select("id, name, icon").in("id", subjectIds);
        if (subjData) enrolledSubjects = subjData;
      }

      // Tasks assigned to this bud by this teacher
      const { data: tasksData } = await supabase.from("tasks").select("*").eq("student_id", bud.id).eq("teacher_id", teacherId).order("created_at", { ascending: false });

      // Progress
      const { data: progressData } = await supabase.from("student_progress").select("subject_id, percentage").eq("student_id", bud.id);
      const progress: Record<string, number> = {};
      progressData?.forEach((p) => { progress[p.subject_id] = p.percentage; });

      setSelectedBud({
        ...bud,
        certifications: certs ?? [],
        enrolledSubjects,
        tasks: tasksData ?? [],
        progress,
      });
    } catch (err) {
      console.error("Error fetching bud profile:", err);
    } finally {
      setBudProfileLoading(false);
    }
  };

  const fetchNotes = async (subjectId: string) => {
    setNotesLoading(true);
    const { data } = await supabase.from("notes").select("*").eq("subject_id", subjectId).order("date", { ascending: false });
    if (data) setSubjectNotes(data);
    setNotesLoading(false);
  };

  const handleGenerateBudCode = async () => {
    if (!teacherId) return;
    const code = `BUD${Math.floor(1000 + Math.random() * 9000)}`;
    await supabase.from("teachers").update({ bud_code: code }).eq("id", teacherId);
    setBudCode(code);
  };

  const handleAssignTask = async () => {
    if (!taskTitle.trim() || !selectedBud || !teacherId) return;
    setAssigningTask(true); setTaskError(null);
    try {
      const { error } = await supabase.from("tasks").insert({
        id: `task_${Date.now()}`,
        teacher_id: teacherId,
        student_id: selectedBud.id,
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        due_date: taskDueDate || null,
        completed: false,
      });
      if (error) { setTaskError("Failed to assign task."); return; }
      setTaskTitle(""); setTaskDescription(""); setTaskDueDate("");
      setShowAssignTask(false);
      await fetchBudProfile(selectedBud);
    } catch (err) { setTaskError("Something went wrong."); } finally { setAssigningTask(false); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", taskId);
    if (selectedBud) {
      setSelectedBud((prev) => prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : null);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !teacherId) return;
    setCreating(true); setCreateError(null);
    const code = newSubjectCode.trim().toUpperCase() || generateCode(newSubjectName);
    const id = `cs_${Date.now()}`;
    try {
      const { data: existing } = await supabase.from("subjects").select("id").eq("join_code", code).maybeSingle();
      if (existing) { setCreateError("That join code already exists."); return; }
      const { error } = await supabase.from("subjects").insert({ id, name: newSubjectName.trim(), icon: newSubjectIcon, join_code: code, teacher_id: teacherId });
      if (error) { setCreateError("Failed to create subject."); return; }
      setNewSubjectName(""); setNewSubjectIcon("📚"); setNewSubjectCode("");
      setShowCreateSubject(false);
      await fetchData();
    } catch (err) { setCreateError("Something went wrong."); } finally { setCreating(false); }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Delete this subject? All notes will also be deleted.")) return;
    await supabase.from("notes").delete().eq("subject_id", subjectId);
    await supabase.from("student_subjects").delete().eq("subject_id", subjectId);
    await supabase.from("subjects").delete().eq("id", subjectId);
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    if (selectedSubject?.id === subjectId) setSelectedSubject(null);
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !selectedSubject) return;
    setAddingNote(true); setNoteError(null);
    try {
      let file_url = null; let file_name = null;
      if (noteType === "file" && noteFile) {
        const ext = noteFile.name.split(".").pop();
        const path = `${selectedSubject.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("notes-files").upload(path, noteFile);
        if (uploadError) { setNoteError("File upload failed."); return; }
        const { data: urlData } = supabase.storage.from("notes-files").getPublicUrl(path);
        file_url = urlData.publicUrl; file_name = noteFile.name;
      }
      const { error } = await supabase.from("notes").insert({
        id: `n_${Date.now()}`, subject_id: selectedSubject.id, title: noteTitle.trim(),
        content: noteType === "text" ? noteContent.trim() : "",
        date: new Date().toISOString().split("T")[0], note_type: noteType, file_url, file_name,
      });
      if (error) { setNoteError("Failed to add note."); return; }
      setNoteTitle(""); setNoteContent(""); setNoteFile(null);
      setShowAddNote(false);
      await fetchNotes(selectedSubject.id);
    } catch (err) { setNoteError("Something went wrong."); } finally { setAddingNote(false); }
  };

  const handleDeleteNote = async (noteId: string, fileUrl: string | null) => {
    if (!confirm("Delete this note?")) return;
    if (fileUrl) { const path = fileUrl.split("/notes-files/")[1]; await supabase.storage.from("notes-files").remove([path]); }
    await supabase.from("notes").delete().eq("id", noteId);
    setSubjectNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleRemoveBud = async (studentId: string) => {
    if (!confirm("Remove this student from your buds?")) return;
    await supabase.from("teacher_students").delete().eq("teacher_id", teacherId).eq("student_id", studentId);
    setBuds((prev) => prev.filter((b) => b.id !== studentId));
    if (selectedBud?.id === studentId) setSelectedBud(null);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const avgProgress = (student: Student | BudProfile) => {
    const vals = Object.values(student.progress);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  const totalContributions = students.reduce((sum, s) => sum + s.contributions, 0);
  const classAvgProgress = students.length ? Math.round(students.reduce((sum, s) => sum + avgProgress(s), 0) / students.length) : 0;

  const getProgressColor = (val: number) => {
    if (val >= 80) return "text-accent";
    if (val >= 60) return "text-[hsl(var(--warning))]";
    return "text-destructive";
  };

  const handleLogout = async () => { await supabase.auth.signOut(); onLogout(); };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // ── SUBJECT DETAIL VIEW ──
  if (selectedSubject) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedSubject(null)} className="text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div className="text-lg font-bold">{selectedSubject.icon} {selectedSubject.name}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-muted/60 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Code:</span>
                <span className="font-mono font-bold text-primary tracking-widest">{selectedSubject.join_code}</span>
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copyCode(selectedSubject.join_code)}>
                  {copiedCode === selectedSubject.join_code ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground"><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {!showAddNote ? (
            <Button onClick={() => setShowAddNote(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Note</Button>
          ) : (
            <Card className="border-primary/30">
              <CardHeader className="pb-3"><CardTitle className="text-base">Add New Note</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button size="sm" variant={noteType === "text" ? "default" : "outline"} onClick={() => setNoteType("text")} className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Text Note</Button>
                  <Button size="sm" variant={noteType === "file" ? "default" : "outline"} onClick={() => setNoteType("file")} className="gap-1.5"><Upload className="w-3.5 h-3.5" /> File Upload</Button>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="Note title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
                </div>
                {noteType === "text" ? (
                  <div className="space-y-2"><Label>Content</Label><Textarea placeholder="Write your note content here..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={5} /></div>
                ) : (
                  <div className="space-y-2">
                    <Label>File (PDF, image, doc)</Label>
                    <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx" onChange={(e) => setNoteFile(e.target.files?.[0] ?? null)} />
                    {noteFile && <p className="text-sm text-muted-foreground">Selected: {noteFile.name}</p>}
                  </div>
                )}
                {noteError && <p className="text-sm text-destructive">{noteError}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleAddNote} disabled={addingNote || !noteTitle.trim() || (noteType === "file" && !noteFile)}>
                    {addingNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Add Note
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowAddNote(false); setNoteError(null); setNoteTitle(""); setNoteContent(""); setNoteFile(null); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {notesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : subjectNotes.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-12 text-center"><FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><h3 className="font-semibold text-lg mb-1">No notes yet</h3><p className="text-muted-foreground text-sm">Add your first note for this subject.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {subjectNotes.map((note) => (
                <Card key={note.id} className="group hover:border-primary/30 transition-all">
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {note.note_type === "file" ? <File className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{note.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="w-3 h-3" /> {note.date}
                          <Badge variant="secondary" className="text-xs font-normal ml-1">{note.note_type === "file" ? "File" : "Text"}</Badge>
                        </div>
                        {note.note_type === "text" && note.content && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{note.content}</p>}
                        {note.note_type === "file" && note.file_url && (
                          <a href={note.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-1.5 inline-flex items-center gap-1">
                            <File className="w-3 h-3" />{note.file_name ?? "View file"}
                          </a>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all" onClick={() => handleDeleteNote(note.id, note.file_url)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── BUD PROFILE VIEW ──
  if (selectedBud) {
    const completedTasks = selectedBud.tasks.filter((t) => t.completed).length;
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedBud(null)} className="text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Buds
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground"><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
          </div>
        </header>

        {budProfileLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">{selectedBud.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{selectedBud.name}</h2>
                    <p className="text-muted-foreground">{selectedBud.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-primary/10 text-primary border-0">Bud ❤️</Badge>
                      <Badge variant="secondary">{selectedBud.contributions} contributions</Badge>
                      <Badge variant="secondary">{selectedBud.certifications.length} certifications</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleRemoveBud(selectedBud.id)}>
                    Remove Bud
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* TASKS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" /> Tasks</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{completedTasks}/{selectedBud.tasks.length} done</span>
                    <Button size="sm" onClick={() => setShowAssignTask(true)} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Assign</Button>
                  </div>
                </div>

                {showAssignTask && (
                  <Card className="border-primary/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-2">
                        <Label>Task Title</Label>
                        <Input placeholder="e.g. Complete DSA assignment" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Textarea placeholder="Task details..." value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Due Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
                      </div>
                      {taskError && <p className="text-sm text-destructive">{taskError}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAssignTask} disabled={assigningTask || !taskTitle.trim()}>
                          {assigningTask ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Assign Task
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowAssignTask(false); setTaskError(null); setTaskTitle(""); setTaskDescription(""); setTaskDueDate(""); }}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedBud.tasks.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {selectedBud.tasks.map((task) => (
                      <Card key={task.id} className={`transition-all ${task.completed ? "border-accent/30 bg-accent/5" : ""}`}>
                        <CardContent className="p-3 flex items-start gap-3">
                          <div className="mt-0.5">
                            {task.completed
                              ? <CheckCircle2 className="w-5 h-5 text-accent" />
                              : <Circle className="w-5 h-5 text-muted-foreground/40" />}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                            {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                            {task.due_date && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Due: {task.due_date}
                              </p>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* CERTIFICATIONS */}
                <div className="space-y-3">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Certifications</h3>
                  {selectedBud.certifications.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-8 text-center">
                        <Award className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No certifications added yet.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {selectedBud.certifications.map((cert) => (
                        <Card key={cert.id} className="hover:border-primary/20 transition-all">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-sm">{cert.title}</p>
                                {cert.issuer && <p className="text-xs text-muted-foreground">{cert.issuer}</p>}
                                {cert.date && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" />{cert.date}</p>}
                              </div>
                              {cert.url && (
                                <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* ENROLLED SUBJECTS */}
                <div className="space-y-3">
                  <h3 className="font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Enrolled Subjects</h3>
                  {selectedBud.enrolledSubjects.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-8 text-center">
                        <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Not enrolled in any subjects yet.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {selectedBud.enrolledSubjects.map((subj) => {
                        const val = selectedBud.progress[subj.id] || 0;
                        return (
                          <Card key={subj.id}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="font-medium text-sm">{subj.icon} {subj.name}</p>
                                <span className={`text-sm font-bold ${getProgressColor(val)}`}>{val}%</span>
                              </div>
                              <Progress value={val} className="h-1.5" />
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        )}
      </div>
    );
  }

  // ── MAIN DASHBOARD ──
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Teacher Portal</h1>
              <p className="text-xs text-muted-foreground">Welcome, {teacherName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground"><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Students", value: students.length, icon: Users, color: "text-primary" },
            { label: "Avg Progress", value: `${classAvgProgress}%`, icon: TrendingUp, color: "text-accent" },
            { label: "Contributions", value: totalContributions, icon: Award, color: "text-[hsl(var(--warning))]" },
            { label: "My Buds", value: buds.length, icon: Heart, color: "text-destructive" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="buds" className="space-y-5">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="buds" className="gap-1.5"><Heart className="w-4 h-4" /> My Buds</TabsTrigger>
            <TabsTrigger value="subjects" className="gap-1.5"><BookOpen className="w-4 h-4" /> My Subjects</TabsTrigger>
            <TabsTrigger value="progress" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Progress</TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5"><Users className="w-4 h-4" /> Students</TabsTrigger>
            <TabsTrigger value="contributions" className="gap-1.5"><Award className="w-4 h-4" /> Contributions</TabsTrigger>
          </TabsList>

          {/* MY BUDS TAB */}
          <TabsContent value="buds">
            <div className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="font-bold text-base mb-1">Your Bud Code</h3>
                      <p className="text-sm text-muted-foreground">Share this code with students to add them as your buds</p>
                    </div>
                    {budCode ? (
                      <div className="flex items-center gap-3">
                        <div className="bg-background rounded-xl px-5 py-3 border">
                          <p className="font-mono font-bold text-2xl tracking-widest text-primary">{budCode}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => copyCode(budCode)} className="gap-1.5">
                          {copiedCode === budCode ? <><Check className="w-3.5 h-3.5 text-accent" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleGenerateBudCode} className="text-muted-foreground text-xs">Regenerate</Button>
                      </div>
                    ) : (
                      <Button onClick={handleGenerateBudCode} className="gap-2"><Plus className="w-4 h-4" /> Generate Bud Code</Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {buds.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Heart className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg mb-1">No buds yet</h3>
                    <p className="text-muted-foreground text-sm">Share your bud code with students to connect with them.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {buds.map((bud) => (
                    <Card key={bud.id} className="group hover:border-primary/30 hover:shadow-md transition-all cursor-pointer" onClick={() => fetchBudProfile(bud)}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-11 h-11">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">{bud.avatar}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-bold">{bud.name}</h3>
                              <p className="text-xs text-muted-foreground">{bud.email}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost"
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all -mt-1 -mr-1"
                            onClick={(e) => { e.stopPropagation(); handleRemoveBud(bud.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-normal">{bud.contributions} contributions</Badge>
                          <Badge className="bg-primary/10 text-primary text-xs font-normal border-0">Bud ❤️</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">Click to view profile →</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* MY SUBJECTS TAB */}
          <TabsContent value="subjects">
            <div className="space-y-4">
              {!showCreateSubject ? (
                <Button onClick={() => setShowCreateSubject(true)} className="gap-2"><Plus className="w-4 h-4" /> Create New Subject</Button>
              ) : (
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Create New Subject</CardTitle>
                    <CardDescription>Students will use the join code to enroll</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Subject Name</Label><Input placeholder="e.g. Data Structures" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} /></div>
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <div className="flex flex-wrap gap-2">
                        {ICONS.map((icon) => (
                          <button key={icon} onClick={() => setNewSubjectIcon(icon)} className={`w-9 h-9 text-xl rounded-lg border-2 transition-all ${newSubjectIcon === icon ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>{icon}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Join Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input placeholder="e.g. DS101" value={newSubjectCode} onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())} className="font-mono tracking-widest uppercase max-w-[160px]" maxLength={8} />
                    </div>
                    {createError && <p className="text-sm text-destructive">{createError}</p>}
                    <div className="flex gap-2">
                      <Button onClick={handleCreateSubject} disabled={creating || !newSubjectName.trim()}>
                        {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Create Subject
                      </Button>
                      <Button variant="ghost" onClick={() => { setShowCreateSubject(false); setCreateError(null); }}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {subjects.length === 0 ? (
                <Card className="border-dashed"><CardContent className="p-12 text-center"><BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><h3 className="font-semibold text-lg mb-1">No subjects yet</h3><p className="text-muted-foreground text-sm">Create your first subject to get started.</p></CardContent></Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject) => (
                    <Card key={subject.id} className="group border-border/60 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer" onClick={() => setSelectedSubject(subject)}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-3xl">{subject.icon}</div>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all -mt-1 -mr-1" onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                        <h3 className="font-bold text-lg mb-3">{subject.name}</h3>
                        <div className="flex items-center justify-between bg-muted/60 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Join Code</p>
                            <p className="font-mono font-bold tracking-widest text-primary">{subject.join_code}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); copyCode(subject.join_code); }} className="gap-1.5">
                            {copiedCode === subject.join_code ? <><Check className="w-3.5 h-3.5 text-accent" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">Click to manage notes →</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* PROGRESS TAB */}
          <TabsContent value="progress">
            <Card>
              <CardHeader><CardTitle>Student Progress by Subject</CardTitle><CardDescription>Click a student row for details</CardDescription></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        {subjects.map((s) => <TableHead key={s.id} className="text-center min-w-[100px]">{s.icon} {s.name.split(" ")[0]}</TableHead>)}
                        <TableHead className="text-center">Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id} className="cursor-pointer hover:bg-muted/60" onClick={() => setSelectedStudent(student)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{student.avatar}</AvatarFallback></Avatar>
                              <span className="font-medium text-sm">{student.name}</span>
                            </div>
                          </TableCell>
                          {subjects.map((subj) => {
                            const val = student.progress[subj.id] || 0;
                            return <TableCell key={subj.id} className="text-center"><span className={`font-semibold text-sm ${getProgressColor(val)}`}>{val}%</span></TableCell>;
                          })}
                          <TableCell className="text-center"><Badge variant="secondary" className="font-bold">{avgProgress(student)}%</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STUDENTS TAB */}
          <TabsContent value="students">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <Card key={student.id} className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all" onClick={() => setSelectedStudent(student)}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-11 h-11"><AvatarFallback className="bg-primary/10 text-primary font-bold">{student.avatar}</AvatarFallback></Avatar>
                      <div><h3 className="font-bold">{student.name}</h3><p className="text-xs text-muted-foreground">{student.email}</p></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Overall Progress</span><span className={`font-bold ${getProgressColor(avgProgress(student))}`}>{avgProgress(student)}%</span></div>
                      <Progress value={avgProgress(student)} className="h-2" />
                    </div>
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {student.joinedGroups.map((gId) => { const group = devGroups.find((g) => g.id === gId); return group ? <Badge key={gId} variant="outline" className="text-xs font-normal">{group.name}</Badge> : null; })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* CONTRIBUTIONS TAB */}
          <TabsContent value="contributions">
            <Card>
              <CardHeader><CardTitle>Student Contributions</CardTitle><CardDescription>Ranked by total contributions across all groups</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...students].sort((a, b) => b.contributions - a.contributions).map((student, idx) => (
                    <div key={student.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer" onClick={() => setSelectedStudent(student)}>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]" : idx === 1 ? "bg-muted-foreground/20 text-foreground" : idx === 2 ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>{idx + 1}</span>
                      <Avatar className="w-9 h-9"><AvatarFallback className="bg-primary/10 text-primary text-sm">{student.avatar}</AvatarFallback></Avatar>
                      <div className="flex-1"><p className="font-semibold text-sm">{student.name}</p><p className="text-xs text-muted-foreground">{student.joinedGroups.length} groups joined</p></div>
                      <div className="text-right"><p className="text-lg font-bold text-primary">{student.contributions}</p><p className="text-xs text-muted-foreground">contributions</p></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-lg">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12"><AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{selectedStudent.avatar}</AvatarFallback></Avatar>
                  <div><DialogTitle>{selectedStudent.name}</DialogTitle><DialogDescription>{selectedStudent.email}</DialogDescription></div>
                </div>
              </DialogHeader>
              <div className="space-y-5 mt-2">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Subject Progress</h4>
                  <div className="space-y-3">
                    {subjects.map((subj) => {
                      const val = selectedStudent.progress[subj.id] || 0;
                      return (
                        <div key={subj.id} className="space-y-1">
                          <div className="flex justify-between text-sm"><span>{subj.icon} {subj.name}</span><span className={`font-bold ${getProgressColor(val)}`}>{val}%</span></div>
                          <Progress value={val} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Groups & Contributions</h4>
                  <Badge className="bg-primary text-primary-foreground mb-2">{selectedStudent.contributions} contributions</Badge>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudent.joinedGroups.map((gId) => { const group = devGroups.find((g) => g.id === gId); return group ? <Badge key={gId} variant="outline">{group.name}</Badge> : null; })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDashboard;
