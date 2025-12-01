import * as Calendar from 'expo-calendar';
import * as Chrono from 'chrono-node';
import { Alert, Platform } from 'react-native';

export interface CalendarEventData {
  title: string;
  notes: string; // Added notes field
  startDate: Date;
  endDate: Date;
}

/**
 * Parses text to find date/time AND AI-generated titles/notes.
 */
export const parseEventFromText = (text: string): CalendarEventData | null => {
  if (!text) return null;
  
  // 1. Detect Date/Time
  const results = Chrono.parse(text);
  if (results.length === 0) return null; // No date found = Not an event

  const result = results[0];
  const startDate = result.start.date();
  // Default to 1 hour duration if no end time found
  const endDate = result.end ? result.end.date() : new Date(startDate.getTime() + 60 * 60 * 1000);
  
  // 2. Extract AI Generated Title & Details (Regex)
  const titleMatch = text.match(/Event Title:\s*(.+)/i);
  const detailsMatch = text.match(/Event Details:\s*(.+)/i);

  // 3. Fallback Logic
  // If AI didn't generate a title tag, grab the first few words
  let title = titleMatch 
    ? titleMatch[1].trim() 
    : text.split('.')[0].substring(0, 50).trim() + "...";

  // If AI didn't generate details tag, use the full text
  let notes = detailsMatch 
    ? detailsMatch[1].trim() 
    : text;

  // Clean up title (remove trailing periods/newlines)
  title = title.replace(/[\r\n]+$/, '');

  return { title, notes, startDate, endDate };
};

export const addToCalendar = async (rawSummary: string) => {
  try {
    // 1. Parse Data
    const eventData = parseEventFromText(rawSummary);
    
    if (!eventData) {
      Alert.alert('No Date Found', 'Could not detect a specific date or time in this summary.');
      return;
    }

    // 2. Request Permission
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need calendar access to save this event.');
      return;
    }

    // 3. Get Calendar ID
    let calendarId: string | null = null;

    if (Platform.OS === 'ios') {
      try {
        const defaultCalendar = await Calendar.getDefaultCalendarAsync();
        calendarId = defaultCalendar.id;
      } catch (e) {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const writableCalendar = calendars.find(c => c.allowsModifications);
        if (writableCalendar) calendarId = writableCalendar.id;
      }
    } else {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const primaryCalendar = calendars.find(c => c.isPrimary) || calendars[0];
      if (primaryCalendar) calendarId = primaryCalendar.id;
    }

    if (!calendarId) {
        Alert.alert('Error', 'No writable calendar found on this device.');
        return;
    }

    // 4. Create Event
    await Calendar.createEventAsync(calendarId, {
      title: eventData.title,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      notes: eventData.notes, // Use the summarized details
      timeZone: 'GMT',
    });

    Alert.alert('Success', `Event "${eventData.title}" added to calendar!`);

  } catch (e) {
    console.error("Calendar Error:", e);
    Alert.alert('Error', 'Failed to save event.');
  }
};