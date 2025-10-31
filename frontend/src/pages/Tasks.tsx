import { useState, useEffect } from "react";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

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

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const { toast } = useToast();

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

  // Check if Google Calendar is connected
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
        const googleCalendar = response.data.data.find(
          (platform: any) => platform.platform === "GOOGLE_CALENDAR"
        );
        console.log("[Tasks] Google Calendar connection:", googleCalendar);
        setIsConnected(googleCalendar?.connected || false);
        setConnectedEmail(googleCalendar?.username || null);
        console.log("[Tasks] Connected email:", googleCalendar?.username);
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
    } catch (error: any) {
      console.error("Failed to fetch tasks:", error);
      console.error("Error details:", error.response?.data);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load tasks. Please try again.",
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
    } catch (error: any) {
      console.error("Failed to sync:", error);
      console.error("Sync error details:", error.response?.data);
      const message = error.response?.data?.message || "Failed to sync Google Calendar. Please try again.";
      toast({
        title: "Sync Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    checkConnection();
    fetchTasks();
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
    let navView = view === 'agenda' ? 'day' : view; // Treat agenda nav like day

    if (action === 'PREV') {
      newDate = moment(date).subtract(1, navView).toDate();
    } else if (action === 'NEXT') {
      newDate = moment(date).add(1, navView).toDate();
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
      <div className="space-y-6">
        {/* === TOP HEADER === */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarIcon className="text-cyan" />
              Tasks Calendar
              <span className="text-sm font-normal text-muted-foreground">
                ({tasks.length} {tasks.length === 1 ? 'task' : 'tasks'})
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage your tasks from Google Calendar and other platforms
            </p>
            {isConnected && connectedEmail && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="text-green-500 text-sm">✓</span>
                <span className="text-sm text-muted-foreground">Syncing from:</span>
                <span className="text-sm font-semibold text-green-500">{connectedEmail}</span>
              </div>
            )}
            {!isConnected && (
              <p className="text-amber-500 text-sm mt-2 flex items-center gap-2">
                ⚠️ Google Calendar not connected. Please{" "}
                <a href="/connections" className="underline hover:text-amber-400">
                  connect your calendar
                </a>
                {" "}first.
              </p>
            )}
          </div>

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
                      <Button variant="ghost" size="icon" className="flex-shrink-0 -mt-2 -mr-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
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
              {isConnected
                ? "Click 'Sync Google Calendar' to import your events as tasks"
                : "Connect your Google Calendar to start seeing your events as tasks"
              }
            </p>
            {!isConnected && (
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