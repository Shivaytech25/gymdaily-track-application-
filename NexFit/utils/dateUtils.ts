import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

/**
 * Returns the current date in YYYY-MM-DD format based on the device's local timezone.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Friendly date formatter for UI headers and lists.
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const today = getLocalDateString(new Date());
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
  const tomorrow = getLocalDateString(new Date(Date.now() + 86400000));

  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  if (dateStr === tomorrow) return "Tomorrow";

  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);

  return dateObj.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: dateObj.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Hook that listens to AppState transitions and periodic intervals
 * to detect when midnight passes and a new day begins, automatically
 * triggering a refresh callback.
 */
export function useDayChangeDetector(onDayChange?: (newDate: string) => void) {
  const [currentDate, setCurrentDate] = useState<string>(() => getLocalDateString());
  const currentDateRef = useRef(currentDate);
  currentDateRef.current = currentDate;

  const onDayChangeRef = useRef(onDayChange);
  onDayChangeRef.current = onDayChange;

  useEffect(() => {
    function checkDateChange() {
      const freshDate = getLocalDateString();
      if (freshDate !== currentDateRef.current) {
        currentDateRef.current = freshDate;
        setCurrentDate(freshDate);
        if (onDayChangeRef.current) {
          onDayChangeRef.current(freshDate);
        }
      }
    }

    // 1. Check on foreground resume
    const subscription = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (status === "active") {
        checkDateChange();
      }
    });

    // 2. Periodic check (every 30 seconds) in case app is left open overnight
    const timer = setInterval(() => {
      checkDateChange();
    }, 30000);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);

  return currentDate;
}
