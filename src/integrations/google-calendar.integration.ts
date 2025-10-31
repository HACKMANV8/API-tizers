import { PrismaClient } from '@prisma/client';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { BaseIntegration } from '../utils/base-integration';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { config } from '../config';

/**
 * Google Calendar Integration
 * Handles OAuth2 authentication and syncing calendar events as tasks
 */
export class GoogleCalendarIntegration extends BaseIntegration {
  private oauth2Client: OAuth2Client;

  constructor(prisma: PrismaClient) {
    super(
      {
        baseURL: 'https://www.googleapis.com/calendar/v3',
      },
      prisma,
      'GoogleCalendar'
    );

    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.callbackURL
    );
  }

  /**
   * Get authenticated Calendar API client
   */
  private async getCalendarClient(
    accessToken: string,
    refreshToken?: string
  ): Promise<calendar_v3.Calendar> {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Refresh access token if expired
   */
  private async refreshAccessToken(connectionId: string): Promise<string> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.refreshToken) {
      throw new NotFoundError('Google Calendar connection not found or no refresh token');
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: connection.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update connection with new tokens
      await this.prisma.platformConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: credentials.access_token!,
          tokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : new Date(Date.now() + 3600 * 1000),
        },
      });

      this.logger.info(`[GoogleCalendar] Refreshed access token for connection ${connectionId}`);
      return credentials.access_token!;
    } catch (error) {
      this.logger.error('[GoogleCalendar] Failed to refresh access token:', error);
      throw new BadRequestError('Failed to refresh Google Calendar access token');
    }
  }

  /**
   * Fetch user calendar data
   */
  async fetchUserData(connectionId: string): Promise<any> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('Google Calendar connection not found');
    }

    try {
      const calendar = await this.getCalendarClient(
        connection.accessToken,
        connection.refreshToken || undefined
      );

      // Get list of calendars
      const calendarList = await calendar.calendarList.list();

      return {
        email: connection.metadata?.email || connection.platformUserId,
        calendars: calendarList.data.items || [],
      };
    } catch (error: any) {
      // Try to refresh token if unauthorized
      if (error.code === 401 && connection.refreshToken) {
        const newToken = await this.refreshAccessToken(connectionId);
        const calendar = await this.getCalendarClient(newToken, connection.refreshToken);
        const calendarList = await calendar.calendarList.list();

        return {
          email: connection.metadata?.email || connection.platformUserId,
          calendars: calendarList.data.items || [],
        };
      }
      throw error;
    }
  }

  /**
   * Fetch events for date range
   */
  async fetchEvents(
    connectionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<calendar_v3.Schema$Event[]> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('Google Calendar connection not found');
    }

    try {
      const calendar = await this.getCalendarClient(
        connection.accessToken,
        connection.refreshToken || undefined
      );

      // Fetch events from primary calendar
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true, // Expand recurring events into individual instances
        orderBy: 'startTime',
        maxResults: 250,
      });

      this.logger.info(
        `[GoogleCalendar] Fetched ${response.data.items?.length || 0} events from ${startDate.toISOString()} to ${endDate.toISOString()}`
      );

      return response.data.items || [];
    } catch (error: any) {
      // Try to refresh token if unauthorized
      if (error.code === 401 && connection.refreshToken) {
        const newToken = await this.refreshAccessToken(connectionId);
        const calendar = await this.getCalendarClient(newToken, connection.refreshToken);

        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
        });

        return response.data.items || [];
      }
      throw error;
    }
  }

  /**
   * Convert Google Calendar event to Task
   */
  private async convertEventToTask(
    event: calendar_v3.Schema$Event,
    userId: string,
    connectionId: string
  ): Promise<void> {
    if (!event.id || !event.summary) {
      return; // Skip events without ID or title
    }

    const startTime = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : event.start?.date
      ? new Date(event.start.date)
      : new Date();

    const endTime = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : event.end?.date
      ? new Date(event.end.date)
      : startTime;

    // Check if task already exists
    const existingTask = await this.prisma.task.findFirst({
      where: {
        userId,
        externalId: event.id,
        source: 'GOOGLE_CALENDAR',
      },
    });

    const taskData = {
      title: event.summary,
      description: event.description || null,
      status: event.status === 'confirmed' ? 'TODO' : 'CANCELLED',
      dueDate: endTime,
      metadata: {
        googleEventId: event.id,
        htmlLink: event.htmlLink,
        location: event.location,
        attendees: event.attendees?.map((a) => a.email),
        isRecurring: !!event.recurringEventId,
        recurringEventId: event.recurringEventId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    };

    if (existingTask) {
      // Update existing task
      await this.prisma.task.update({
        where: { id: existingTask.id },
        data: taskData,
      });
      this.logger.info(`[GoogleCalendar] Updated task: ${event.summary} (${event.id})`);
    } else {
      // Create new task
      this.logger.info(`[GoogleCalendar] Creating task with userId: ${userId}, externalId: ${event.id}`);
      const newTask = await this.prisma.task.create({
        data: {
          ...taskData,
          userId,
          source: 'GOOGLE_CALENDAR',
          externalId: event.id,
        },
      });
      this.logger.info(`[GoogleCalendar] Created task: ${event.summary} (${event.id}) - Due: ${endTime.toISOString()}`);
    }
  }

  /**
   * Update activity heatmap with calendar events
   */
  private async updateActivityHeatmap(
    userId: string,
    date: Date,
    eventCount: number
  ): Promise<void> {
    const dateKey = startOfDay(date);

    const existingActivity = await this.prisma.activityHeatmap.findFirst({
      where: {
        userId,
        date: dateKey,
      },
    });

    if (existingActivity) {
      await this.prisma.activityHeatmap.update({
        where: { id: existingActivity.id },
        data: {
          calendarEvents: eventCount,
        },
      });
    } else {
      await this.prisma.activityHeatmap.create({
        data: {
          userId,
          date: dateKey,
          calendarEvents: eventCount,
        },
      });
    }
  }

  /**
   * Sync Google Calendar data
   * Fetches events from the past 7 days and next 30 days
   */
  async syncData(userId: string, connectionId: string): Promise<void> {
    this.logger.info(`[GoogleCalendar] syncData called - userId: ${userId}, connectionId: ${connectionId}`);

    await this.updateSyncStatus(connectionId, 'SYNCING');

    try {
      const connection = await this.prisma.platformConnection.findUnique({
        where: { id: connectionId },
      });

      if (!connection || !connection.accessToken) {
        throw new NotFoundError('Google Calendar connection not found');
      }

      this.logger.info(`[GoogleCalendar] Connection found for user ${userId}`);

      // Fetch events from past 7 days to next 30 days
      const startDate = subDays(startOfDay(new Date()), 7);
      const endDate = addDays(endOfDay(new Date()), 30);

      this.logger.info(`[GoogleCalendar] Fetching events from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const events = await this.fetchEvents(connectionId, startDate, endDate);

      this.logger.info(`[GoogleCalendar] Found ${events.length} events for sync`);

      // Log each event for debugging
      events.forEach((event, index) => {
        this.logger.debug(`[GoogleCalendar] Event ${index + 1}: ${event.summary} - ${event.start?.dateTime || event.start?.date}`);
      });

      // Convert events to tasks
      for (const event of events) {
        await this.convertEventToTask(event, userId, connectionId);
      }

      // Update activity heatmap
      // Group events by date
      const eventsByDate = new Map<string, number>();
      for (const event of events) {
        const eventDate = event.start?.dateTime
          ? new Date(event.start.dateTime)
          : event.start?.date
          ? new Date(event.start.date)
          : new Date();

        const dateKey = startOfDay(eventDate).toISOString();
        eventsByDate.set(dateKey, (eventsByDate.get(dateKey) || 0) + 1);
      }

      // Update heatmap for each date
      for (const [dateKey, count] of eventsByDate.entries()) {
        await this.updateActivityHeatmap(userId, new Date(dateKey), count);
      }

      // Update last sync time
      await this.prisma.platformConnection.update({
        where: { id: connectionId },
        data: {
          lastSynced: new Date(),
        },
      });

      await this.updateSyncStatus(connectionId, 'COMPLETED');
      this.logger.info(`[GoogleCalendar] Sync completed for user ${userId}`);
    } catch (error: any) {
      await this.updateSyncStatus(connectionId, 'FAILED', error.message);
      this.logger.error('[GoogleCalendar] Sync failed:', error);
      throw error;
    }
  }

  /**
   * Create or update a calendar event (two-way sync)
   */
  async createOrUpdateEvent(
    connectionId: string,
    eventData: {
      id?: string;
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      location?: string;
    }
  ): Promise<calendar_v3.Schema$Event> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('Google Calendar connection not found');
    }

    try {
      const calendar = await this.getCalendarClient(
        connection.accessToken,
        connection.refreshToken || undefined
      );

      const event: calendar_v3.Schema$Event = {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: eventData.start.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: eventData.end.toISOString(),
          timeZone: 'UTC',
        },
        location: eventData.location,
      };

      let result: calendar_v3.Schema$Event;

      if (eventData.id) {
        // Update existing event
        const response = await calendar.events.update({
          calendarId: 'primary',
          eventId: eventData.id,
          requestBody: event,
        });
        result = response.data;
        this.logger.info(`[GoogleCalendar] Updated event ${eventData.id}`);
      } else {
        // Create new event
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
        });
        result = response.data;
        this.logger.info(`[GoogleCalendar] Created new event ${result.id}`);
      }

      return result;
    } catch (error: any) {
      // Try to refresh token if unauthorized
      if (error.code === 401 && connection.refreshToken) {
        const newToken = await this.refreshAccessToken(connectionId);
        const calendar = await this.getCalendarClient(newToken, connection.refreshToken);

        const event: calendar_v3.Schema$Event = {
          summary: eventData.summary,
          description: eventData.description,
          start: {
            dateTime: eventData.start.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: eventData.end.toISOString(),
            timeZone: 'UTC',
          },
          location: eventData.location,
        };

        if (eventData.id) {
          const response = await calendar.events.update({
            calendarId: 'primary',
            eventId: eventData.id,
            requestBody: event,
          });
          return response.data;
        } else {
          const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          });
          return response.data;
        }
      }
      throw error;
    }
  }

  /**
   * Delete a calendar event (two-way sync)
   */
  async deleteEvent(connectionId: string, eventId: string): Promise<void> {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundError('Google Calendar connection not found');
    }

    try {
      const calendar = await this.getCalendarClient(
        connection.accessToken,
        connection.refreshToken || undefined
      );

      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });

      this.logger.info(`[GoogleCalendar] Deleted event ${eventId}`);
    } catch (error: any) {
      // Try to refresh token if unauthorized
      if (error.code === 401 && connection.refreshToken) {
        const newToken = await this.refreshAccessToken(connectionId);
        const calendar = await this.getCalendarClient(newToken, connection.refreshToken);

        await calendar.events.delete({
          calendarId: 'primary',
          eventId,
        });
      } else {
        throw error;
      }
    }
  }
}
