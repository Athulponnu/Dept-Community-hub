import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subjects, devGroups, type Subject, type Note } from "@/lib/data";
import { BookOpen, Users, ArrowLeft, FileText, LogOut, Calendar } from "lucide-react";

interface StudentDashboardProps {
  onLogout: () => void;
}

const StudentDashboard = ({ onLogout }: StudentDashboardProps) => {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [joinedGroups, setJoinedGroups] = useState<string[]>(["g1"]);

  const toggleGroup = (groupId: string) => {
    setJoinedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Student Portal</h1>
              <p className="text-xs text-muted-foreground">Welcome back!</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="subjects" className="space-y-6">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="subjects" className="gap-1.5">
              <FileText className="w-4 h-4" /> Subjects & Notes
            </TabsTrigger>
            <TabsTrigger value="devgroups" className="gap-1.5">
              <Users className="w-4 h-4" /> Dev Groups
            </TabsTrigger>
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
                    </div>
                    <CardTitle>{selectedNote.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80 leading-relaxed">{selectedNote.content}</p>
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
                  {selectedSubject.notes.map((note) => (
                    <Card
                      key={note.id}
                      className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                      onClick={() => setSelectedNote(note)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">{note.title}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">{note.date}</p>
                        </div>
                        <FileText className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
                {subjects.map((subject) => (
                  <Card
                    key={subject.id}
                    className="cursor-pointer hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all group"
                    onClick={() => setSelectedSubject(subject)}
                  >
                    <CardContent className="p-5">
                      <div className="text-3xl mb-3">{subject.icon}</div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{subject.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{subject.notes.length} notes</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
                        <span className="text-sm text-muted-foreground">
                          {group.members}/{group.maxMembers} members
                        </span>
                        <Button
                          size="sm"
                          variant={isJoined ? "outline" : "default"}
                          onClick={() => toggleGroup(group.id)}
                        >
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
