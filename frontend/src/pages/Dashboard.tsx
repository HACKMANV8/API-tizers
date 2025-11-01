import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { userApi } from "@/lib/api";
import * as LucideIcons from "lucide-react";
import { Loader2, Search } from "lucide-react";
import { GitHubStats } from "@/components/GitHubStats";
import { CodeforcesStats } from "@/components/CodeforcesStats";
import { LeetCodeStats } from "@/components/LeetCodeStats";

const Dashboard = () => {
  // Fetch activity feed
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['userActivity'],
    queryFn: async () => {
      const response = await userApi.getActivity(20);
      return response.data.data;
    },
  });

  // Fetch user stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await userApi.getStats();
      return response.data.data;
    },
  });

  // Fetch platforms
  const { data: platformsData, isLoading: platformsLoading } = useQuery({
    queryKey: ['userPlatforms'],
    queryFn: async () => {
      const response = await userApi.getPlatforms();
      return response.data.data;
    },
  });

  const activities = activityData || [];
  const stats = statsData || { totalPoints: 0, level: 0, currentStreak: 0 };
  const platforms = platformsData || [];

  // Get GitHub connections from the new data structure
  const githubPlatform = platforms.find((p: any) => p.name === 'GitHub');
  const githubConnections = githubPlatform?.connections || [];

  // Get Codeforces connections
  const codeforcesPlatform = platforms.find((p: any) => p.name === 'Codeforces');
  const codeforcesConnections = codeforcesPlatform?.connections || [];

  // Get LeetCode connections
  const leetcodePlatform = platforms.find((p: any) => p.name === 'LeetCode');
  const leetcodeConnections = leetcodePlatform?.connections || [];

  return (
    <DashboardLayout>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Activity Feed */}
        <Card className="glass-card border-border/50 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Activity Feed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Panintrakiblerqgn"
                className="w-full pl-10 pr-4 py-2 bg-surface/50 border border-border rounded-lg text-sm focus:border-cyan outline-none transition-colors"
              />
            </div>

            {activityLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No activity yet. Start connecting platforms!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity: any, index: number) => {
                  const IconComponent = (LucideIcons as any)[activity.icon] || LucideIcons.Activity;
                  const timeAgo = new Date(activity.time).toLocaleString();

                  return (
                    <div
                      key={index}
                      className="p-3 bg-gradient-to-br from-surface/80 to-surface/40 rounded-lg border border-border/30 hover:border-cyan/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-surface-light ${activity.color}`}>
                          <IconComponent size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight mb-1">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                          <p className="text-xs text-cyan mt-1">{timeAgo}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Stats Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="hsl(var(--surface-light))"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${((stats.currentLevelPoints || 0) / (stats.nextLevelPoints || 100)) * 352} 352`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="hsl(189, 100%, 50%)" />
                          <stop offset="100%" stopColor="hsl(293, 84%, 58%)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">Level</span>
                      <span className="text-2xl font-bold">{stats.level || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LucideIcons.Trophy className="text-cyan" size={18} />
                      <span className="text-sm text-muted-foreground">Total Points:</span>
                    </div>
                    <span className="font-semibold">{stats.totalPoints || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LucideIcons.Flame className="text-cyan" size={18} />
                      <span className="text-sm text-muted-foreground">Current Streak:</span>
                    </div>
                    <span className="font-semibold">{stats.currentStreak || 0} days</span>
                  </div>
                  {stats.rank && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LucideIcons.Award className="text-cyan" size={18} />
                        <span className="text-sm text-muted-foreground">Rank:</span>
                      </div>
                      <span className="font-semibold">#{stats.rank}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="glass-card border-border/50 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Complete 100 LeetCode Mediums</span>
              </div>
              <Progress value={42} className="h-2 bg-surface-light" />
              <div className="text-xs text-muted-foreground text-right">42/100</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Read 5 Tech Books</span>
              </div>
              <Progress value={20} className="h-2 bg-surface-light" />
              <div className="text-xs text-muted-foreground text-right">1/5</div>
            </div>
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Top Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🐍</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">JavaScript</span>
                  </div>
                  <Progress value={85} className="h-2 bg-surface-light" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🎨</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">React</span>
                  </div>
                  <Progress value={70} className="h-2 bg-surface-light" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected Platforms */}
        <Card className="glass-card border-border/50 md:col-span-2">
          <CardHeader>
            <CardTitle>Connected Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            {platformsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {platforms.map((platform: any, index: number) => {
                  const IconComponent = (LucideIcons as any)[platform.icon === 'github' ? 'Github' : platform.icon === 'code' ? 'Code' : platform.icon === 'terminal' ? 'Terminal' : platform.icon === 'calendar' ? 'Calendar' : platform.icon === 'briefcase' ? 'Briefcase' : 'MessageCircle'] || LucideIcons.Circle;

                  return (
                    <div
                      key={index}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                        platform.connected
                          ? "bg-gradient-to-br from-cyan/20 to-purple/20"
                          : "bg-surface/50 opacity-50"
                      }`}
                      title={platform.name}
                    >
                      <IconComponent
                        className={platform.connected ? "text-cyan" : "text-muted-foreground"}
                        size={24}
                      />
                      <span className="text-xs">{platform.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GitHub Stats - Full width */}
        {githubConnections.length > 0 && (
          <div className="md:col-span-2 lg:col-span-3">
            <GitHubStats connections={githubConnections} />
          </div>
        )}

        {/* Codeforces Stats - Half width */}
        {codeforcesConnections.length > 0 && (
          <div className="md:col-span-1 lg:col-span-1">
            <CodeforcesStats connections={codeforcesConnections} />
          </div>
        )}

        {/* LeetCode Stats - Half width next to Codeforces */}
        {leetcodeConnections.length > 0 && (
          <div className="md:col-span-1 lg:col-span-1">
            <LeetCodeStats connections={leetcodeConnections} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
