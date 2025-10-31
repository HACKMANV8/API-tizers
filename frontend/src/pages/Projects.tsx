import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Loader2,
  FolderOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { platformsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

const Projects = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { toast } = useToast();

  // Fetch projects
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ["openproject-projects"],
    queryFn: async () => {
      const response = await platformsApi.getOpenProjectProjects();
      return response.data.data;
    },
    retry: 1,
  });

  // Fetch work packages for selected project
  const {
    data: workPackagesData,
    isLoading: workPackagesLoading,
    refetch: refetchWorkPackages,
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

  // Handle project selection
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
  };

  // Show error if connection not found
  if (projectsError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="glass-card border-border/50">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <Briefcase className="mx-auto h-12 w-12 text-amber-500/50" />
                <div>
                  <h3 className="text-lg font-semibold">OpenProject Not Connected</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please connect your OpenProject account in the Connections page to view your projects.
                  </p>
                </div>
                <Button
                  onClick={() => (window.location.href = "/connections")}
                  className="btn-gradient text-background font-semibold"
                >
                  Go to Connections
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan to-purple-400 bg-clip-text text-transparent">
              OpenProject Projects
            </h1>
            <p className="text-muted-foreground mt-1">
              View your projects and work packages
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Projects List */}
          <Card className="glass-card border-border/50 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="text-amber-500" size={20} />
                Projects ({projects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
              {projectsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No projects found</p>
                </div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-all",
                      "hover:border-cyan/50 hover:bg-surface/50",
                      selectedProject?.id === project.id
                        ? "border-cyan bg-cyan/10"
                        : "border-border/30 bg-surface/30"
                    )}
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold truncate">{project.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {project.identifier}
                      </p>
                      {project.description?.raw && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                          {project.description.raw}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Work Packages List */}
          <Card className="glass-card border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="text-amber-500" size={20} />
                {selectedProject ? (
                  <>
                    {selectedProject.name} - My Tasks ({workPackages.length})
                  </>
                ) : (
                  "Select a Project"
                )}
              </CardTitle>
              {selectedProject && (
                <p className="text-xs text-muted-foreground mt-1">
                  Showing work packages assigned to you
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
              {!selectedProject ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Select a project to view work packages</p>
                </div>
              ) : workPackagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan" />
                </div>
              ) : workPackages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No work packages found in this project</p>
                </div>
              ) : (
                workPackages.map((wp) => (
                  <div
                    key={wp.id}
                    className="p-4 rounded-lg border border-border/30 bg-surface/30 hover:border-border/50 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">
                            #{wp.id} {wp.subject}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs", getStatusColor(wp._links.status.title))}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(wp._links.status.title)}
                              {wp._links.status.title}
                            </span>
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      {wp.description?.raw && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {wp.description.raw}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className={cn(getPriorityColor(wp._links.priority.title))}>
                          {wp._links.priority.title}
                        </Badge>

                        {wp._links.assignee && (
                          <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                            👤 {wp._links.assignee.title}
                          </Badge>
                        )}

                        {wp.dueDate && (
                          <Badge variant="outline" className="bg-purple-500/20 text-purple-500 border-purple-500/30">
                            📅 {new Date(wp.dueDate).toLocaleDateString()}
                          </Badge>
                        )}

                        {wp.estimatedTime && (
                          <Badge variant="outline" className="bg-cyan-500/20 text-cyan-500 border-cyan-500/30">
                            ⏱️ Est: {wp.estimatedTime.replace('PT', '').replace('H', 'h')}
                          </Badge>
                        )}
                        
                        {/* Removed spentTime badge */}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Projects;