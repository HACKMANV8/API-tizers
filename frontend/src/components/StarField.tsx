import { useEffect, useRef } from "react";

const StarField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    interface Cube {
      x: number;
      y: number;
      z: number;
      size: number;
      vx: number;
      vy: number;
      vz: number;
      rotation: number;
      rotationSpeed: number;
      color: string;
      opacity: number;
    }

    const cubes: Cube[] = [];
    const numCubes = 25;

    // Cyan and purple colors matching the logo
    const colors = [
      "rgba(0, 217, 255, 0.25)",      // Cyan
      "rgba(217, 70, 239, 0.25)",     // Purple
      "rgba(100, 200, 255, 0.2)",     // Light blue
      "rgba(180, 100, 230, 0.2)",     // Light purple
    ];

    for (let i = 0; i < numCubes; i++) {
      cubes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 1500,
        size: Math.random() * 30 + 15,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.015,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.4 + 0.2,
      });
    }

    let animationFrameId: number;
    let time = 0;

    const drawCube = (cube: Cube) => {
      const scale = 800 / (800 + cube.z);
      const x = cube.x * scale + canvas.width / 2 * (1 - scale);
      const y = cube.y * scale + canvas.height / 2 * (1 - scale);
      const size = cube.size * scale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(cube.rotation);

      // Draw isometric cube faces
      const halfSize = size / 2;

      // Top face
      ctx.beginPath();
      ctx.moveTo(0, -halfSize * 0.6);
      ctx.lineTo(halfSize * 0.866, -halfSize * 0.1);
      ctx.lineTo(0, halfSize * 0.4);
      ctx.lineTo(-halfSize * 0.866, -halfSize * 0.1);
      ctx.closePath();
      ctx.fillStyle = cube.color.replace(/[\d.]+\)$/, `${cube.opacity * 0.9})`);
      ctx.fill();

      // Left face
      ctx.beginPath();
      ctx.moveTo(-halfSize * 0.866, -halfSize * 0.1);
      ctx.lineTo(0, halfSize * 0.4);
      ctx.lineTo(0, halfSize * 1.4);
      ctx.lineTo(-halfSize * 0.866, halfSize * 0.9);
      ctx.closePath();
      ctx.fillStyle = cube.color.replace(/[\d.]+\)$/, `${cube.opacity * 0.6})`);
      ctx.fill();

      // Right face
      ctx.beginPath();
      ctx.moveTo(halfSize * 0.866, -halfSize * 0.1);
      ctx.lineTo(0, halfSize * 0.4);
      ctx.lineTo(0, halfSize * 1.4);
      ctx.lineTo(halfSize * 0.866, halfSize * 0.9);
      ctx.closePath();
      ctx.fillStyle = cube.color.replace(/[\d.]+\)$/, `${cube.opacity * 0.7})`);
      ctx.fill();

      // Glow effect
      ctx.shadowBlur = 20;
      ctx.shadowColor = cube.color;
      ctx.strokeStyle = cube.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    const animate = () => {
      ctx.fillStyle = "rgba(10, 10, 10, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time += 0.01;

      // Sort cubes by z-index for proper depth
      cubes.sort((a, b) => b.z - a.z);

      cubes.forEach((cube) => {
        cube.x += cube.vx;
        cube.y += cube.vy;
        cube.z += cube.vz;
        cube.rotation += cube.rotationSpeed;

        // Wrap around edges
        if (cube.x < -100) cube.x = canvas.width + 100;
        if (cube.x > canvas.width + 100) cube.x = -100;
        if (cube.y < -100) cube.y = canvas.height + 100;
        if (cube.y > canvas.height + 100) cube.y = -100;
        if (cube.z < -500) cube.z = 1000;
        if (cube.z > 1000) cube.z = -500;

        // Subtle opacity pulsing
        cube.opacity += (Math.random() - 0.5) * 0.01;
        cube.opacity = Math.max(0.2, Math.min(0.6, cube.opacity));

        drawCube(cube);
      });

      // Add subtle grid lines
      ctx.strokeStyle = "rgba(0, 217, 255, 0.03)";
      ctx.lineWidth = 1;
      
      const gridSize = 100;
      const offsetX = (time * 10) % gridSize;
      const offsetY = (time * 10) % gridSize;
      
      for (let x = -offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = -offsetY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Add floating particles
      const particleCount = 30;
      for (let i = 0; i < particleCount; i++) {
        const angle = (time + i) * 0.3;
        const radius = 100 + Math.sin(time + i * 0.5) * 50;
        const x = Math.cos(angle) * radius + (canvas.width / 4) * (1 + Math.sin(time * 0.5 + i));
        const y = Math.sin(angle * 0.8) * radius + (canvas.height / 4) * (1 + Math.cos(time * 0.3 + i));
        const size = 1 + Math.sin(time * 2 + i) * 0.5;
        
        const color = i % 2 === 0 ? "rgba(0, 217, 255, 0.3)" : "rgba(217, 70, 239, 0.3)";
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default StarField;
