
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

const DAY_TEMPLATES = [
  { title: "Day 1", focus: "Upper Body" },
  { title: "Day 2", focus: "Lower Body" },
  { title: "Day 3", focus: "Full Body" },
  { title: "Day 4", focus: "Upper Body" },
  { title: "Day 5", focus: "Lower Body" },
  { title: "Day 6", focus: "Full Body" },
];

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
    "Upper Body": ["Chest", "Back", "Shoulders", "Arms"],
    "Lower Body": ["Legs", "Glutes"],
    "Full Body": ["Chest", "Back", "Legs", "Core", "Full Body", "Arms"],
  };

  const used = new Set<string>();

  return DAY_TEMPLATES.slice(0, preferences.daysPerWeek).map(
    (template, dayIndex) => {
      const focusMuscles = byFocus[template.focus] ?? [];

      let candidates = eligible.filter(
        (exercise) =>
          focusMuscles.includes(exercise.muscle) &&
          !used.has(exercise.id)
      );

      if (candidates.length < 3) {
        const additional = eligible.filter(
          (exercise) =>
            !used.has(exercise.id) &&
            !candidates.some((item) => item.id === exercise.id)
        );
        candidates = [...candidates, ...additional];
      }

      const exerciseCount =
        preferences.durationMinutes <= 30 ? 3 : preferences.durationMinutes <= 45 ? 4 : 5;

      const selected = candidates.slice(0, exerciseCount).map((exercise) => {
        used.add(exercise.id);

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
        id: `day-${dayIndex + 1}`,
        title: template.title,
        focus: template.focus,
        exercises: selected,
      };
    }
  );
}
