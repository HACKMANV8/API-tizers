import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Seed Missions
  console.log('Seeding missions...');

  const missions = [
    // Daily Missions
    {
      title: 'Daily Commit Streak',
      description: 'Make at least 1 commit to any repository today',
      type: 'DAILY',
      category: 'COMMITS',
      points: 10,
      requirements: { commits: 1 },
      isActive: true,
    },
    {
      title: 'Problem Solver',
      description: 'Solve 1 coding problem on any competitive programming platform',
      type: 'DAILY',
      category: 'CODING',
      points: 15,
      requirements: { problemsSolved: 1 },
      isActive: true,
    },
    {
      title: 'Task Master',
      description: 'Complete 3 tasks from your task list',
      type: 'DAILY',
      category: 'TASKS',
      points: 10,
      requirements: { tasksCompleted: 3 },
      isActive: true,
    },
    {
      title: 'Code Reviewer',
      description: 'Review 2 pull requests',
      type: 'DAILY',
      category: 'COMMITS',
      points: 12,
      requirements: { reviews: 2 },
      isActive: true,
    },
    {
      title: 'Early Bird',
      description: 'Complete your first activity before 9 AM',
      type: 'DAILY',
      category: 'MIXED',
      points: 5,
      requirements: { activityBefore: '09:00' },
      isActive: true,
    },

    // Weekly Missions
    {
      title: 'Weekly Warrior',
      description: 'Maintain a 7-day activity streak',
      type: 'WEEKLY',
      category: 'STREAK',
      points: 50,
      requirements: { streakDays: 7 },
      isActive: true,
    },
    {
      title: 'Code Marathon',
      description: 'Make at least 20 commits this week',
      type: 'WEEKLY',
      category: 'COMMITS',
      points: 40,
      requirements: { commits: 20 },
      isActive: true,
    },
    {
      title: 'Algorithm Expert',
      description: 'Solve 10 coding problems this week',
      type: 'WEEKLY',
      category: 'CODING',
      points: 60,
      requirements: { problemsSolved: 10 },
      isActive: true,
    },
    {
      title: 'Task Champion',
      description: 'Complete 15 tasks this week',
      type: 'WEEKLY',
      category: 'TASKS',
      points: 45,
      requirements: { tasksCompleted: 15 },
      isActive: true,
    },
    {
      title: 'PR Creator',
      description: 'Create and merge 5 pull requests this week',
      type: 'WEEKLY',
      category: 'COMMITS',
      points: 55,
      requirements: { pullRequests: 5, merged: true },
      isActive: true,
    },
    {
      title: 'Hard Problem Solver',
      description: 'Solve 2 hard-level problems this week',
      type: 'WEEKLY',
      category: 'CODING',
      points: 70,
      requirements: { hardProblems: 2 },
      isActive: true,
    },
    {
      title: 'Consistency King',
      description: 'Be active for at least 5 days this week',
      type: 'WEEKLY',
      category: 'STREAK',
      points: 35,
      requirements: { activeDays: 5 },
      isActive: true,
    },
  ];

  for (const mission of missions) {
    await prisma.mission.upsert({
      where: {
        // Create a composite unique key based on title
        id: mission.title.toLowerCase().replace(/\s+/g, '-'),
      },
      update: mission,
      create: mission,
    });
  }

  console.log(`Seeded ${missions.length} missions`);

  // Seed Portfolio Templates
  console.log('Seeding portfolio templates...');

  const templates = [
    {
      name: 'Minimal Developer',
      description: 'A clean, minimal portfolio template perfect for developers',
      thumbnailUrl: '/templates/minimal-developer.png',
      templateConfig: {
        layout: 'single-page',
        sections: ['hero', 'about', 'skills', 'projects', 'github-stats', 'contact'],
        theme: 'light',
        primaryColor: '#3b82f6',
        fontFamily: 'Inter',
      },
      isActive: true,
    },
    {
      name: 'Dark Mode Pro',
      description: 'A sleek dark-themed portfolio with modern design',
      thumbnailUrl: '/templates/dark-mode-pro.png',
      templateConfig: {
        layout: 'multi-page',
        sections: ['hero', 'about', 'experience', 'projects', 'achievements', 'blog', 'contact'],
        theme: 'dark',
        primaryColor: '#8b5cf6',
        fontFamily: 'Poppins',
      },
      isActive: true,
    },
    {
      name: 'Competitive Coder',
      description: 'Showcase your competitive programming achievements',
      thumbnailUrl: '/templates/competitive-coder.png',
      templateConfig: {
        layout: 'single-page',
        sections: ['hero', 'about', 'cp-stats', 'leetcode-profile', 'codeforces-profile', 'achievements', 'contact'],
        theme: 'light',
        primaryColor: '#10b981',
        fontFamily: 'Roboto',
      },
      isActive: true,
    },
    {
      name: 'Full Stack Showcase',
      description: 'Perfect for full-stack developers with diverse projects',
      thumbnailUrl: '/templates/fullstack-showcase.png',
      templateConfig: {
        layout: 'multi-page',
        sections: ['hero', 'about', 'skills', 'projects', 'github-stats', 'tech-stack', 'experience', 'contact'],
        theme: 'light',
        primaryColor: '#f59e0b',
        fontFamily: 'Montserrat',
      },
      isActive: true,
    },
    {
      name: 'Creative Developer',
      description: 'A vibrant, creative portfolio with animations',
      thumbnailUrl: '/templates/creative-developer.png',
      templateConfig: {
        layout: 'single-page',
        sections: ['hero', 'about', 'projects', 'skills', 'achievements', 'contact'],
        theme: 'dark',
        primaryColor: '#ec4899',
        fontFamily: 'Space Grotesk',
        animations: true,
      },
      isActive: true,
    },
  ];

  for (const template of templates) {
    await prisma.portfolioTemplate.upsert({
      where: {
        id: template.name.toLowerCase().replace(/\s+/g, '-'),
      },
      update: template,
      create: template,
    });
  }

  console.log(`Seeded ${templates.length} portfolio templates`);
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
