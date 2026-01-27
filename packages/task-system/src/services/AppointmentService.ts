import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appointment, AppointmentData } from "@task-types/Appointment";
import { parseAppointmentData } from "@utils/parsers/appointmentParser";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import { dataSubscriptionLogger } from "@utils/logging/dataSubscriptionLogger";

const APPOINTMENTS_STORAGE_KEY = "@appointments_data";

/**
 * Service for loading and managing appointment data
 * Loads from JSON file following the same pattern as tasks
 */
export class AppointmentService {
  /**
   * Load appointment data from JSON file or AsyncStorage
   * In production, this would load from an API or DataStore
   */
  static async loadAppointments(): Promise<AppointmentData | null> {
    const logger = getServiceLogger("AppointmentService");
    try {
      // First try to load from AsyncStorage (seeded data)
      const storedData = await AsyncStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData) as AppointmentData;
        const itemsCount =
          parsed.clinicPatientAppointments?.clinicAppointments?.items?.length ||
          0;
        // Use centralized logger to prevent duplicate logs
        dataSubscriptionLogger.logServiceOperation(
          "AppointmentService",
          `Loaded ${itemsCount} appointments from AsyncStorage`,
          { timezone: parsed.siteTimezoneId },
          "📅"
        );
        return parsed;
      }

      // Fallback to bundled JSON file
      const appointmentData: AppointmentData =
        typeof window === "undefined"
          ? require("../../../../appointments.json")
          : (await import("../../../../appointments.json")).default;
      const itemsCount =
        appointmentData.clinicPatientAppointments?.clinicAppointments?.items
          ?.length || 0;
      // Use centralized logger to prevent duplicate logs
      dataSubscriptionLogger.logServiceOperation(
        "AppointmentService",
        `Loaded ${itemsCount} appointments from bundled JSON`,
        undefined,
        "📅"
      );
      return appointmentData;
    } catch (error) {
      logger.error("Failed to load appointments", error);
      return null;
    }
  }

  /**
   * Save appointment data to AsyncStorage
   * Used by seed scripts to persist generated appointments
   */
  static async saveAppointments(data: AppointmentData): Promise<void> {
    const logger = getServiceLogger("AppointmentService");
    try {
      const jsonString = JSON.stringify(data);
      const count =
        data.clinicPatientAppointments.clinicAppointments.items.length;
      logger.info(
        `Saving ${count} appointments to AsyncStorage`,
        { timezone: data.siteTimezoneId },
        undefined,
        "💾"
      );

      await AsyncStorage.setItem(APPOINTMENTS_STORAGE_KEY, jsonString);

      // Verify it was saved
      const verify = await AsyncStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (verify) {
        logger.info(
          `Verified ${count} appointments saved`,
          undefined,
          undefined,
          "✅"
        );
      }
    } catch (error) {
      logger.error("Failed to save appointments", error);
      throw error;
    }
  }

  /**
   * Clear all stored appointments
   */
  static async clearAppointments(): Promise<void> {
    const logger = getServiceLogger("AppointmentService");
    try {
      await AsyncStorage.removeItem(APPOINTMENTS_STORAGE_KEY);
      logger.info(
        "Cleared appointments from storage",
        undefined,
        undefined,
        "🗑️"
      );
    } catch (error) {
      logger.error("Failed to clear appointments", error);
      throw error;
    }
  }

  /**
   * Get all appointments
   * @param todayOnly - If true, only return appointments for today (default: false)
   * @returns {Promise<Appointment[]>} - Array of appointments
   */
  static async getAppointments(
    todayOnly: boolean = false
  ): Promise<Appointment[]> {
    try {
      const data = await this.loadAppointments();
      if (!data) {
        return [];
      }
      const allAppointments = parseAppointmentData(data);

      if (!todayOnly) {
        return allAppointments;
      }

      // Filter for today's appointments
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const filtered = allAppointments.filter(appointment => {
        const startDate = new Date(appointment.startAt);

        // Get the date parts in local timezone for both dates
        const appointmentYear = startDate.getFullYear();
        const appointmentMonth = startDate.getMonth();
        const appointmentDay = startDate.getDate();

        const todayYear = todayStart.getFullYear();
        const todayMonth = todayStart.getMonth();
        const todayDay = todayStart.getDate();

        // Compare date parts directly (year, month, day)
        const isToday =
          appointmentYear === todayYear &&
          appointmentMonth === todayMonth &&
          appointmentDay === todayDay;

        return isToday;
      });

      // Use centralized logger to prevent duplicate logs
      dataSubscriptionLogger.logServiceOperation(
        "AppointmentService",
        `Filtered ${filtered.length} of ${allAppointments.length} appointments for today`,
        { filtered: filtered.length, total: allAppointments.length },
        "📅"
      );

      // If no appointments match today but we have appointments, log a warning
      if (filtered.length === 0 && allAppointments.length > 0) {
        const todayStr = `${todayStart.getFullYear()}-${
          todayStart.getMonth() + 1
        }-${todayStart.getDate()}`;
        // Use centralized logger for warnings too
        dataSubscriptionLogger.logServiceOperation(
          "AppointmentService",
          `No appointments found for today (${todayStr})`,
          { totalAvailable: allAppointments.length },
          "⚠️"
        );
      }

      return filtered;
    } catch (error) {
      getServiceLogger("AppointmentService").error(
        "Failed to fetch appointments",
        error
      );
      throw error;
    }
  }

  /**
   * Get appointment data with timezone
   * @returns {Promise<AppointmentData | null>} - Full appointment data including timezone
   */
  static async getAppointmentData(): Promise<AppointmentData | null> {
    return await this.loadAppointments();
  }
}
