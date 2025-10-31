import { useEffect, useRef } from "react";

interface AnimatedCubesProps {
  size?: number;
}

const AnimatedCubes = ({ size = 300 }: AnimatedCubesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Cube structure with 8 vertices
    const createCube = (x: number, y: number, z: number, size: number) => {
      const halfSize = size / 2;
      return [
        [-halfSize + x, -halfSize + y, -halfSize + z],
        [halfSize + x, -halfSize + y, -halfSize + z],
        [halfSize + x, halfSize + y, -halfSize + z],
        [-halfSize + x, halfSize + y, -halfSize + z],
        [-halfSize + x, -halfSize + y, halfSize + z],
        [halfSize + x, -halfSize + y, halfSize + z],
        [halfSize + x, halfSize + y, halfSize + z],
        [-halfSize + x, halfSize + y, halfSize + z],
      ];
    };

    // Rotation matrices
    const rotateX = (point: number[], angle: number) => {
      const [x, y, z] = point;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [x, y * cos - z * sin, y * sin + z * cos];
    };

    const rotateY = (point: number[], angle: number) => {
      const [x, y, z] = point;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [x * cos + z * sin, y, -x * sin + z * cos];
    };

    const rotateZ = (point: number[], angle: number) => {
      const [x, y, z] = point;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [x * cos - y * sin, x * sin + y * cos, z];
    };

    // Project 3D to 2D
    const project = (point: number[]) => {
      const [x, y, z] = point;
      const scale = 200 / (200 + z);
      return [x * scale + canvas.width / 2, y * scale + canvas.height / 2, z];
    };

    // Draw a face
    const drawFace = (vertices: number[][], indices: number[], color: string, opacity: number) => {
      ctx.beginPath();
      const [x, y] = project(vertices[indices[0]]);
      ctx.moveTo(x, y);
      
      for (let i = 1; i < indices.length; i++) {
        const [px, py] = project(vertices[indices[i]]);
        ctx.lineTo(px, py);
      }
      
      ctx.closePath();
      ctx.fillStyle = color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
      ctx.fill();
      
      // Add glow
      ctx.strokeStyle = color.replace(')', `, ${opacity * 0.5})`).replace('rgb', 'rgba');
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const animate = () => {
      // Clear with transparency instead of dark background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      time += 0.01;

      // Create multiple cubes in formation
      const cubes = [
        { x: 0, y: -60, z: 0, size: 80, rotSpeed: 1.5, color: "rgb(0, 217, 255)" }, // Cyan - top
        { x: -50, y: 20, z: 20, size: 80, rotSpeed: 1.2, color: "rgb(217, 70, 239)" }, // Purple - left
        { x: 50, y: 20, z: 20, size: 80, rotSpeed: 1.35, color: "rgb(150, 140, 255)" }, // Light purple - right
        { x: 0, y: 20, z: -30, size: 80, rotSpeed: 1.28, color: "rgb(100, 200, 255)" }, // Light cyan - center
        { x: -25, y: 80, z: 0, size: 80, rotSpeed: 1.43, color: "rgb(180, 100, 230)" }, // Purple - bottom left
        { x: 25, y: 80, z: 10, size: 80, rotSpeed: 1.13, color: "rgb(0, 180, 220)" }, // Cyan - bottom right
      ];

      cubes.forEach((cubeConfig, index) => {
        let vertices = createCube(cubeConfig.x, cubeConfig.y, cubeConfig.z, cubeConfig.size);

        // Apply rotations
        const angleOffset = (index * Math.PI) / 3;
        vertices = vertices.map((v) => {
          let point = rotateX(v, time * cubeConfig.rotSpeed + angleOffset);
          point = rotateY(point, time * cubeConfig.rotSpeed * 0.7 + angleOffset);
          point = rotateZ(point, time * cubeConfig.rotSpeed * 0.5);
          return point;
        });

        // Calculate face centers for depth sorting
        const faces = [
          { indices: [0, 1, 2, 3], color: cubeConfig.color }, // Front
          { indices: [4, 5, 6, 7], color: cubeConfig.color }, // Back
          { indices: [0, 1, 5, 4], color: cubeConfig.color }, // Top
          { indices: [2, 3, 7, 6], color: cubeConfig.color }, // Bottom
          { indices: [0, 3, 7, 4], color: cubeConfig.color }, // Left
          { indices: [1, 2, 6, 5], color: cubeConfig.color }, // Right
        ];

        faces.forEach((face) => {
          const centerZ = face.indices.reduce((sum, i) => sum + vertices[i][2], 0) / 4;
          const depth = centerZ;
          const opacity = Math.max(0.3, Math.min(0.9, (depth + 200) / 400));
          drawFace(vertices, face.indices, face.color, opacity);
        });
      });

      // Add floating particles (matching StarField style)
      const particleCount = 15;
      for (let i = 0; i < particleCount; i++) {
        const angle = (time + i) * 0.3;
        const radius = 120 + Math.sin(time + i * 0.5) * 40;
        const x = Math.cos(angle) * radius + canvas.width / 2;
        const y = Math.sin(angle * 0.8) * radius + canvas.height / 2;
        const size = 1.5 + Math.sin(time * 2 + i) * 0.5;
        
        const color = i % 2 === 0 ? "rgba(0, 217, 255, 0.5)" : "rgba(217, 70, 239, 0.5)";
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    />
  );
};

export default AnimatedCubes;
