import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import StarField from "./StarField";
import PrismLogo from "./PrismLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, LayoutDashboard, Trophy, Link2, BarChart3, LogOut } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
    { icon: Link2, label: "Connections", path: "/connections" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <StarField />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/dashboard">
                <PrismLogo size="sm" />
              </Link>

              <nav className="hidden md:flex items-center gap-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-cyan/20 to-purple/20 text-cyan"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-4">
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Settings size={20} />
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <LogOut size={20} />
                  <span className="ml-2 hidden lg:inline">Logout</span>
                </Button>
                <Avatar className="h-10 w-10 border-2 border-cyan/50">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user42" />
                  <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium">{user?.username || 'User'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>

      {/* Mobile navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/50 backdrop-blur-sm bg-background/80 z-20">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isActive ? "text-cyan" : "text-muted-foreground"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
