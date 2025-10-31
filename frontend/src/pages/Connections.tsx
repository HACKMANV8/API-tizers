import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [showKey, setShowKey] = useState(false);
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [leetcodeKey, setLeetcodeKey] = useState("");
  const [codeforcesUsername, setCodeforcesUsername] = useState("");
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

  // Handle GitHub OAuth callback
  useEffect(() => {
    const githubConnected = searchParams.get('github_connected');
    const reactivated = searchParams.get('reactivated');
    const error = searchParams.get('error');

    if (githubConnected === 'true') {
      toast({
        title: "Connected!",
        description: reactivated === 'true'
          ? "Successfully reconnected your GitHub account"
          : "Successfully connected to GitHub",
      });
      queryClient.invalidateQueries({ queryKey: ['userPlatforms'] });
      // Clean up URL params
      setSearchParams({});
    } else if (error) {
      let errorMessage = "Failed to connect to GitHub";
      if (error === 'invalid_token') {
        errorMessage = "Your session expired. Please login again.";
      } else if (error === 'missing_token') {
        errorMessage = "Please login before connecting GitHub.";
      } else if (error === 'already_connected' || error === 'account_already_connected') {
        const username = searchParams.get('username');
        errorMessage = username
          ? `GitHub account @${username} is already connected. To add a different account, log out of GitHub first or use a different browser/incognito mode.`
          : "This GitHub account is already connected. To connect a different account, log out of GitHub first.";
      }
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      // Clean up URL params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, queryClient, toast]);

  const handleGitHubConnect = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    // Get JWT token from localStorage (stored as 'accessToken')
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please login first before connecting GitHub",
        variant: "destructive",
      });
      return;
    }
    // Pass token in state parameter
    window.location.href = `${apiBaseUrl}/auth/github?state=${encodeURIComponent(token)}`;
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

  const handleCodeforcesConnect = async () => {
    if (!codeforcesUsername) {
      toast({
        title: "Missing Information",
        description: "Please enter your Codeforces username",
        variant: "destructive",
      });
      return;
    }

    setLoading('CODEFORCES');
    try {
      await platformsApi.connectPlatform('codeforces', {
        username: codeforcesUsername,
      });

      toast({
        title: "Connected!",
        description: "Successfully connected to Codeforces",
      });

      // Refresh platforms data
      queryClient.invalidateQueries({ queryKey: ['userPlatforms'] });

      // Clear form
      setCodeforcesUsername("");
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.response?.data?.message || "Failed to connect to Codeforces",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (platform: string, connectionId?: string, username?: string) => {
    const loadingKey = connectionId ? `${platform}-${connectionId}` : platform;
    setLoading(loadingKey);
    try {
      await platformsApi.disconnectPlatform(platform.toLowerCase(), connectionId);

      toast({
        title: "Disconnected",
        description: username
          ? `Successfully disconnected ${platform} account @${username}`
          : `Successfully disconnected from ${platform}`,
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
                {/* GitHub OAuth - Multiple Accounts Support */}
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Github className="text-cyan" size={24} />
                      <span>GitHub</span>
                      {getPlatformByName('GitHub')?.connected && (
                        <span className="ml-auto text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                          {getPlatformByName('GitHub')?.connections?.length || 0} Connected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* List all connected GitHub accounts */}
                    {getPlatformByName('GitHub')?.connections?.map((conn: any) => (
                      <div
                        key={conn.id}
                        className="flex items-center justify-between p-3 bg-surface-light/50 border border-border/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">@{conn.platformUsername}</p>
                          {conn.lastSynced && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last synced: {new Date(conn.lastSynced).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDisconnect('GITHUB', conn.id, conn.platformUsername)}
                          disabled={loading === `GITHUB-${conn.id}`}
                        >
                          {loading === `GITHUB-${conn.id}` ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Disconnecting...
                            </>
                          ) : (
                            'Disconnect'
                          )}
                        </Button>
                      </div>
                    ))}

                    {/* Instructions for adding multiple accounts */}
                    {getPlatformByName('GitHub')?.connections?.length > 0 && (
                      <div className="text-xs bg-surface-light/30 border border-border/30 p-3 rounded-lg space-y-2">
                        <p className="font-medium text-foreground flex items-center gap-2">
                          <span className="text-cyan">💡</span>
                          To add a different GitHub account:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                          <li>
                            <a
                              href="https://github.com/logout"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan hover:underline"
                            >
                              Log out of GitHub
                            </a>{' '}
                            first, then click the button below
                          </li>
                          <li>OR use a different browser/incognito mode</li>
                        </ol>
                        <p className="text-xs opacity-75 text-muted-foreground mt-2">
                          GitHub will automatically use your currently logged-in account.
                        </p>
                      </div>
                    )}

                    {/* Always show "Add Account" button */}
                    <Button
                      className="w-full btn-gradient text-background font-semibold"
                      onClick={handleGitHubConnect}
                    >
                      {getPlatformByName('GitHub')?.connections?.length > 0
                        ? '+ Add Another GitHub Account'
                        : 'Connect via OAuth'}
                    </Button>
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
                  <CardContent className="space-y-4">
                    {getPlatformByName('Codeforces')?.connected ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Connected as: <span className="text-foreground">{getPlatformByName('Codeforces')?.connections?.[0]?.platformUsername}</span>
                        </p>
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleDisconnect('CODEFORCES', getPlatformByName('Codeforces')?.connections?.[0]?.id)}
                          disabled={loading === `CODEFORCES-${getPlatformByName('Codeforces')?.connections?.[0]?.id}`}
                        >
                          {loading === `CODEFORCES-${getPlatformByName('Codeforces')?.connections?.[0]?.id}` ? (
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
                        <p className="text-sm text-muted-foreground mb-4">
                          Connect your Codeforces account to track competitive programming progress
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="codeforces-username" className="text-sm">Username</Label>
                          <Input
                            id="codeforces-username"
                            type="text"
                            placeholder="Your Codeforces handle (e.g., tourist)"
                            className="bg-surface/50 border-border focus:border-cyan"
                            value={codeforcesUsername}
                            onChange={(e) => setCodeforcesUsername(e.target.value)}
                          />
                        </div>

                        <Button
                          className="w-full btn-gradient text-background font-semibold"
                          onClick={handleCodeforcesConnect}
                          disabled={loading === 'CODEFORCES'}
                        >
                          {loading === 'CODEFORCES' ? (
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
