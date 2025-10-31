import { Link } from "react-router-dom";
import StarField from "@/components/StarField";
import PrismLogo from "@/components/PrismLogo";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Trophy, Link2, Zap } from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: BarChart3,
      title: "Unified Analytics",
      description: "Track all your development activities in one place",
    },
    {
      icon: Trophy,
      title: "Gamification",
      description: "Earn XP, complete missions, and climb the leaderboard",
    },
    {
      icon: Link2,
      title: "Platform Integration",
      description: "Connect GitHub, LeetCode, and more with ease",
    },
    {
      icon: Zap,
      title: "Real-time Insights",
      description: "Get instant feedback on your coding progress",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <StarField />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <PrismLogo size="sm" />
              <Link to="/auth">
                <Button variant="outline" className="border-cyan/30 hover:bg-cyan/10">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Your Developer Journey,
              <br />
              <span className="bg-gradient-to-r from-cyan to-purple bg-clip-text text-transparent">
                Visualized & Gamified
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Track your coding activity across multiple platforms, earn rewards, and compete with developers worldwide.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth">
                <Button className="btn-gradient text-background font-semibold px-8 py-6 text-lg group">
                  Start Your Journey
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" className="border-border/50 px-8 py-6 text-lg">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Everything You Need to Level Up
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="glass-card glass-card-hover rounded-xl p-6 space-y-4 animate-scale-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan/20 to-purple/20 rounded-lg flex items-center justify-center">
                      <Icon className="text-cyan" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto glass-card rounded-2xl p-8 md:p-12 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Transform Your Coding Experience?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of developers who are tracking their progress and achieving their goals.
            </p>
            <Link to="/auth">
              <Button className="btn-gradient text-background font-semibold px-8 py-6 text-lg">
                Get Started Free
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
