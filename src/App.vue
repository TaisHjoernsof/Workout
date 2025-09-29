<template>
  <div id="app">
    <!-- Screen 1: Workout Selection -->
    <div v-if="currentScreen === 'choose'" class="screen active">
      <div class="header">
        <h1>Choose Workout</h1>
        <p>Select your focus area</p>
      </div>
      
      <div class="workout-buttons">
        <button class="workout-btn" @click="showScreen('arms')">
          Arms & Shoulders
        </button>
        <button class="workout-btn" @click="showScreen('chest')">
          Chest & Core
        </button>
        <button class="workout-btn" @click="showScreen('legs')">
          Legs
        </button>
      </div>

      <!-- Download Data Button -->
      <button class="download-btn" @click="downloadWorkoutData">
        📥 Download Workout Data
      </button>
    </div>

    <!-- Screen 2: Arms & Shoulders Workout -->
    <div v-if="currentScreen === 'arms'" class="screen active">
      <div class="header">
        <h1>Arms & Shoulders</h1>
        <p>Track your sets and reps</p>
      </div>
      
      <WorkoutExercises 
        workout-type="arms"
        :exercises="workoutExercises.arms"
        :workout-data="currentWorkoutData.arms"
        @update-exercise="updateExerciseData"
        @update-sets="updateSets"
      />
      
      <button class="save-workout-btn" @click="saveWorkout('arms')">Save Workout</button>
      <button class="back-btn" @click="showScreen('choose')">← Back to Workouts</button>
    </div>

    <!-- Screen 3: Chest & Core Workout -->
    <div v-if="currentScreen === 'chest'" class="screen active">
      <div class="header">
        <h1>Chest & Core</h1>
        <p>Track your sets and reps</p>
      </div>
      
      <WorkoutExercises 
        workout-type="chest"
        :exercises="workoutExercises.chest"
        :workout-data="currentWorkoutData.chest"
        @update-exercise="updateExerciseData"
        @update-sets="updateSets"
      />
      
      <button class="save-workout-btn" @click="saveWorkout('chest')">Save Workout</button>
      <button class="back-btn" @click="showScreen('choose')">← Back to Workouts</button>
    </div>

    <!-- Screen 4: Legs Workout -->
    <div v-if="currentScreen === 'legs'" class="screen active">
      <div class="header">
        <h1>Legs</h1>
        <p>Track your sets and reps</p>
      </div>
      
      <WorkoutExercises 
        workout-type="legs"
        :exercises="workoutExercises.legs"
        :workout-data="currentWorkoutData.legs"
        @update-exercise="updateExerciseData"
        @update-sets="updateSets"
      />
      
      <button class="save-workout-btn" @click="saveWorkout('legs')">Save Workout</button>
      <button class="back-btn" @click="showScreen('choose')">← Back to Workouts</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import WorkoutExercises from './components/WorkoutExercises.vue'

export default {
  name: 'App',
  components: {
    WorkoutExercises
  },
  setup() {
    const currentScreen = ref('choose')
    
    const workoutExercises = {
      arms: [
        "DB - Shoulder Press",
        "DB - Shoulder Raise", 
        "DB - Rear Delt Row",
        "DB - Tricep Extension",
        "DB - Curl",
        "DB - Concentration Curl",
        "DB - Hammer Curl",
        "DB - Wrist Curl",
        "DB - Reverse Wrist Curl"
      ],
      chest: [
        "DB - Bench Press",
        "DB - Incline Press",
        "DB - Bent-Over Row",
        "DB - Shrug",
        "Lying Leg Raise",
        "Sit-Up",
        "Twisting Sit-Up",
      ],
      legs: [
        "BB - Deadlift",
        "BB - Squat",
        "BB - Straight-Leg Deadlift",
        "DB - Standing Calf Raise",
        "DB - Reverse Calf Raise"
      ]
    }

    const defaultWorkoutData = ref({
      arms: {},
      chest: {},
      legs: {}
    })

    const currentWorkoutData = ref({
      arms: {},
      chest: {},
      legs: {}
    })

    function showScreen(screen) {
      currentScreen.value = screen
      if (screen !== 'choose') {
        loadWorkoutData(screen)
      }
    }

    function loadDefaultData() {
      const savedData = localStorage.getItem('workoutDefaults')
      if (savedData) {
        defaultWorkoutData.value = JSON.parse(savedData)
        
        Object.keys(workoutExercises).forEach(workoutType => {
          workoutExercises[workoutType].forEach(exercise => {
            if (!defaultWorkoutData.value[workoutType][exercise]) {
              defaultWorkoutData.value[workoutType][exercise] = {
                sets: 3,
                reps: Array(3).fill(8),
                weight: Array(3).fill(0)
              }
            }
          })
        })
        
        currentWorkoutData.value = JSON.parse(JSON.stringify(defaultWorkoutData.value))
        saveDefaultData()
      } else {
        Object.keys(workoutExercises).forEach(workoutType => {
          workoutExercises[workoutType].forEach(exercise => {
            defaultWorkoutData.value[workoutType][exercise] = {
              sets: 3,
              reps: Array(3).fill(8),
              weight: Array(3).fill(0)
            }
          })
        })
        currentWorkoutData.value = JSON.parse(JSON.stringify(defaultWorkoutData.value))
        saveDefaultData()
      }
    }

    function saveDefaultData() {
      localStorage.setItem('workoutDefaults', JSON.stringify(defaultWorkoutData.value))
    }

    function loadWorkoutData(workoutType) {
      currentWorkoutData.value[workoutType] = JSON.parse(JSON.stringify(defaultWorkoutData.value[workoutType]))
    }

    function updateExerciseData(workoutType, exerciseName, setIndex, field, value) {
      const exerciseData = currentWorkoutData.value[workoutType][exerciseName];
      
      if (!exerciseData[field]) {
        exerciseData[field] = [];
      }
      
      // Handle empty values - set to default
      if (value === '' || value === null || value === undefined) {
        value = field === 'reps' ? 8 : 0;
      }
      
      exerciseData[field][setIndex] = field === 'reps' || field === 'weight' ? parseInt(value) || 0 : value;
    }

    function updateSets(workoutType, exerciseName, newSetCount) {
      newSetCount = parseInt(newSetCount)
      if (newSetCount < 1) newSetCount = 1
      if (newSetCount > 10) newSetCount = 10
      
      const exerciseData = currentWorkoutData.value[workoutType][exerciseName]
      const currentSets = exerciseData.sets || 3
      
      if (!exerciseData.reps) exerciseData.reps = Array(currentSets).fill(8)
      if (!exerciseData.weight) exerciseData.weight = Array(currentSets).fill(0)
      
      if (newSetCount > currentSets) {
        for (let i = currentSets; i < newSetCount; i++) {
          exerciseData.reps[i] = 8
          exerciseData.weight[i] = 0
        }
      } else if (newSetCount < currentSets) {
        exerciseData.reps = exerciseData.reps.slice(0, newSetCount)
        exerciseData.weight = exerciseData.weight.slice(0, newSetCount)
      }
      
      exerciseData.sets = newSetCount
    }

    function saveWorkout(workoutType) {
      const workoutName = {
        arms: 'Arms & Shoulders',
        chest: 'Chest & Core',
        legs: 'Legs'
      }[workoutType]
      
      const workout = {
        date: new Date().toISOString(),
        type: workoutName,
        exercises: currentWorkoutData.value[workoutType]
      }
      
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      workouts.push(workout)
      localStorage.setItem('workouts', JSON.stringify(workouts))
      
      defaultWorkoutData.value[workoutType] = JSON.parse(JSON.stringify(currentWorkoutData.value[workoutType]))
      saveDefaultData()
      
      alert('Workout saved! Your settings are remembered for next time.')
      showScreen('choose')
    }

    function downloadWorkoutData() {
      // Get all saved workouts
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      
      if (workouts.length === 0) {
        alert('No workout data found to download.')
        return
      }

      // Get default settings too
      const defaults = JSON.parse(localStorage.getItem('workoutDefaults') || '{}')
      
      // Create a comprehensive data object
      const exportData = {
        exportedAt: new Date().toISOString(),
        workouts: workouts,
        defaultSettings: defaults
      }

      // Create and download the file
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(dataBlob)
      link.download = `workout-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      
      alert(`Downloaded ${workouts.length} workout sessions!`)
    }

    onMounted(() => {
      loadDefaultData()
    })

    return {
      currentScreen,
      workoutExercises,
      currentWorkoutData,
      showScreen,
      updateExerciseData,
      updateSets,
      saveWorkout,
      downloadWorkoutData
    }
  }
}
</script>

<style>
/* Copy all your existing CSS styles here */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #4c6bf4 0%, #22f0ff 100%);
  min-height: 100vh;
  padding: 20px;
  color: white;
}
/* Add to your existing CSS */
input, select, textarea {
  font-size: 16px; /* Prevents iOS zoom */
  transform: scale(1); /* Ensure no scaling */
}

/* Prevent zoom on focus */
@media screen and (max-width: 768px) {
  input[type="number"],
  input[type="text"] {
    font-size: 16px !important;
  }
}

.screen {
  max-width: 400px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 20px;
  padding-top: 10px;
}

.header h1 {
  font-size: 2em;
  font-weight: 700;
  margin-bottom: 10px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.workout-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 30px;
}

.workout-btn {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  padding: 20px;
  color: white;
  font-size: 1.2em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.workout-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.back-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 12px 20px;
  color: white;
  font-size: 1em;
  cursor: pointer;
  margin-top: 20px;
  width: 100%;
}

.exercise-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 15px;
}

.exercise-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.exercise-name {
  font-size: 1.2em;
  font-weight: 600;
}

.sets-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sets-control input {
  width: 50px;
  padding: 5px;
  border: none;
  border-radius: 5px;
  text-align: center;
}

.sets-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.set-header {
  display: grid;
  grid-template-columns: 50px 1fr 1fr;
  gap: 10px;
  align-items: center;
  margin-bottom: 5px;
  padding: 0 5px;
}

.set-header-label {
  font-weight: 600;
  font-size: 0.9em;
  opacity: 0.8;
  text-align: center;
}

.set-row {
  display: grid;
  grid-template-columns: 50px 1fr 1fr;
  gap: 10px;
  align-items: center;
}

.set-label {
  font-weight: 600;
  font-size: 0.9em;
  text-align: center;
}

.set-input {
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  text-align: center;
  width: 100%;
}

.save-workout-btn {
  background: rgba(76, 175, 80, 0.8);
  border: none;
  border-radius: 10px;
  padding: 15px;
  color: white;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: 20px;
}

.save-workout-btn:active {
  background: rgba(76, 175, 80, 1);
}

/* Add placeholder styling */
.set-input::placeholder {
  color: #888;
  opacity: 0.7;
}

.set-input:focus::placeholder {
  color: #ccc;
}

/* Ensure inputs look good */
.set-input {
  color: #000; /* Black text for user-entered values */
  background: rgba(255, 255, 255, 0.95);
}

.set-input:focus {
  background: rgba(255, 255, 255, 1);
  outline: none;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.5);
}

/* Add to your existing CSS in App.vue */
.exercise-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.video-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  color: white;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s ease;
}

.video-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.video-container {
  margin: 15px 0;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.exercise-video {
  width: 100%;
  max-height: 300px;
  display: block;
}
</style>