
export type WorkoutGoal = "muscle" | "fat" | "strength" | "fitness";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutLocation = "gym" | "home";
export type PlanMode = "automatic" | "manual";

export type WorkoutPreferences = {
  goal: WorkoutGoal;
  level: FitnessLevel;
  location: WorkoutLocation;
  daysPerWeek: number;
  durationMinutes: number;
  mode: PlanMode;
};

export type Exercise = {
  id: string;
  name: string;
  muscle: string;
  equipment: string[];
  goals: WorkoutGoal[];
  locations: WorkoutLocation[];
  sets: number;
  reps: number;
  restSeconds: number;
};

export type WorkoutDay = {
  id: string;
  title: string;
  dayName?: string;
  weekdayIndex?: number;
  focus: string;
  exercises: Exercise[];
};

const EXERCISES: Exercise[] = [
  {
    id: "push-up",
    name: "Push-ups",
    muscle: "Chest",
    equipment: ["bodyweight"],
    goals: ["muscle", "fat", "strength", "fitness"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 10,
    restSeconds: 60,
  },
  {
    id: "squat",
    name: "Bodyweight Squats",
    muscle: "Legs",
    equipment: ["bodyweight"],
    goals: ["muscle", "fat", "strength", "fitness"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 12,
    restSeconds: 60,
  },
  {
    id: "lunge",
    name: "Lunges",
    muscle: "Legs",
    equipment: ["bodyweight"],
    goals: ["muscle", "fat", "fitness"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 10,
    restSeconds: 60,
  },
  {
    id: "plank",
    name: "Plank",
    muscle: "Core",
    equipment: ["bodyweight"],
    goals: ["fat", "fitness", "strength"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 30,
    restSeconds: 45,
  },
  {
    id: "jumping-jacks",
    name: "Jumping Jacks",
    muscle: "Full Body",
    equipment: ["bodyweight"],
    goals: ["fat", "fitness"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 20,
    restSeconds: 45,
  },
  {
    id: "dumbbell-press",
    name: "Dumbbell Press",
    muscle: "Chest",
    equipment: ["dumbbells"],
    goals: ["muscle", "strength"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 10,
    restSeconds: 90,
  },
  {
    id: "dumbbell-row",
    name: "Dumbbell Row",
    muscle: "Back",
    equipment: ["dumbbells"],
    goals: ["muscle", "strength"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 10,
    restSeconds: 90,
  },
  {
    id: "shoulder-press",
    name: "Shoulder Press",
    muscle: "Shoulders",
    equipment: ["dumbbells"],
    goals: ["muscle", "strength"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 10,
    restSeconds: 90,
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    muscle: "Back",
    equipment: ["machine"],
    goals: ["muscle", "strength"],
    locations: ["gym"],
    sets: 3,
    reps: 12,
    restSeconds: 90,
  },
  {
    id: "bench-press",
    name: "Bench Press",
    muscle: "Chest",
    equipment: ["barbell", "bench"],
    goals: ["muscle", "strength"],
    locations: ["gym"],
    sets: 3,
    reps: 8,
    restSeconds: 120,
  },
  {
    id: "leg-press",
    name: "Leg Press",
    muscle: "Legs",
    equipment: ["machine"],
    goals: ["muscle", "strength"],
    locations: ["gym"],
    sets: 3,
    reps: 12,
    restSeconds: 90,
  },
  {
    id: "bicep-curl",
    name: "Bicep Curls",
    muscle: "Arms",
    equipment: ["dumbbells"],
    goals: ["muscle", "strength"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 12,
    restSeconds: 60,
  },
  {
    id: "triceps-extension",
    name: "Triceps Extensions",
    muscle: "Arms",
    equipment: ["dumbbells"],
    goals: ["muscle", "strength"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 12,
    restSeconds: 60,
  },
  {
    id: "glute-bridge",
    name: "Glute Bridges",
    muscle: "Glutes",
    equipment: ["bodyweight"],
    goals: ["muscle", "fitness"],
    locations: ["gym", "home"],
    sets: 3,
    reps: 15,
    restSeconds: 60,
  },
];

export const WEEKDAY_WORKOUT_TEMPLATES = [
  { dayIndex: 0, dayNumber: 1, dayName: "Monday", title: "Day 1", focus: "Chest & Triceps" },
  { dayIndex: 1, dayNumber: 2, dayName: "Tuesday", title: "Day 2", focus: "Back & Biceps" },
  { dayIndex: 2, dayNumber: 3, dayName: "Wednesday", title: "Day 3", focus: "Legs & Core" },
  { dayIndex: 3, dayNumber: 4, dayName: "Thursday", title: "Day 4", focus: "Shoulders & Core" },
  { dayIndex: 4, dayNumber: 5, dayName: "Friday", title: "Day 5", focus: "Full Body Power" },
  { dayIndex: 5, dayNumber: 6, dayName: "Saturday", title: "Day 6", focus: "Conditioning & Core" },
  { dayIndex: 6, dayNumber: 7, dayName: "Sunday", title: "Day 7", focus: "Full Body & Mobility" },
];

/**
 * Weekday to workout day mapping:
 * Monday -> Day 1 (index 0)
 * Tuesday -> Day 2 (index 1)
 * Wednesday -> Day 3 (index 2)
 * Thursday -> Day 4 (index 3)
 * Friday -> Day 5 (index 4)
 * Saturday -> Day 6 (index 5)
 * Sunday -> Day 7 (index 6)
 */
export function getWeekdayWorkoutIndex(dateInput?: Date | string): number {
  let dayOfWeek: number;
  if (!dateInput) {
    dayOfWeek = new Date().getDay();
  } else if (typeof dateInput === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split("-").map(Number);
      dayOfWeek = new Date(y, m - 1, d).getDay();
    } else {
      const parsed = new Date(dateInput);
      dayOfWeek = !isNaN(parsed.getTime()) ? parsed.getDay() : new Date().getDay();
    }
  } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    dayOfWeek = dateInput.getDay();
  } else {
    dayOfWeek = new Date().getDay();
  }

  // Monday = 1 -> 0 (Day 1)
  // Tuesday = 2 -> 1 (Day 2)
  // Wednesday = 3 -> 2 (Day 3)
  // Thursday = 4 -> 3 (Day 4)
  // Friday = 5 -> 4 (Day 5)
  // Saturday = 6 -> 5 (Day 6)
  // Sunday = 0 -> 6 (Day 7)
  return (dayOfWeek + 6) % 7;
}

/**
 * Returns 1-based workout day number (1 for Monday through 7 for Sunday).
 */
export function getWorkoutDayNumber(dateInput?: Date | string): number {
  return getWeekdayWorkoutIndex(dateInput) + 1;
}

export function getExerciseLibrary(): Exercise[] {
  return EXERCISES.map((exercise) => ({ ...exercise }));
}

export function generateWorkoutPlan(
  preferences: WorkoutPreferences
): WorkoutDay[] {
  const eligible = EXERCISES.filter(
    (exercise) =>
      exercise.goals.includes(preferences.goal) &&
      exercise.locations.includes(preferences.location)
  );

  const byFocus: Record<string, string[]> = {
    "Full Body & Mobility": ["Full Body", "Core", "Legs", "Chest"],
    "Chest & Triceps": ["Chest", "Arms", "Shoulders"],
    "Back & Biceps": ["Back", "Arms", "Core"],
    "Legs & Core": ["Legs", "Glutes", "Core"],
    "Shoulders & Core": ["Shoulders", "Chest", "Core", "Arms"],
    "Full Body Power": ["Legs", "Chest", "Back", "Glutes", "Full Body"],
    "Conditioning & Core": ["Full Body", "Core", "Legs"],
  };

  const exerciseCount =
    preferences.durationMinutes <= 30 ? 3 : preferences.durationMinutes <= 45 ? 4 : 5;

  return WEEKDAY_WORKOUT_TEMPLATES.map((template) => {
    const focusMuscles = byFocus[template.focus] ?? ["Full Body"];

    let candidates = eligible.filter((exercise) =>
      focusMuscles.includes(exercise.muscle)
    );

    if (candidates.length < 3) {
      const additional = eligible.filter(
        (exercise) => !candidates.some((item) => item.id === exercise.id)
      );
      candidates = [...candidates, ...additional];
    }

    const selected = candidates.slice(0, exerciseCount).map((exercise) => {
      const levelMultiplier =
        preferences.level === "beginner"
          ? 1
          : preferences.level === "intermediate"
            ? 1.15
            : 1.25;

      return {
        ...exercise,
        sets:
          preferences.level === "beginner"
            ? 2
            : Math.min(5, Math.round(exercise.sets * levelMultiplier)),
      };
    });

    return {
      id: `day-${template.dayIndex}`,
      title: template.title,
      dayName: template.dayName,
      weekdayIndex: template.dayIndex,
      focus: template.focus,
      exercises: selected,
    };
  });
}
