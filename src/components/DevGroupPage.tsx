import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Send, Plus, Github, Users, Newspaper, MessageCircle,
  Loader2, ExternalLink, Check, X, Clock, Trash2, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DevGroup {
  id: string; name: string; description: string;
  members: number; max_members: number; tags: string[];
}

interface ProjectPost {
  id: string; group_id: string; posted_by: string;
  posted_by_name: string; posted_by_avatar: string;
  title: string; description: string | null; github_link: string | null;
  tech_tags: string[]; team_size: number; slots_available: number;
  created_at: string;
}

interface JoinRequest {
  id: string; project_id: string; student_id: string;
  student_name: string; student_avatar: string;
  status: "pending" | "accepted" | "rejected"; created_at: string;
}

interface ChatMessage {
  id: string; sender_id: string; sender_name: string;
  sender_avatar: string; text: string; timestamp: string;
}

interface NewsArticle {
  id: number; title: string; url: string;
  published_at: string; tag_list: string[];
  user: { name: string }; positive_reactions_count: number;
  reading_time_minutes: number;
}

interface DevGroupPageProps {
  group: DevGroup;
  userId: string;
  studentName: string;
  studentAvatar: string;
  onBack: () => void;
}

const TAG_MAP: Record<string, string> = {
  "dg1": "machinelearning",
  "dg2": "fullstack",
  "dg3": "devops",
  "dg4": "cybersecurity",
  "dg5": "dataengineering",
  "dg6": "gamedev",
  "dg7": "opensource",
};

const DevGroupPage = ({ group, userId, studentName, studentAvatar, onBack }: DevGroupPageProps) => {
  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Projects
  const [projects, setProjects] = useState<ProjectPost[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [projTitle, setProjTitle] = useState("");
  const [projDescription, setProjDescription] = useState("");
  const [projGithub, setProjGithub] = useState("");
  const [projTags, setProjTags] = useState("");
  const [projTeamSize, setProjTeamSize] = useState("3");
  const [projSlots, setProjSlots] = useState("2");
  const [addingProject, setAddingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [myRequests, setMyRequests] = useState<string[]>([]);

  // News
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Members
  const [members, setMembers] = useState<{ id: string; name: string; avatar: string; contributions: number }[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    setupChat();
    fetchProjects();
    fetchNews();
    fetchMembers();
    return () => { channelRef.current?.unsubscribe(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── CHAT ──
  const setupChat = () => {
    const channel = supabase.channel(`devgroup-${group.id}`, {
      config: { broadcast: { self: true } }
    });
    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      setMessages((prev) => [...prev, payload as ChatMessage]);
    }).subscribe();
    channelRef.current = channel;
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender_id: userId,
      sender_name: studentName,
      sender_avatar: studentAvatar,
      text: messageInput.trim(),
      timestamp: new Date().toISOString(),
    };
    await channelRef.current?.send({ type: "broadcast", event: "message", payload: msg });
    setMessageInput("");
  };

  // ── PROJECTS ──
  const fetchProjects = async () => {
    setProjectsLoading(true);
    const { data } = await supabase.from("project_posts").select("*").eq("group_id", group.id).order("created_at", { ascending: false });
    if (data) setProjects(data);

    // My join requests
    const { data: myReqs } = await supabase.from("project_join_requests").select("project_id").eq("student_id", userId);
    if (myReqs) setMyRequests(myReqs.map((r) => r.project_id));

    // Join requests on my projects
    const { data: reqsData } = await supabase.from("project_join_requests").select("*").in("project_id", data?.filter(p => p.posted_by === userId).map(p => p.id) ?? []);
    if (reqsData) setJoinRequests(reqsData);

    setProjectsLoading(false);
  };

  const handleAddProject = async () => {
    if (!projTitle.trim()) return;
    setAddingProject(true); setProjectError(null);
    const newProject: ProjectPost = {
      id: `proj_${Date.now()}`,
      group_id: group.id,
      posted_by: userId,
      posted_by_name: studentName,
      posted_by_avatar: studentAvatar,
      title: projTitle.trim(),
      description: projDescription.trim() || null,
      github_link: projGithub.trim() || null,
      tech_tags: projTags.split(",").map(t => t.trim()).filter(Boolean),
      team_size: parseInt(projTeamSize) || 3,
      slots_available: parseInt(projSlots) || 0,
      created_at: new Date().toISOString(),
    };
    try {
      // ✅ Optimistic update — add to top of list immediately
      setProjects((prev) => [newProject, ...prev]);
      setProjTitle(""); setProjDescription(""); setProjGithub(""); setProjTags(""); setProjTeamSize("3"); setProjSlots("2");
      setShowAddProject(false);
      const { error } = await supabase.from("project_posts").insert(newProject);
      // Revert if failed
      if (error) { setProjects((prev) => prev.filter(p => p.id !== newProject.id)); setProjectError("Failed to post project."); setShowAddProject(true); }
    } catch (err) {
      setProjects((prev) => prev.filter(p => p.id !== newProject.id));
      setProjectError("Something went wrong.");
    } finally { setAddingProject(false); }
  };

  const handleRequestJoin = async (projectId: string) => {
    await supabase.from("project_join_requests").insert({
      id: `req_${Date.now()}`,
      project_id: projectId,
      student_id: userId,
      student_name: studentName,
      student_avatar: studentAvatar,
      status: "pending",
    });
    setMyRequests((prev) => [...prev, projectId]);
  };

  const handleJoinRequestAction = async (reqId: string, projectId: string, action: "accepted" | "rejected") => {
    await supabase.from("project_join_requests").update({ status: action }).eq("id", reqId);
    setJoinRequests((prev) => prev.map(r => r.id === reqId ? { ...r, status: action } : r));
    if (action === "accepted") {
      await supabase.from("project_posts").update({ slots_available: Math.max(0, (projects.find(p => p.id === projectId)?.slots_available ?? 1) - 1) }).eq("id", projectId);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Delete this project post?")) return;
    await supabase.from("project_join_requests").delete().eq("project_id", projectId);
    await supabase.from("project_posts").delete().eq("id", projectId);
    setProjects((prev) => prev.filter(p => p.id !== projectId));
  };

  // ── NEWS ──
  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const tag = TAG_MAP[group.id] ?? "programming";
      const res = await fetch(`https://dev.to/api/articles?tag=${tag}&per_page=12&top=7`);
      if (res.ok) {
        const data = await res.json();
        setNews(data);
      }
    } catch (err) { console.error("News fetch failed:", err); }
    finally { setNewsLoading(false); }
  };

  // ── MEMBERS ──
  const fetchMembers = async () => {
    setMembersLoading(true);
    const { data: memberLinks } = await supabase.from("student_groups").select("student_id").eq("group_id", group.id);
    if (memberLinks && memberLinks.length > 0) {
      const ids = memberLinks.map(m => m.student_id);
      const { data: studentsData } = await supabase.from("students").select("id, name, avatar, contributions").in("id", ids);
      if (studentsData) setMembers(studentsData);
    }
    setMembersLoading(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  const pendingRequestsForMe = joinRequests.filter(r => r.status === "pending");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-lg font-bold leading-tight">{group.name}</h1>
              <p className="text-xs text-muted-foreground">{group.members} members</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.tags.slice(0, 3).map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 flex-1 w-full">
        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="chat" className="gap-1.5"><MessageCircle className="w-4 h-4" /> Chat</TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5">
              <Github className="w-4 h-4" /> Projects
              {pendingRequestsForMe.length > 0 && <Badge className="ml-1 h-4 px-1 text-xs bg-primary text-primary-foreground">{pendingRequestsForMe.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-1.5"><Newspaper className="w-4 h-4" /> News</TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5"><Users className="w-4 h-4" /> Members</TabsTrigger>
          </TabsList>

          {/* ── CHAT TAB ── */}
          <TabsContent value="chat" className="m-0">
            <Card className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-primary" /> Group Chat
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">Live • No history</Badge>
                </div>
              </CardHeader>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground/20 mb-3" />
                    <p className="font-semibold text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Be the first to say something!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === userId;
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                        {!isMe && (
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{msg.sender_avatar}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[70%] space-y-0.5 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                          {!isMe && <p className="text-xs text-muted-foreground px-1">{msg.sender_name}</p>}
                          <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                            {msg.text}
                          </div>
                          <p className="text-xs text-muted-foreground px-1">{formatTime(msg.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-3 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!messageInput.trim()} size="sm" className="px-3">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ── PROJECTS TAB ── */}
          <TabsContent value="projects">
            <div className="space-y-4">
              {/* Pending requests on my projects */}
              {pendingRequestsForMe.length > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> Pending Join Requests ({pendingRequestsForMe.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pendingRequestsForMe.map((req) => {
                      const project = projects.find(p => p.id === req.project_id);
                      return (
                        <div key={req.id} className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{req.student_avatar}</AvatarFallback></Avatar>
                            <div>
                              <p className="text-sm font-medium">{req.student_name}</p>
                              <p className="text-xs text-muted-foreground">wants to join <span className="text-primary">{project?.title}</span></p>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 px-2 gap-1 bg-accent hover:bg-accent/90" onClick={() => handleJoinRequestAction(req.id, req.project_id, "accepted")}>
                              <Check className="w-3.5 h-3.5" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-destructive border-destructive/30" onClick={() => handleJoinRequestAction(req.id, req.project_id, "rejected")}>
                              <X className="w-3.5 h-3.5" /> Decline
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Add Project Button */}
              {!showAddProject ? (
                <Button onClick={() => setShowAddProject(true)} className="gap-2"><Plus className="w-4 h-4" /> Post a Project</Button>
              ) : (
                <Card className="border-primary/30 animate-in fade-in duration-200">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Post Your Project</CardTitle><CardDescription>Let others discover and join your project</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Project Title *</Label><Input placeholder="e.g. AI Resume Analyzer" value={projTitle} onChange={(e) => setProjTitle(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Description</Label><Textarea placeholder="What are you building? What problem does it solve?" value={projDescription} onChange={(e) => setProjDescription(e.target.value)} rows={3} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Github className="w-3.5 h-3.5" /> GitHub Link</Label><Input placeholder="https://github.com/..." value={projGithub} onChange={(e) => setProjGithub(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Tech Stack <span className="text-muted-foreground font-normal">(comma separated)</span></Label><Input placeholder="e.g. React, Python, FastAPI" value={projTags} onChange={(e) => setProjTags(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Team Size</Label><Input type="number" min="1" max="20" value={projTeamSize} onChange={(e) => setProjTeamSize(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Open Slots</Label><Input type="number" min="0" max="20" value={projSlots} onChange={(e) => setProjSlots(e.target.value)} /></div>
                    </div>
                    {projectError && <p className="text-sm text-destructive">{projectError}</p>}
                    <div className="flex gap-2">
                      <Button onClick={handleAddProject} disabled={addingProject || !projTitle.trim()}>
                        {addingProject ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Post Project
                      </Button>
                      <Button variant="ghost" onClick={() => { setShowAddProject(false); setProjectError(null); }}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Projects List */}
              {projectsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : projects.length === 0 ? (
                <Card className="border-dashed"><CardContent className="p-12 text-center"><Github className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><h3 className="font-semibold text-lg mb-1">No projects yet</h3><p className="text-muted-foreground text-sm">Be the first to post a project in this group!</p></CardContent></Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {projects.map((proj) => {
                    const isOwner = proj.posted_by === userId;
                    const hasRequested = myRequests.includes(proj.id);
                    const myReqStatus = joinRequests.find(r => r.project_id === proj.id && r.student_id === userId)?.status;
                    return (
                      <Card key={proj.id} className="group hover:border-primary/30 hover:shadow-md transition-all">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{proj.posted_by_avatar}</AvatarFallback></Avatar>
                              <div>
                                <p className="text-xs text-muted-foreground">{proj.posted_by_name}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(proj.created_at)}</p>
                              </div>
                            </div>
                            {isOwner && (
                              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0 transition-all" onClick={() => handleDeleteProject(proj.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>

                          <h3 className="font-bold text-base mb-1">{proj.title}</h3>
                          {proj.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{proj.description}</p>}

                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {proj.tech_tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>)}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {proj.team_size} team</span>
                              <Badge variant={proj.slots_available > 0 ? "outline" : "secondary"} className="text-xs">
                                {proj.slots_available > 0 ? `${proj.slots_available} slots open` : "Full"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {proj.github_link && (
                                <a href={proj.github_link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary p-1">
                                  <Github className="w-4 h-4" />
                                </a>
                              )}
                              {!isOwner && proj.slots_available > 0 && (
                                hasRequested ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {myReqStatus === "accepted" ? "✅ Accepted" : myReqStatus === "rejected" ? "❌ Declined" : "⏳ Requested"}
                                  </Badge>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRequestJoin(proj.id)}>
                                    Request to Join
                                  </Button>
                                )
                              )}
                              {isOwner && <Badge className="bg-primary/10 text-primary border-0 text-xs">Your project</Badge>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── NEWS TAB ── */}
          <TabsContent value="news">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Latest articles from Dev.to tagged <span className="text-primary font-medium">#{TAG_MAP[group.id] ?? "programming"}</span></p>
                <Button variant="outline" size="sm" onClick={fetchNews} disabled={newsLoading} className="gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${newsLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </div>

              {newsLoading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse"><CardContent className="p-5"><div className="h-4 bg-muted rounded mb-2 w-3/4" /><div className="h-3 bg-muted rounded mb-1 w-full" /><div className="h-3 bg-muted rounded w-1/2" /></CardContent></Card>
                  ))}
                </div>
              ) : news.length === 0 ? (
                <Card className="border-dashed"><CardContent className="p-12 text-center"><Newspaper className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><h3 className="font-semibold text-lg mb-1">No news found</h3><p className="text-muted-foreground text-sm">Try refreshing or check your connection.</p></CardContent></Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {news.map((article) => (
                    <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer" className="block group">
                      <Card className="h-full hover:border-primary/30 hover:shadow-md transition-all group-hover:-translate-y-0.5">
                        <CardContent className="p-5">
                          <h3 className="font-bold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">{article.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                            <span>{article.user?.name}</span>
                            <span>·</span>
                            <span>{article.reading_time_minutes} min read</span>
                            <span>·</span>
                            <span>❤️ {article.positive_reactions_count}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {article.tag_list.slice(0, 3).map(tag => <Badge key={tag} variant="secondary" className="text-xs font-normal">#{tag}</Badge>)}
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── MEMBERS TAB ── */}
          <TabsContent value="members">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""} in this group</p>
              {membersLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : members.length === 0 ? (
                <Card className="border-dashed"><CardContent className="p-12 text-center"><Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><h3 className="font-semibold text-lg mb-1">No members yet</h3><p className="text-muted-foreground text-sm">Be the first to join this group!</p></CardContent></Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...members].sort((a, b) => b.contributions - a.contributions).map((member, idx) => (
                    <Card key={member.id} className={`hover:border-primary/20 transition-all ${member.id === userId ? "border-primary/40 bg-primary/5" : ""}`}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-10 h-10"><AvatarFallback className="bg-primary/10 text-primary font-bold">{member.avatar}</AvatarFallback></Avatar>
                          {idx < 3 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-background border">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{member.name} {member.id === userId && <span className="text-xs text-primary">(you)</span>}</p>
                          <p className="text-xs text-muted-foreground">{member.contributions} contributions</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DevGroupPage;
