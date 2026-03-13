import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { students, subjects, devGroups, type Student } from "@/lib/data";
import { GraduationCap, LogOut, BarChart3, Users, Award, TrendingUp, ArrowLeft } from "lucide-react";

interface TeacherDashboardProps {
  onLogout: () => void;
}

const TeacherDashboard = ({ onLogout }: TeacherDashboardProps) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const avgProgress = (student: Student) => {
    const vals = Object.values(student.progress);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  const totalContributions = students.reduce((sum, s) => sum + s.contributions, 0);
  const classAvgProgress = Math.round(students.reduce((sum, s) => sum + avgProgress(s), 0) / students.length);

  const getProgressColor = (val: number) => {
    if (val >= 80) return "text-accent";
    if (val >= 60) return "text-[hsl(var(--warning))]";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Teacher Portal</h1>
              <p className="text-xs text-muted-foreground">Department Overview</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Students", value: students.length, icon: Users, color: "text-primary" },
            { label: "Avg Progress", value: `${classAvgProgress}%`, icon: TrendingUp, color: "text-accent" },
            { label: "Contributions", value: totalContributions, icon: Award, color: "text-[hsl(var(--warning))]" },
            { label: "Subjects", value: subjects.length, icon: BarChart3, color: "text-primary" },
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

        <Tabs defaultValue="progress" className="space-y-5">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="progress" className="gap-1.5">
              <BarChart3 className="w-4 h-4" /> Progress
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5">
              <Users className="w-4 h-4" /> Students
            </TabsTrigger>
            <TabsTrigger value="contributions" className="gap-1.5">
              <Award className="w-4 h-4" /> Contributions
            </TabsTrigger>
          </TabsList>

          {/* PROGRESS TAB */}
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Student Progress by Subject</CardTitle>
                <CardDescription>Click a student row for details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        {subjects.map((s) => (
                          <TableHead key={s.id} className="text-center min-w-[100px]">{s.icon} {s.name.split(" ")[0]}</TableHead>
                        ))}
                        <TableHead className="text-center">Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow
                          key={student.id}
                          className="cursor-pointer hover:bg-muted/60"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">{student.avatar}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{student.name}</span>
                            </div>
                          </TableCell>
                          {subjects.map((subj) => {
                            const val = student.progress[subj.id] || 0;
                            return (
                              <TableCell key={subj.id} className="text-center">
                                <span className={`font-semibold text-sm ${getProgressColor(val)}`}>{val}%</span>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-bold">{avgProgress(student)}%</Badge>
                          </TableCell>
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
                <Card
                  key={student.id}
                  className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all"
                  onClick={() => setSelectedStudent(student)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-11 h-11">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{student.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold">{student.name}</h3>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Overall Progress</span>
                        <span className={`font-bold ${getProgressColor(avgProgress(student))}`}>{avgProgress(student)}%</span>
                      </div>
                      <Progress value={avgProgress(student)} className="h-2" />
                    </div>
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {student.joinedGroups.map((gId) => {
                        const group = devGroups.find((g) => g.id === gId);
                        return group ? (
                          <Badge key={gId} variant="outline" className="text-xs font-normal">{group.name}</Badge>
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* CONTRIBUTIONS TAB */}
          <TabsContent value="contributions">
            <Card>
              <CardHeader>
                <CardTitle>Student Contributions</CardTitle>
                <CardDescription>Ranked by total contributions across all groups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...students]
                    .sort((a, b) => b.contributions - a.contributions)
                    .map((student, idx) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          idx === 0 ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]" :
                          idx === 1 ? "bg-muted-foreground/20 text-foreground" :
                          idx === 2 ? "bg-accent/20 text-accent" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {idx + 1}
                        </span>
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{student.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.joinedGroups.length} groups joined
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{student.contributions}</p>
                          <p className="text-xs text-muted-foreground">contributions</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-lg">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{selectedStudent.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selectedStudent.name}</DialogTitle>
                    <DialogDescription>{selectedStudent.email}</DialogDescription>
                  </div>
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
                          <div className="flex justify-between text-sm">
                            <span>{subj.icon} {subj.name}</span>
                            <span className={`font-bold ${getProgressColor(val)}`}>{val}%</span>
                          </div>
                          <Progress value={val} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Groups & Contributions</h4>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-primary text-primary-foreground">{selectedStudent.contributions} contributions</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudent.joinedGroups.map((gId) => {
                      const group = devGroups.find((g) => g.id === gId);
                      return group ? (
                        <Badge key={gId} variant="outline">{group.name}</Badge>
                      ) : null;
                    })}
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
