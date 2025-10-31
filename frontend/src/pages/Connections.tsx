import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Github, Code, Eye, EyeOff, CheckCircle, Calendar, Briefcase, MessageCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { platformsApi, userApi } from "@/lib/api";

const Connections = () => {
  const [showKey, setShowKey] = useState(false);
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [leetcodeKey, setLeetcodeKey] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch platform connection status
  const { data: platformsData, isLoading: platformsLoading } = useQuery({
    queryKey: ['userPlatforms'],
    queryFn: async () => {
      const response = await userApi.getPlatforms();
      return response.data.data;
    },
  });

  const platforms = platformsData || [];

  const handleGitHubConnect = () => {
    toast({
      title: "GitHub OAuth",
      description: "OAuth integration coming soon. For now, please use the API to connect manually.",
    });
  };

  const handleLeetCodeConnect = async () => {
    if (!leetcodeUsername) {
      toast({
        title: "Missing Information",
        description: "Please enter your LeetCode username",
        variant: "destructive",
      });
      return;
    }

    setLoading('LEETCODE');
    try {
      await platformsApi.connectPlatform('leetcode', {
        username: leetcodeUsername,
        accessToken: leetcodeKey || undefined,
      });

      toast({
        title: "Connected!",
        description: "Successfully connected to LeetCode",
      });

      // Refresh platforms data
      queryClient.invalidateQueries({ queryKey: ['userPlatforms'] });

      // Clear form
      setLeetcodeUsername("");
      setLeetcodeKey("");
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.response?.data?.message || "Failed to connect to LeetCode",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    setLoading(platform);
    try {
      await platformsApi.disconnectPlatform(platform.toLowerCase());

      toast({
        title: "Disconnected",
        description: `Successfully disconnected from ${platform}`,
      });

      // Refresh platforms data
      queryClient.invalidateQueries({ queryKey: ['userPlatforms'] });
    } catch (error: any) {
      toast({
        title: "Disconnection Failed",
        description: error.response?.data?.message || `Failed to disconnect from ${platform}`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getPlatformByName = (name: string) => {
    return platforms.find((p: any) => p.name === name);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Platform Connections</h1>
          <p className="text-muted-foreground">Connect your accounts to track your development activity</p>
        </div>

        {platformsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan" />
          </div>
        ) : (
          <Tabs defaultValue="stats" className="space-y-6">
            <TabsList className="glass-card border-border/50 p-1">
              <TabsTrigger value="stats" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan/20 data-[state=active]:to-purple/20">
                Stats Platforms
              </TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan/20 data-[state=active]:to-purple/20">
                Task Platforms
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* GitHub OAuth */}
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Github className="text-cyan" size={24} />
                      <span>GitHub</span>
                      {getPlatformByName('GitHub')?.connected && (
                        <span className="ml-auto text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                          Connected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {getPlatformByName('GitHub')?.connected ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Connected as: <span className="text-foreground">{getPlatformByName('GitHub')?.username}</span>
                        </p>
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleDisconnect('GITHUB')}
                          disabled={loading === 'GITHUB'}
                        >
                          {loading === 'GITHUB' ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Disconnecting...
                            </>
                          ) : (
                            'Disconnect'
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full btn-gradient text-background font-semibold"
                        onClick={handleGitHubConnect}
                      >
                        Connect via OAuth
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* LeetCode Credentials */}
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Code className="text-purple" size={24} />
                      <span>LeetCode</span>
                      {getPlatformByName('LeetCode')?.connected && (
                        <span className="ml-auto text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                          Connected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {getPlatformByName('LeetCode')?.connected ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Connected as: <span className="text-foreground">{getPlatformByName('LeetCode')?.username}</span>
                        </p>
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleDisconnect('LEETCODE')}
                          disabled={loading === 'LEETCODE'}
                        >
                          {loading === 'LEETCODE' ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Disconnecting...
                            </>
                          ) : (
                            'Disconnect'
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="username" className="text-sm">Username</Label>
                          <Input
                            id="username"
                            type="text"
                            placeholder="Your LeetCode username"
                            className="bg-surface/50 border-border focus:border-cyan"
                            value={leetcodeUsername}
                            onChange={(e) => setLeetcodeUsername(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="key" className="text-sm">Session Key (Optional)</Label>
                          <div className="relative">
                            <Input
                              id="key"
                              type={showKey ? "text" : "password"}
                              placeholder="LeetCode session key (optional)"
                              className="bg-surface/50 border-border focus:border-cyan pr-10"
                              value={leetcodeKey}
                              onChange={(e) => setLeetcodeKey(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <Button
                          className="w-full btn-gradient text-background font-semibold"
                          onClick={handleLeetCodeConnect}
                          disabled={loading === 'LEETCODE'}
                        >
                          {loading === 'LEETCODE' ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Codeforces */}
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Code className="text-orange-500" size={24} />
                      <span>Codeforces</span>
                      {getPlatformByName('Codeforces')?.connected && (
                        <span className="ml-auto text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                          Connected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your Codeforces account to track competitive programming progress
                    </p>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tasks">
              <div className="grid md:grid-cols-2 gap-6">
                {/* OpenProject */}
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Briefcase className="text-cyan" size={24} />
                      <span>OpenProject</span>
                      {getPlatformByName('OpenProject')?.connected && (
                        <span className="ml-auto text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                          Connected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>

                {/* Google Calendar */}
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Calendar className="text-blue-500" size={24} />
                      <span>Google Calendar</span>
                      {getPlatformByName('Google Calendar')?.connected && (
                        <span className="ml-auto text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                          Connected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>

                {/* Microsoft Calendar */}
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Calendar className="text-blue-600" size={24} />
                      <span>Microsoft Calendar</span>
                      {getPlatformByName('Microsoft Calendar')?.connected && (
                        <span className="ml-auto text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                          Connected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>

                {/* Slack */}
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <MessageCircle className="text-purple-500" size={24} />
                      <span>Slack</span>
                      {getPlatformByName('Slack')?.connected && (
                        <span className="ml-auto text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                          Connected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Connections;
