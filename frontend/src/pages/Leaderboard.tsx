import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";
import { leaderboardApi } from "@/lib/api";

const Leaderboard = () => {
  const { data: leaderboardResponse, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const response = await leaderboardApi.getLeaderboard('ALL_TIME', 100);
      return response.data.data;
    },
  });

  const leaderboardData = leaderboardResponse || [];

  const getBadgeIcon = (badge: string | undefined) => {
    if (badge === "gold") return <Trophy className="text-yellow-500" size={20} />;
    if (badge === "silver") return <Medal className="text-gray-400" size={20} />;
    if (badge === "bronze") return <Award className="text-orange-600" size={20} />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-orange-600";
    return "text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Card className="glass-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold">Global Leaderboard</CardTitle>
              <Trophy className="text-cyan" size={32} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-cyan" />
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No leaderboard data yet. Start competing!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-muted-foreground border-b border-border/30">
                  <div className="col-span-2">Rank</div>
                  <div className="col-span-5">Username</div>
                  <div className="col-span-2 text-center">Streak</div>
                  <div className="col-span-3 text-right">Points</div>
                </div>

                {/* Leaderboard entries */}
                {leaderboardData.map((entry: any) => {
                  // Determine badge based on rank (if not provided by backend)
                  let badge = entry.badge;
                  if (!badge) {
                    if (entry.rank === 1) badge = "gold";
                    else if (entry.rank === 2) badge = "silver";
                    else if (entry.rank === 3) badge = "bronze";
                    else if (entry.rank <= 10) badge = "purple";
                    else if (entry.rank <= 50) badge = "blue";
                  }

                  // Calculate level from points (100 points per level)
                  const level = Math.floor(entry.points / 100);

                  return (
                    <div
                      key={entry.rank}
                      className={`grid grid-cols-12 gap-4 px-4 py-4 rounded-lg transition-all hover:bg-surface/50 ${
                        entry.rank <= 3 ? "bg-gradient-to-r from-surface/40 to-surface/20" : ""
                      }`}
                    >
                      <div className="col-span-2 flex items-center gap-2">
                        {entry.rank <= 3 ? (
                          <div className="flex items-center gap-2">
                            {getBadgeIcon(badge)}
                            <span className={`font-bold ${getRankColor(entry.rank)}`}>
                              {entry.rank}
                            </span>
                          </div>
                        ) : (
                          <span className="font-medium text-muted-foreground">{entry.rank}</span>
                        )}
                      </div>

                      <div className="col-span-5 flex items-center gap-2">
                        <span className="font-medium">{entry.username}</span>
                      </div>

                      <div className="col-span-2 flex items-center justify-center">
                        {entry.streakDays > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30"
                          >
                            🔥 {entry.streakDays}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>

                      <div className="col-span-3 flex items-center justify-end">
                        <span className="font-bold text-cyan">{entry.points} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Leaderboard;
