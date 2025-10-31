import { useState, useEffect } from "react";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Briefcase,
  FolderOpen,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { platformsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const localizer = momentLocalizer(moment);

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: string;
  source: string;
  metadata?: {
    startTime: string;
    endTime: string;
    location?: string;
    htmlLink?: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Task;
}

interface Project {
  id: number;
  identifier: string;
  name: string;
  active: boolean;
  public: boolean;
  description?: {
    format: string;
    html: string;
    raw: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface WorkPackage {
  id: number;
  subject: string;
  description?: {
    format: string;
    html: string;
    raw: string;
  };
  _links: {
    status: { title: string };
    priority: { title: string };
    project: { title: string };
    assignee?: { title: string };
  };
  dueDate?: string;
  estimatedTime?: string;
  spentTime?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get event color
const getTaskColor = (source: string) => {
  if (source === "GOOGLE_CALENDAR") {
    return "#10b981"; // green
  } else if (source === "OPENPROJECT") {
    return "#f59e0b"; // amber
  } else if (source === "SLACK") {
    return "#8b5cf6"; // purple
  }
  return "#3b82f6"; // default blue
};

const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === "new") return "bg-blue-500/20 text-blue-500 border-blue-500/30";
  if (statusLower.includes("progress")) return "bg-purple-500/20 text-purple-500 border-purple-500/30";
  if (statusLower === "closed" || statusLower === "completed") return "bg-green-500/20 text-green-500 border-green-500/30";
  if (statusLower === "rejected") return "bg-red-500/20 text-red-500 border-red-500/30";
  return "bg-gray-500/20 text-gray-500 border-gray-500/30";
};

const getPriorityColor = (priority: string) => {
  const priorityLower = priority.toLowerCase();
  if (priorityLower === "immediate" || priorityLower === "urgent") return "bg-red-500/20 text-red-500 border-red-500/30";
  if (priorityLower === "high") return "bg-orange-500/20 text-orange-500 border-orange-500/30";
  if (priorityLower === "normal" || priorityLower === "medium") return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
  if (priorityLower === "low") return "bg-green-500/20 text-green-500 border-green-500/30";
  return "bg-gray-500/20 text-gray-500 border-gray-500/30";
};

const getStatusIcon = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === "new") return <AlertCircle className="h-4 w-4" />;
  if (statusLower.includes("progress")) return <Clock className="h-4 w-4" />;
  if (statusLower === "closed" || statusLower === "completed") return <CheckCircle2 className="h-4 w-4" />;
  if (statusLower === "rejected") return <XCircle className="h-4 w-4" />;
  return <AlertCircle className="h-4 w-4" />;
};

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingOpenProject, setSyncingOpenProject] = useState(false);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [isOpenProjectConnected, setIsOpenProjectConnected] = useState(false);
  const [openProjectUsername, setOpenProjectUsername] = useState<string | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [addingWorkPackage, setAddingWorkPackage] = useState<number | null>(null);
  const [workPackageDates, setWorkPackageDates] = useState<Record<number, string>>({});
  const [editingDate, setEditingDate] = useState<number | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch projects
  const {
    data: projectsData,
    isLoading: projectsLoading,
  } = useQuery({
    queryKey: ["openproject-projects"],
    queryFn: async () => {
      if (!isOpenProjectConnected) return null;
      const response = await platformsApi.getOpenProjectProjects();
      return response.data.data;
    },
    enabled: isOpenProjectConnected,
    retry: 1,
  });

  // Fetch work packages for selected project
  const {
    data: workPackagesData,
    isLoading: workPackagesLoading,
  } = useQuery({
    queryKey: ["project-work-packages", selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return null;
      const response = await platformsApi.getProjectWorkPackages(selectedProject.id.toString());
      return response.data.data;
    },
    enabled: !!selectedProject,
    retry: 1,
  });

  const projects: Project[] = projectsData?.projects || [];
  const workPackages: WorkPackage[] = workPackagesData?.workPackages || [];

  // Convert tasks to calendar events
  const events: CalendarEvent[] = tasks.map((task) => {
    const startTime = task.metadata?.startTime
      ? new Date(task.metadata.startTime)
      : new Date(task.dueDate);
    // Ensure end time is at least start time if metadata is missing
    const endTime = task.metadata?.endTime
      ? new Date(task.metadata.endTime)
      : new Date(startTime.getTime() + 3600 * 1000); // Default to 1 hour if no end time

    return {
      id: task.id,
      title: task.title,
      start: startTime,
      end: endTime,
      resource: task,
    };
  });

  // Filter and sort for upcoming events list
  const upcomingEvents = events
    .filter((e) => e.start > new Date())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 10); // Get next 10

  // Check if Google Calendar and OpenProject are connected
  const checkConnection = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/v1/users/platforms`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      console.log("[Tasks] Platform connections response:", response.data);

      if (response.data.success) {
        // Check Google Calendar
        const googleCalendar = response.data.data.find(
          (platform: { platform: string; connected?: boolean; username?: string }) => platform.platform === "GOOGLE_CALENDAR"
        );
        console.log("[Tasks] Google Calendar connection:", googleCalendar);
        setIsConnected(googleCalendar?.connected || false);
        setConnectedEmail(googleCalendar?.username || null);
        console.log("[Tasks] Connected email:", googleCalendar?.username);

        // Check OpenProject
        const openProject = response.data.data.find(
          (platform: { platform: string; connected?: boolean; username?: string }) => platform.platform === "OPENPROJECT"
        );
        console.log("[Tasks] OpenProject connection:", openProject);
        setIsOpenProjectConnected(openProject?.connected || false);
        setOpenProjectUsername(openProject?.username || null);
        console.log("[Tasks] OpenProject username:", openProject?.username);
      }
    } catch (error) {
      console.error("Failed to check connection:", error);
    }
  };

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      console.log("[Tasks] Fetching tasks from API...");
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/v1/users/tasks`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      console.log("[Tasks] API response:", response.data);

      if (response.data.success) {
        console.log("[Tasks] Setting tasks:", response.data.data);
        setTasks(response.data.data);
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error("Failed to fetch tasks:", error);
      console.error("Error details:", err.response?.data);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Sync Google Calendar
  const syncGoogleCalendar = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please sign in with Google first to sync your calendar.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      console.log("[Tasks] Starting Google Calendar sync...");
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/v1/platforms/sync/GOOGLE_CALENDAR`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      console.log("[Tasks] Sync response:", response.data);

      if (response.data.success) {
        toast({
          title: "Sync Completed",
          description: "Google Calendar events synced successfully!",
        });

        // Wait a bit for the sync to complete
        console.log("[Tasks] Waiting for sync to complete...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Refresh tasks immediately
        console.log("[Tasks] Refreshing tasks...");
        await fetchTasks();
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error("Failed to sync:", error);
      console.error("Sync error details:", err.response?.data);
      const message = err.response?.data?.message || "Failed to sync Google Calendar. Please try again.";
      toast({
        title: "Sync Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Sync OpenProject
  const syncOpenProject = async () => {
    if (!isOpenProjectConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect to OpenProject first to sync your work packages.",
        variant: "destructive",
      });
      return;
    }

    setSyncingOpenProject(true);
    try {
      console.log("[Tasks] Starting OpenProject sync...");
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/v1/platforms/sync/OPENPROJECT`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      console.log("[Tasks] OpenProject sync response:", response.data);

      if (response.data.success) {
        toast({
          title: "Sync Completed",
          description: "OpenProject work packages synced successfully!",
        });

        // Wait a bit for the sync to complete
        console.log("[Tasks] Waiting for sync to complete...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Refresh tasks immediately
        console.log("[Tasks] Refreshing tasks...");
        await fetchTasks();
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error("Failed to sync OpenProject:", error);
      console.error("Sync error details:", err.response?.data);
      const message = err.response?.data?.message || "Failed to sync OpenProject. Please try again.";
      toast({
        title: "Sync Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSyncingOpenProject(false);
    }
  };

  // Handler to add work package to calendar
  const handleAddToCalendar = async (workPackage: WorkPackage) => {
    try {
      setAddingWorkPackage(workPackage.id);

      // Use custom date if provided in state, otherwise use work package's due date
      const dueDate = workPackageDates[workPackage.id] || workPackage.dueDate;

      if (!dueDate) {
        toast({
          title: "Due Date Required",
          description: "Please select a due date for this work package",
          variant: "destructive",
        });
        setAddingWorkPackage(null);
        return;
      }

      await platformsApi.addWorkPackageToTasks(workPackage.id.toString(), dueDate);

      toast({
        title: "Added to Calendar",
        description: `${workPackage.subject} has been added to your calendar`,
      });

      // Refresh tasks
      await fetchTasks();

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ["project-work-packages"] });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to add work package to calendar",
        variant: "destructive",
      });
    } finally {
      setAddingWorkPackage(null);
    }
  };

  useEffect(() => {
    checkConnection();
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Event style getter - color code by source
  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: getTaskColor(event.resource.source),
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "none",
        display: "block",
      },
    };
  };

  // Handle event click
  const handleSelectEvent = (event: CalendarEvent) => {
    const task = event.resource;

    // If it's a Google Calendar event with a link, open it
    if (task.metadata?.htmlLink) {
      window.open(task.metadata.htmlLink, "_blank");
    } else {
      // Show task details in a toast
      toast({
        title: task.title,
        description: task.description || "No description available",
      });
    }
  };

  // Custom Toolbar navigation
  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    let newDate = new Date(date);
    const navView = view === 'agenda' ? 'day' : (view === 'work_week' ? 'week' : view); // Treat agenda nav like day

    if (action === 'PREV') {
      newDate = moment(date).subtract(1, navView as moment.unitOfTime.DurationConstructor).toDate();
    } else if (action === 'NEXT') {
      newDate = moment(date).add(1, navView as moment.unitOfTime.DurationConstructor).toDate();
    } else if (action === 'TODAY') {
      newDate = new Date();
    }
    setDate(newDate);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-cyan" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex gap-4">
        {/* COLLAPSIBLE SIDEBAR */}
        {isOpenProjectConnected && (
          <div
            className={cn(
              "transition-all duration-300 flex-shrink-0",
              sidebarOpen ? "w-80" : "w-12"
            )}
          >
            <div className="sticky top-4">
              {/* Toggle Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mb-4 w-full"
              >
                {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
              </Button>

              {/* Sidebar Content */}
              {sidebarOpen && (
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Briefcase className="text-amber-500" size={20} />
                      OpenProject
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                    {/* Projects List */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        SELECT PROJECT
                      </Label>
                      <div className="space-y-2">
                        {projectsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-cyan" />
                          </div>
                        ) : projects.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No projects found
                          </p>
                        ) : (
                          projects.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => setSelectedProject(project)}
                              className={cn(
                                "w-full text-left p-2 rounded-lg border transition-all text-sm",
                                "hover:border-cyan/50 hover:bg-surface/50",
                                selectedProject?.id === project.id
                                  ? "border-cyan bg-cyan/10"
                                  : "border-border/30 bg-surface/30"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 flex-shrink-0 text-amber-500" />
                                <span className="truncate font-medium">{project.name}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Work Packages */}
                    {selectedProject && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          WORK PACKAGES ({workPackages.length})
                        </Label>
                        <div className="space-y-3">
                          {workPackagesLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin text-cyan" />
                            </div>
                          ) : workPackages.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              No work packages assigned to you
                            </p>
                          ) : (
                            workPackages.map((wp) => {
                              const currentDate = workPackageDates[wp.id] || wp.dueDate;
                              const isDateSet = !!currentDate;
                              
                              return (
                                <div
                                  key={wp.id}
                                  className="p-3 rounded-lg border border-border/30 bg-surface/30 space-y-2"
                                >
                                  {/* Header */}
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-foreground line-clamp-2">
                                      #{wp.id} {wp.subject}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getStatusColor(wp._links.status.title))}>
                                        {getStatusIcon(wp._links.status.title)}
                                        <span className="ml-1">{wp._links.status.title}</span>
                                      </Badge>
                                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getPriorityColor(wp._links.priority.title))}>
                                        {wp._links.priority.title}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Due Date Section */}
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Popover open={openDatePicker === wp.id} onOpenChange={(open) => setOpenDatePicker(open ? wp.id : null)}>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              "flex-1 h-7 text-xs justify-start text-left font-normal",
                                              !currentDate && "text-muted-foreground"
                                            )}
                                          >
                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                            {currentDate ? (
                                              moment(currentDate).format("MMM DD, YYYY")
                                            ) : (
                                              <span>Pick a date</span>
                                            )}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <CalendarUI
                                            mode="single"
                                            selected={currentDate ? new Date(currentDate) : undefined}
                                            onSelect={(date) => {
                                              if (date) {
                                                setWorkPackageDates({
                                                  ...workPackageDates,
                                                  [wp.id]: moment(date).format("YYYY-MM-DD")
                                                });
                                                setOpenDatePicker(null);
                                              }
                                            }}
                                            initialFocus
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      {isDateSet && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 flex-shrink-0"
                                          onClick={() => setOpenDatePicker(wp.id)}
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>

                                    <Button
                                      size="sm"
                                      onClick={() => handleAddToCalendar(wp)}
                                      disabled={addingWorkPackage === wp.id || !currentDate}
                                      className="w-full h-7 text-xs bg-amber-500 hover:bg-amber-600"
                                    >
                                      {addingWorkPackage === wp.id ? (
                                        <>
                                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                          Adding...
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="mr-1 h-3 w-3" />
                                          Add to Calendar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* === TOP HEADER === */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarIcon className="text-cyan" />
              Tasks Calendar
              <span className="text-sm font-normal text-muted-foreground">
                ({tasks.length} {tasks.length === 1 ? 'task' : 'tasks'})
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage your tasks from Google Calendar, OpenProject, and other platforms
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {isConnected && connectedEmail && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-sm text-muted-foreground">Google Calendar:</span>
                  <span className="text-sm font-semibold text-green-500">{connectedEmail}</span>
                </div>
              )}
              {isOpenProjectConnected && openProjectUsername && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-500 text-sm">✓</span>
                  <span className="text-sm text-muted-foreground">OpenProject:</span>
                  <span className="text-sm font-semibold text-amber-500">{openProjectUsername}</span>
                </div>
              )}
              {!isConnected && !isOpenProjectConnected && (
                <p className="text-amber-500 text-sm flex items-center gap-2">
                  ⚠️ No platforms connected. Please{" "}
                  <a href="/connections" className="underline hover:text-amber-400">
                    connect your platforms
                  </a>
                  {" "}first.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={syncGoogleCalendar}
              disabled={syncing || !isConnected}
              className="btn-gradient flex-shrink-0"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Google Calendar
                </>
              )}
            </Button>
            <Button
              onClick={syncOpenProject}
              disabled={syncingOpenProject || !isOpenProjectConnected}
              className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0"
            >
              {syncingOpenProject ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync OpenProject
                </>
              )}
            </Button>
          </div>
        </div>

        {/* === MAIN TWO-COLUMN LAYOUT === */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* --- LEFT COLUMN: UPCOMING EVENTS --- */}
          <div className="w-full lg:w-[380px] flex-shrink-0 space-y-4">
            <h2 className="text-2xl font-bold">Upcoming Events</h2>
            <p className="text-muted-foreground -mt-3">Don't miss schedule</p>
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map(event => (
                  <Card key={event.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: getTaskColor(event.resource.source) }}
                        title={`Source: ${event.resource.source}`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-cyan">
                          {moment(event.start).format('MMM D, YYYY • HH:mm')} - {moment(event.end).format('HH:mm')}
                        </p>
                        <p className="text-lg font-semibold">{event.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.resource.description || 'No description available.'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">No upcoming events found.</p>
                </Card>
              )}
            </div>
          </div>

          {/* --- RIGHT COLUMN: CALENDAR --- */}
          <div className="flex-1 min-w-0">
            <Card className="p-4 sm:p-6">
              
              {/* Custom Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={() => handleNavigate('PREV')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleNavigate('NEXT')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="ml-2" onClick={() => handleNavigate('TODAY')}>
                    Today
                  </Button>
                  <h2 className="text-xl font-bold ml-4">
                    {moment(date).format(view === 'month' ? 'MMMM YYYY' : 'MMMM D, YYYY')}
                  </h2>
                </div>
                
                <div className="flex items-center rounded-md border bg-background p-0.5">
                  <Button
                    variant={view === Views.DAY ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setView(Views.DAY)}
                  >
                    Day
                  </Button>
                  <Button
                    variant={view === Views.WEEK ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setView(Views.WEEK)}
                  >
                    Week
                  </Button>
                  <Button
                    variant={view === Views.MONTH ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setView(Views.MONTH)}
                  >
                    Month
                  </Button>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex gap-4 text-sm flex-wrap mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#10b981]" />
                  <span>Google Calendar</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#f59e0b]" />
                  <span>OpenProject</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#8b5cf6]" />
                  <span>Slack</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#3b82f6]" />
                  <span>Other</span>
                </div>
              </div>

              {/* Calendar Component */}
              <div className="calendar-container" style={{ height: "600px" }}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: "100%" }}
                  view={view}
                  onView={setView}
                  date={date}
                  onNavigate={setDate} // This is still needed for programmatic navigation
                  eventPropGetter={eventStyleGetter}
                  onSelectEvent={handleSelectEvent}
                  views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                  components={{
                    toolbar: () => null, // Hide the default toolbar
                  }}
                />
              </div>
            </Card>
          </div>
        </div>

        {/* === EMPTY STATE (if no tasks) === */}
        {tasks.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-4">
              {isConnected || isOpenProjectConnected
                ? "Click 'Sync' to import your tasks from connected platforms"
                : "Connect your task platforms to start seeing your tasks here"
              }
            </p>
            {!isConnected && !isOpenProjectConnected && (
              <Button
                onClick={() => (window.location.href = "/connections")}
                className="btn-gradient"
              >
                Go to Connections
              </Button>
            )}
          </Card>
        )}
        </div>
        {/* END MAIN CONTENT */}
      </div>
      {/* END FLEX CONTAINER */}

      <style>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-header {
          padding: 12px 4px;
          font-weight: 600;
          border-bottom: 1px solid hsl(var(--border));
        }
        .rbc-month-view {
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          overflow: hidden;
        }
        .rbc-day-bg {
          border-left: 1px solid hsl(var(--border));
        }
        .rbc-month-row {
          border-top: 1px solid hsl(var(--border));
        }
        .rbc-off-range-bg {
          background: hsl(var(--muted) / 0.3);
        }
        .rbc-today {
          background-color: hsl(var(--cyan) / 0.1);
        }
        .rbc-event {
          cursor: pointer;
        }
        .rbc-event:hover {
          opacity: 1 !important;
        }
        /* Removed .rbc-toolbar styles as we now have a custom one */
      `}</style>
    </DashboardLayout>
  );
};

export default Tasks;