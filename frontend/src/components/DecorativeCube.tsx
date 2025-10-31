interface DecorativeCubeProps {
  className?: string;
  color?: "cyan" | "purple";
  size?: "sm" | "md" | "lg";
}

const DecorativeCube = ({ className = "", color = "cyan", size = "md" }: DecorativeCubeProps) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const colors = {
    cyan: "from-cyan/20 to-cyan/10",
    purple: "from-purple/20 to-purple/10",
  };

  return (
    <div className={`${sizes[size]} ${className} relative animate-cube-float`}>
      <div className="absolute inset-0 bg-gradient-to-br opacity-50 blur-md rounded-lg"
        style={{
          backgroundImage: color === "cyan" 
            ? "linear-gradient(135deg, hsl(189 100% 50% / 0.2), hsl(189 100% 50% / 0.05))"
            : "linear-gradient(135deg, hsl(293 84% 58% / 0.2), hsl(293 84% 58% / 0.05))"
        }}
      />
      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
        <defs>
          <linearGradient id={`cubeGrad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color === "cyan" ? "hsl(189, 100%, 50%)" : "hsl(293, 84%, 58%)"} opacity="0.6" />
            <stop offset="100%" stopColor={color === "cyan" ? "hsl(189, 100%, 50%)" : "hsl(293, 84%, 58%)"} opacity="0.3" />
          </linearGradient>
        </defs>
        
        {/* Isometric cube */}
        <polygon 
          points="50,25 75,37.5 50,50 25,37.5" 
          fill={`url(#cubeGrad-${color})`}
          opacity="0.8"
        />
        <polygon 
          points="25,37.5 25,62.5 50,75 50,50" 
          fill={`url(#cubeGrad-${color})`}
          opacity="0.6"
        />
        <polygon 
          points="50,50 75,37.5 75,62.5 50,75" 
          fill={`url(#cubeGrad-${color})`}
          opacity="0.7"
        />
      </svg>
    </div>
  );
};

export default DecorativeCube;
