import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { config } from '../config';
import prisma from '../config/database';
import logger from '../utils/logger';

/**
 * Google OAuth 2.0 Strategy Configuration
 * Handles user authentication via Google with Calendar API access
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackURL,
      scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      accessType: 'offline',
      prompt: 'consent',
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        logger.info(`Google OAuth callback for user: ${profile.id}`);

        // Extract user information from Google profile
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        const displayName = profile.displayName || email.split('@')[0];
        const avatar = profile.photos?.[0]?.value;

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          // Create new user
          user = await prisma.user.create({
            data: {
              email,
              name: displayName,
              avatar,
              emailVerified: true, // Google emails are pre-verified
              // No password for OAuth users
            },
          });
          logger.info(`Created new user via Google OAuth: ${user.id}`);
        } else {
          // Update user avatar if changed
          if (avatar && user.avatar !== avatar) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { avatar },
            });
          }
        }

        // Store or update Google Calendar connection
        const existingConnection = await prisma.platformConnection.findFirst({
          where: {
            userId: user.id,
            platform: 'GOOGLE_CALENDAR',
          },
        });

        if (existingConnection) {
          // Update existing connection with new tokens
          await prisma.platformConnection.update({
            where: { id: existingConnection.id },
            data: {
              platformUserId: profile.id,
              platformUsername: email,
              accessToken,
              refreshToken: refreshToken || existingConnection.refreshToken,
              tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
              isActive: true,
              lastSynced: new Date(),
              metadata: {
                googleId: profile.id,
                email,
                displayName,
              },
            },
          });
          logger.info(`Updated Google Calendar connection for user: ${user.id}`);
        } else {
          // Create new platform connection
          await prisma.platformConnection.create({
            data: {
              userId: user.id,
              platform: 'GOOGLE_CALENDAR',
              platformUserId: profile.id,
              platformUsername: email,
              accessToken,
              refreshToken,
              tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
              isActive: true,
              metadata: {
                googleId: profile.id,
                email,
                displayName,
              },
            },
          });
          logger.info(`Created Google Calendar connection for user: ${user.id}`);
        }

        return done(null, user);
      } catch (error) {
        logger.error('Error in Google OAuth strategy:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
