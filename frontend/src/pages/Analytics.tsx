import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const Analytics = () => {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <BarChart3 className="text-cyan" size={28} />
              <span>Analytics Dashboard</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan/20 to-purple/20 rounded-full flex items-center justify-center">
                <BarChart3 className="text-cyan" size={40} />
              </div>
              <h3 className="text-2xl font-bold">Coming Soon</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Advanced analytics and insights into your development activity will be available here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
