import AnimatedCubes from "./AnimatedCubes";

const PrismLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const pixelSizes = {
    sm: 32,
    md: 48,
    lg: 64,
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizes[size]} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-cyan/5 blur-lg rounded-lg" />
        <div className="relative z-10 opacity-95">
          <AnimatedCubes size={pixelSizes[size]} />
        </div>
      </div>
      <span className={`font-bold bg-gradient-to-r from-cyan to-purple bg-clip-text text-transparent ${
        size === "sm" ? "text-xl" : size === "md" ? "text-2xl" : "text-3xl"
      }`}>
        Prism
      </span>
    </div>
  );
};

export default PrismLogo;
