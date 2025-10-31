import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import StarField from "@/components/StarField";
import PrismLogo from "@/components/PrismLogo";
import AnimatedCubes from "@/components/AnimatedCubes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Mail, Lock, Loader2 } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login with email or username
        await login(formData.email, formData.password);
      } else {
        // Register new account
        await register(formData.email, formData.username, formData.password);
      }

      // Navigate to dashboard on success
      navigate("/dashboard");
    } catch (error) {
      // Error handling is done in AuthContext
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <StarField />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Animated Logo */}
          <div className="hidden lg:flex items-center justify-center animate-float">
            <div className="relative w-80 h-80">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/20 to-purple/20 opacity-50 blur-3xl rounded-full animate-glow-pulse" />
              <div className="relative flex items-center justify-center h-full">
                <AnimatedCubes size={320} />
              </div>
            </div>
          </div>

          {/* Right side - Auth form */}
          <div className="w-full max-w-md mx-auto animate-scale-in">
            <div className="glass-card rounded-2xl p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                  <PrismLogo size="md" />
                </div>
                <h2 className="text-2xl font-bold">
                  {isLogin ? "Unlock Your Universe" : "Join the Hub"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm text-muted-foreground">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="pl-10 bg-surface/50 border-border focus:border-cyan transition-colors"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-muted-foreground">
                    {isLogin ? "Email" : "Email Address"}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      id="email"
                      type="email"
                      placeholder={isLogin ? "Email" : "Email Address"}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10 bg-surface/50 border-border focus:border-cyan transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-10 pr-10 bg-surface/50 border-border focus:border-cyan transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {isLogin && (
                  <div className="flex justify-between items-center text-sm">
                    <button type="button" className="text-cyan hover:underline">
                      Forget Password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full btn-gradient text-background font-semibold h-11"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLogin ? "Logging in..." : "Creating account..."}
                    </>
                  ) : (
                    isLogin ? "Log In" : "Sign Up"
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  {isLogin ? (
                    <>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setIsLogin(false)}
                        className="text-cyan hover:underline font-medium"
                      >
                        Sign Up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setIsLogin(true)}
                        className="text-cyan hover:underline font-medium"
                      >
                        Log In
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
