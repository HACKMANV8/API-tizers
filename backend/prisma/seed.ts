/**
 * Database Seed Script
 *
 * Creates sample users, accounts, snapshots, and other data for testing
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.leaderboardCache.deleteMany({});
  await prisma.platformSnapshot.deleteMany({});
  await prisma.userAccount.deleteMany({});
  await prisma.streak.deleteMany({});
  await prisma.deployRequest.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.integration.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.template.deleteMany({});

  // Create users
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: {
      email: 'alice@prism.dev',
      username: 'alice_codes',
      password: hashedPassword,
      role: 'USER',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@prism.dev',
      username: 'bob_builder',
      password: hashedPassword,
      role: 'USER',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@prism.dev',
      username: 'charlie_dev',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log(`✓ Created users: ${alice.username}, ${bob.username}, ${charlie.username}`);

  // Create user accounts (platform links)
  console.log('Creating platform accounts...');

  const aliceLeetcode = await prisma.userAccount.create({
    data: {
      userId: alice.id,
      platform: 'LEETCODE',
      accountId: 'alice_leetcode',
      config: { verified: true },
    },
  });

  const aliceGithub = await prisma.userAccount.create({
    data: {
      userId: alice.id,
      platform: 'GITHUB',
      accountId: 'alice-codes',
      config: { verified: true },
    },
  });

  const bobCodeforces = await prisma.userAccount.create({
    data: {
      userId: bob.id,
      platform: 'CODEFORCES',
      accountId: 'bob_cf',
      config: { verified: true },
    },
  });

  const bobLeetcode = await prisma.userAccount.create({
    data: {
      userId: bob.id,
      platform: 'LEETCODE',
      accountId: 'bob_leetcode',
      config: { verified: true },
    },
  });

  const charlieAtcoder = await prisma.userAccount.create({
    data: {
      userId: charlie.id,
      platform: 'ATCODER',
      accountId: 'charlie_at',
      config: { verified: true },
    },
  });

  console.log('✓ Created platform accounts for all users');

  // Create platform snapshots
  console.log('Creating platform snapshots...');

  // Alice's LeetCode snapshots (high performer)
  await prisma.platformSnapshot.createMany({
    data: [
      {
        userAccountId: aliceLeetcode.id,
        metrics: { problemsSolved: 450, rating: 2100, contests: 25 },
        metricScore: 70.0, // Normalized
        recordedAt: new Date('2024-01-15'),
      },
      {
        userAccountId: aliceLeetcode.id,
        metrics: { problemsSolved: 475, rating: 2150, contests: 28 },
        metricScore: 71.7,
        recordedAt: new Date('2024-02-01'),
      },
    ],
  });

  // Alice's GitHub snapshots
  await prisma.platformSnapshot.createMany({
    data: [
      {
        userAccountId: aliceGithub.id,
        metrics: { contributions: 1200, repos: 15, stars: 340 },
        metricScore: 12.0,
        recordedAt: new Date('2024-01-15'),
      },
    ],
  });

  // Bob's Codeforces snapshots (medium performer)
  await prisma.platformSnapshot.createMany({
    data: [
      {
        userAccountId: bobCodeforces.id,
        metrics: { rating: 1650, problems: 280, contests: 15 },
        metricScore: 41.25,
        recordedAt: new Date('2024-01-20'),
      },
    ],
  });

  // Bob's LeetCode snapshots
  await prisma.platformSnapshot.createMany({
    data: [
      {
        userAccountId: bobLeetcode.id,
        metrics: { problemsSolved: 320, rating: 1800, contests: 12 },
        metricScore: 60.0,
        recordedAt: new Date('2024-01-25'),
      },
    ],
  });

  // Charlie's AtCoder snapshots (lower activity)
  await prisma.platformSnapshot.createMany({
    data: [
      {
        userAccountId: charlieAtcoder.id,
        metrics: { rating: 1200, problems: 150, contests: 8 },
        metricScore: 30.0,
        recordedAt: new Date('2024-01-10'),
      },
    ],
  });

  console.log('✓ Created platform snapshots with realistic metrics');

  // Create projects
  console.log('Creating projects...');

  const aliceProject = await prisma.project.create({
    data: {
      userId: alice.id,
      name: 'Portfolio Website',
      description: 'Personal portfolio built with Next.js',
      status: 'active',
      config: { framework: 'nextjs', deployed: true },
    },
  });

  await prisma.project.create({
    data: {
      userId: bob.id,
      name: 'Task Manager API',
      description: 'RESTful API for task management',
      status: 'active',
      config: { framework: 'express', database: 'postgresql' },
    },
  });

  console.log('✓ Created projects');

  // Create deploy request
  await prisma.deployRequest.create({
    data: {
      projectId: aliceProject.id,
      status: 'completed',
      config: { environment: 'production', branch: 'main' },
    },
  });

  console.log('✓ Created deploy request');

  // Create templates
  console.log('Creating project templates...');

  await prisma.template.createMany({
    data: [
      {
        name: 'Next.js Starter',
        description: 'Modern Next.js template with TypeScript and Tailwind',
        config: { tech: ['nextjs', 'typescript', 'tailwind'], difficulty: 'beginner' },
      },
      {
        name: 'Express REST API',
        description: 'Production-ready Express API with Prisma',
        config: { tech: ['express', 'prisma', 'typescript'], difficulty: 'intermediate' },
      },
      {
        name: 'Full Stack MERN',
        description: 'Complete MERN stack application template',
        config: { tech: ['mongodb', 'express', 'react', 'nodejs'], difficulty: 'advanced' },
      },
    ],
  });

  console.log('✓ Created project templates');

  // Create streaks
  console.log('Creating activity streaks...');

  const today = new Date();
  const streakDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    return date;
  });

  for (const date of streakDates) {
    await prisma.streak.create({
      data: {
        userId: alice.id,
        date,
        activityType: 'coding',
        metadata: { duration: 120, linesWritten: 250 },
      },
    });
  }

  console.log('✓ Created activity streaks');

  // Create integrations
  console.log('Creating integrations...');

  await prisma.integration.createMany({
    data: [
      {
        userId: alice.id,
        type: 'github',
        config: { username: 'alice-codes', token: 'fake-token-123' },
        isActive: true,
      },
      {
        userId: bob.id,
        type: 'slack',
        config: { webhookUrl: 'https://hooks.slack.com/services/fake' },
        isActive: true,
      },
    ],
  });

  console.log('✓ Created integrations');

  // Create tasks
  console.log('Creating tasks...');

  await prisma.task.createMany({
    data: [
      {
        userId: alice.id,
        title: 'Complete LeetCode Daily Challenge',
        description: 'Solve today\'s medium difficulty problem',
        status: 'completed',
        dueDate: new Date(),
      },
      {
        userId: bob.id,
        title: 'Review PR #123',
        description: 'Code review for authentication feature',
        status: 'in_progress',
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
      },
    ],
  });

  console.log('✓ Created tasks');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\nTest credentials:');
  console.log('  Email: alice@prism.dev | Password: password123');
  console.log('  Email: bob@prism.dev   | Password: password123');
  console.log('  Email: charlie@prism.dev (admin) | Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
