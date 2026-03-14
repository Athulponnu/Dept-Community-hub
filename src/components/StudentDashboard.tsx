import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Users, ArrowLeft, FileText, LogOut, Calendar, Loader2, KeyRound, File, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  note_type?: string;
  file_url?: string | null;
  file_name?: string | null;
}

interface Subject {
  id: string;
  name: string;
  icon: string;
  notes: Note[];
}

interface DevGroup {
  id: string;
  name: string;
  description: string;
  members: number;
  max_members: number;
  tags: string[];
}

interface MyTeacher {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
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
  const [studentName, setStudentName] = useState("Student");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Join subject by code
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);

  // Join teacher by bud code
  const [budCode, setBudCode] = useState("");
  const [budError, setBudError] = useState<string | null>(null);
  const [budSuccess, setBudSuccess] = useState<string | null>(null);
  const [joiningBud, setJoiningBud] = useState(false);
  const [showBudInput, setShowBudInput] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: student } = await supabase.from("students").select("name").eq("id", user.id).single();
      if (student) setStudentName(student.name);

      const { data: joinedSubjects } = await supabase.from("student_subjects").select("subject_id").eq("student_id", user.id);
      const joinedSubjectIds = joinedSubjects?.map((s) => s.subject_id) ?? [];
      if (joinedSubjectIds.length > 0) {
        const { data: subjectsData } = await supabase.from("subjects").select("*, notes(*)").in("id", joinedSubjectIds);
        if (subjectsData) setSubjects(subjectsData);
      } else {
        setSubjects([]);
      }

      const { data: groupsData } = await supabase.from("dev_groups").select("*");
      if (groupsData) setDevGroups(groupsData);

      const { data: joinedData } = await supabase.from("student_groups").select("group_id").eq("student_id", user.id);
      if (joinedData) setJoinedGroups(joinedData.map((g) => g.group_id));

      // Fetch my teachers (buds)
      const { data: teacherLinks } = await supabase.from("teacher_students").select("teacher_id").eq("student_id", user.id);
      if (teacherLinks && teacherLinks.length > 0) {
        const teacherIds = teacherLinks.map((t) => t.teacher_id);
        const { data: teachersData } = await supabase.from("teachers").select("id, name, email, avatar, department").in("id", teacherIds);
        if (teachersData) setMyTeachers(teachersData);
      } else {
        setMyTeachers([]);
      }

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
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
      setJoinCode(""); setShowJoinInput(false);
      await fetchData();
    } catch (err) { setJoinError("Something went wrong. Try again."); } finally { setJoining(false); }
  };

  const handleJoinTeacher = async () => {
    if (!budCode.trim() || !userId) return;
    setJoiningBud(true); setBudError(null); setBudSuccess(null);
    try {
      // Find teacher by bud_code
      const { data: teacher, error } = await supabase.from("teachers").select("id, name").eq("bud_code", budCode.trim().toUpperCase()).single();
      if (error || !teacher) { setBudError("Invalid bud code. Ask your teacher for the correct code."); return; }

      // Check if already joined
      const { data: existing } = await supabase.from("teacher_students").select("teacher_id").eq("teacher_id", teacher.id).eq("student_id", userId).maybeSingle();
      if (existing) { setBudError("You're already a bud of this teacher."); return; }

      // Join
      await supabase.from("teacher_students").insert({ teacher_id: teacher.id, student_id: userId });
      setBudSuccess(`You are now a bud of ${teacher.name}! ❤️`);
      setBudCode(""); setShowBudInput(false);
      await fetchData();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="subjects" className="space-y-6">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="subjects" className="gap-1.5"><FileText className="w-4 h-4" /> Subjects & Notes</TabsTrigger>
            <TabsTrigger value="myteachers" className="gap-1.5"><Heart className="w-4 h-4" /> My Teachers</TabsTrigger>
            <TabsTrigger value="devgroups" className="gap-1.5"><Users className="w-4 h-4" /> Dev Groups</TabsTrigger>
          </TabsList>

          {/* SUBJECTS TAB */}
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
                      <a
                        href={selectedNote.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                      >
                        <File className="w-4 h-4" />
                        {selectedNote.file_name ?? "Download file"}
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
                  ) : (
                    selectedSubject.notes.map((note) => (
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
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-200">
                <div className="mb-6">
                  {joinSuccess && <div className="mb-3 text-sm text-accent bg-accent/10 px-3 py-2 rounded-lg">{joinSuccess}</div>}
                  {!showJoinInput ? (
                    <Button variant="outline" onClick={() => { setShowJoinInput(true); setJoinSuccess(null); }} className="gap-2">
                      <KeyRound className="w-4 h-4" /> Join Subject with Code
                    </Button>
                  ) : (
                    <Card className="border-primary/30">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium mb-3">Enter the subject join code from your teacher:</p>
                        <div className="flex gap-2">
                          <Input placeholder="e.g. DS101" value={joinCode}
                            onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null); }}
                            className="max-w-[160px] font-mono tracking-widest uppercase"
                            onKeyDown={(e) => e.key === "Enter" && handleJoinSubject()} />
                          <Button onClick={handleJoinSubject} disabled={joining || !joinCode.trim()}>
                            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
                          </Button>
                          <Button variant="ghost" onClick={() => { setShowJoinInput(false); setJoinError(null); setJoinCode(""); }}>Cancel</Button>
                        </div>
                        {joinError && <p className="text-sm text-destructive mt-2">{joinError}</p>}
                      </CardContent>
                    </Card>
                  )}
                </div>
                {subjects.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-12 text-center">
                      <KeyRound className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                      <h3 className="font-semibold text-lg mb-1">No subjects yet</h3>
                      <p className="text-muted-foreground text-sm">Ask your teacher for a join code to get started.</p>
                    </CardContent>
                  </Card>
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

          {/* MY TEACHERS TAB */}
          <TabsContent value="myteachers">
            <div className="space-y-4">
              {/* Join Teacher by Bud Code */}
              <div>
                {budSuccess && <div className="mb-3 text-sm text-accent bg-accent/10 px-3 py-2 rounded-lg">{budSuccess}</div>}
                {!showBudInput ? (
                  <Button variant="outline" onClick={() => { setShowBudInput(true); setBudSuccess(null); }} className="gap-2">
                    <Heart className="w-4 h-4" /> Join a Teacher with Bud Code
                  </Button>
                ) : (
                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-3">Enter your teacher's bud code:</p>
                      <div className="flex gap-2">
                        <Input placeholder="e.g. BUD1234" value={budCode}
                          onChange={(e) => { setBudCode(e.target.value.toUpperCase()); setBudError(null); }}
                          className="max-w-[160px] font-mono tracking-widest uppercase"
                          onKeyDown={(e) => e.key === "Enter" && handleJoinTeacher()} />
                        <Button onClick={handleJoinTeacher} disabled={joiningBud || !budCode.trim()}>
                          {joiningBud ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
                        </Button>
                        <Button variant="ghost" onClick={() => { setShowBudInput(false); setBudError(null); setBudCode(""); }}>Cancel</Button>
                      </div>
                      {budError && <p className="text-sm text-destructive mt-2">{budError}</p>}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Teachers List */}
              {myTeachers.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Heart className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg mb-1">No teachers yet</h3>
                    <p className="text-muted-foreground text-sm">Ask your teacher for their bud code to connect.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myTeachers.map((teacher) => (
                    <Card key={teacher.id} className="hover:border-primary/30 hover:shadow-md transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{teacher.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-bold">{teacher.name}</h3>
                            <p className="text-xs text-muted-foreground">{teacher.email}</p>
                          </div>
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

          {/* DEV GROUPS TAB */}
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
                        {group.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{group.members}/{group.max_members} members</span>
                        <Button size="sm" variant={isJoined ? "outline" : "default"} onClick={() => toggleGroup(group.id)}>
                          {isJoined ? "Leave" : "Join"}
                        </Button>
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
