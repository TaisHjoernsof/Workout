<template>
  <div id="app">
    <!-- Streak Counter -->
    <div v-if="currentScreen === 'choose'" class="streak-counter" :class="{ 'incomplete': !todayCompleted }">
      🔥 {{ streak }}
    </div>

    <!-- Screen 1: Workout Selection -->
    <div v-if="currentScreen === 'choose'" class="screen active">
      <div class="header">
        <h1>Choose Workout</h1>
        <p>Select your focus area</p>
      </div>
      <div class="workout-buttons">
        <button class="workout-btn" @click="showScreen('arms')">Arms & Shoulders</button>
        <button class="workout-btn" @click="showScreen('chest')">Chest & Core</button>
        <button class="workout-btn" @click="showScreen('legs')">Legs</button>
      </div>
      <button class="rest-day-btn" :class="{ 'enabled': restDayEnabled }" @click="logRestDay" :disabled="!restDayEnabled">
        {{ todayCompleted ? '✅ Today Completed' : 'Rest Day' }}
      </button>
      <div class="data-buttons">
        <button class="progress-btn import-btn" @click="showScreen('progress')">📈 View Progress</button>
        <button class="import-btn" @click="triggerFileInput">📤 Import<br>Workout Data</button>
        <input type="file" ref="fileInput" accept=".json" style="display: none" @change="handleFileImport">
        <button class="download-btn" @click="downloadWorkoutData">📥 Download Workout Data</button>
      </div>
      <div v-if="importMessage" class="import-status" :class="{ 'error': importError }">{{ importMessage }}</div>
    </div>

    <!-- Progress History Screen -->
    <div v-if="currentScreen === 'progress'" class="screen active">
      <div class="header">
        <h1>Workout Progress</h1>
        <div class="streak-hint">See your last set weight and reps for each exercise</div>
      </div>
      <div v-for="workoutType in ['arms', 'chest', 'legs']" :key="workoutType" class="progress-section">
        <h2 style="margin-top: 20px;">{{ capitalize(workoutType) }} Workouts</h2>
        <ProgressGraph
          v-if="progressData[workoutType].length > 0"
          :progressData="progressData[workoutType]"
          :exerciseList="workoutExercises[workoutType]"
        />
        <div v-if="progressData[workoutType].length === 0" class="streak-status status-pending">No history yet.</div>
        <details style="margin-top: 12px;" :open="false">
          <summary style="cursor:pointer;font-weight:500;font-size:1em;">Show {{ capitalize(workoutType) }} Progress Table</summary>
          <div v-if="progressData[workoutType].length > 0">
            <table class="progress-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exercise</th>
                  <th>Last Set Weight</th>
                  <th>Reps (All Sets)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in progressData[workoutType]" :key="entry.date + entry.exercise">
                  <td>{{ entry.date }}</td>
                  <td>{{ entry.exercise }}</td>
                  <td>{{ entry.lastSetWeight }}</td>
                  <td>
                    <span v-for="(rep, idx) in entry.reps" :key="idx">
                      <span v-if="idx > 0">, </span>{{ rep }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>
      <button class="back-btn" @click="showScreen('choose')">← Back to Workouts</button>
    </div>

    <!-- Floating Rest Timer -->
    <FloatingTimer 
      v-if="currentScreen === 'arms' || currentScreen === 'chest' || currentScreen === 'legs'"
      :seconds="timerSeconds"
      :isActive="timerActive"
      @start-timer="startTimer"
      @reset-timer="resetTimer"
    />

    <!-- Toast Notification for Timer Alert -->
    <transition name="fade">
      <div v-if="showTimerToast" class="timer-toast">
        ⏱️ Rest time complete! (15 seconds)
      </div>
    </transition>

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
        :default-data="defaultWorkoutData.arms"
        @update-exercise="updateExerciseData"
        @update-sets="updateSets"
      />
      
      <button class="save-progress-btn" @click="autoSaveWorkout">💾 Save Progress</button>
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
        :default-data="defaultWorkoutData.chest"
        @update-exercise="updateExerciseData"
        @update-sets="updateSets"
      />
      
      <button class="save-progress-btn" @click="autoSaveWorkout">💾 Save Progress</button>
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
        :default-data="defaultWorkoutData.legs"
        @update-exercise="updateExerciseData"
        @update-sets="updateSets"
      />
      
      <button class="save-progress-btn" @click="autoSaveWorkout">💾 Save Progress</button>
      <button class="save-workout-btn" @click="saveWorkout('legs')">Save Workout</button>
      <button class="back-btn" @click="showScreen('choose')">← Back to Workouts</button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
    // Progress Data (reactive)
    const progressData = reactive({
      arms: [],
      chest: [],
      legs: []
    })
    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1)
    }
    function loadProgressData() {
      // Clear previous data
      progressData.arms = [];
      progressData.chest = [];
      progressData.legs = [];
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]');
      // Map workout type names to keys
      const typeMap = {
        'Arms & Shoulders': 'arms',
        'Chest & Core': 'chest',
        'Legs': 'legs'
      };
      workouts.forEach(w => {
        const typeKey = typeMap[w.type];
        if (!typeKey) return;
        // w.exercises is the data object
        Object.keys(w.exercises).forEach(exercise => {
          const exData = w.exercises[exercise];
          const reps = exData.reps ? exData.reps.slice(0, 3).map(r => r ?? '-') : ['-', '-', '-'];
          const lastSetWeight = exData.weight && exData.weight.length > 0 ? exData.weight[exData.weight.length - 1] ?? '-' : '-';
          progressData[typeKey].push({
            date: new Date(w.date).toLocaleDateString(),
            exercise,
            lastSetWeight,
            reps
          });
        });
      });
    }
import WorkoutExercises from './components/WorkoutExercises.vue'
import ProgressGraph from './components/ProgressGraph.vue'
import FloatingTimer from './components/FloatingTimer.vue'

export default {
  name: 'App',
  components: {
    WorkoutExercises,
    ProgressGraph,
    FloatingTimer
  },
  setup() {
    const currentScreen = ref('choose')
    let autoSaveInterval = null
    
    // Timer state
    const timerSeconds = ref(0)
    const timerActive = ref(false)
    let timerIntervalId = null
    let notificationSent = false
    let timerStartTime = null // Tracks when timer was started (ISO string)
    let hasShownNotificationSetupHint = false
    const showTimerToast = ref(false)
    
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
        "DB - Russian Twist",
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

    // Streak and rest day functionality
    const streak = ref(0)
    const todayCompleted = ref(false)
    const restDayEnabled = ref(false)

    // Import functionality
    const fileInput = ref(null)
    const importMessage = ref('')
    const importError = ref(false)

    // Track if we're starting a fresh workout or restoring auto-save
    const isFreshWorkout = ref(true)

    function showScreen(screen) {
      currentScreen.value = screen;
      // Reset timer when leaving active workout screens
      if (screen !== 'arms' && screen !== 'chest' && screen !== 'legs') {
        resetTimer();
      }
      if (screen === 'progress') {
        loadProgressData();
      } else if (screen !== 'choose') {
        isFreshWorkout.value = true; // Assume fresh workout until we check for auto-save
        loadWorkoutData(screen);
      } else {
        // Clear auto-save when going back to choose screen intentionally
        clearAutoSave();
        // Update streak and rest day button when returning to choose screen
        updateStreak();
        updateTodayStatus();
        updateRestDayButton();
      }
    }

    function loadDefaultData() {
      // Load defaults from the most recent workout data for each exercise
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const workoutTypeNames = {
        arms: 'Arms & Shoulders',
        chest: 'Chest & Core',
        legs: 'Legs'
      }
      
      const isDefaultValue = (field, value) => {
        if (value === null || value === undefined) return true
        if (Array.isArray(value)) {
          // Check if array is all nulls or all default values
          return value.every(v => v === null || v === undefined || (field === 'reps' && v === 8) || (field === 'weight' && v === 0))
        }
        return false
      }
      
      Object.keys(workoutExercises).forEach(workoutType => {
        const workoutTypeName = workoutTypeNames[workoutType]
        
        // Sort workouts by date (newest first)
        const sortedWorkouts = workouts
          .filter(w => w.type === workoutTypeName)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
        
        defaultWorkoutData.value[workoutType] = {}
        workoutExercises[workoutType].forEach(exercise => {
          let found = false
          
          // Search through workouts to find the most recent with real data for this exercise
          for (const workout of sortedWorkouts) {
            if (workout.exercises && workout.exercises[exercise]) {
              const exerciseData = workout.exercises[exercise]
              
              // Check if this has non-default values
              const hasRealReps = !isDefaultValue('reps', exerciseData.reps)
              const hasRealWeight = !isDefaultValue('weight', exerciseData.weight)
              
              if (hasRealReps || hasRealWeight) {
                defaultWorkoutData.value[workoutType][exercise] = {
                  sets: exerciseData.sets || 3,
                  reps: exerciseData.reps || Array(exerciseData.sets || 3).fill(8),
                  weight: exerciseData.weight || Array(exerciseData.sets || 3).fill(0)
                }
                found = true
                break
              }
            }
          }
          
          // Use static defaults if no real data found
          if (!found) {
            defaultWorkoutData.value[workoutType][exercise] = {
              sets: 3,
              reps: Array(3).fill(8),
              weight: Array(3).fill(0)
            }
          }
        })
      })
      
      // For fresh workouts, start with empty current data (showing defaults as placeholders)
      resetCurrentWorkoutData()
    }

    function resetCurrentWorkoutData() {
      // Reset current data to empty structures (all nulls - user hasn't entered data yet)
      Object.keys(workoutExercises).forEach(workoutType => {
        currentWorkoutData.value[workoutType] = {}
        workoutExercises[workoutType].forEach(exercise => {
          currentWorkoutData.value[workoutType][exercise] = {
            sets: defaultWorkoutData.value[workoutType][exercise].sets,
            reps: Array(defaultWorkoutData.value[workoutType][exercise].sets).fill(null),
            weight: Array(defaultWorkoutData.value[workoutType][exercise].sets).fill(null)
          }
        })
      })
    }

    function saveDefaultData() {
      localStorage.setItem('workoutDefaults', JSON.stringify(defaultWorkoutData.value))
    }

    function loadWorkoutData(workoutType) {
      // Start with fresh workout data with empty inputs (all nulls)
      currentWorkoutData.value[workoutType] = {}
      workoutExercises[workoutType].forEach(exercise => {
        currentWorkoutData.value[workoutType][exercise] = {
          sets: defaultWorkoutData.value[workoutType][exercise].sets,
          reps: Array(defaultWorkoutData.value[workoutType][exercise].sets).fill(null),
          weight: Array(defaultWorkoutData.value[workoutType][exercise].sets).fill(null)
        }
      })
    }

    function updateExerciseData(workoutType, exerciseName, setIndex, field, value) {
      // Mark that we're no longer in a fresh workout (user is entering data)
      isFreshWorkout.value = false
      
      // Ensure the exercise data structure exists
      if (!currentWorkoutData.value[workoutType][exerciseName]) {
        currentWorkoutData.value[workoutType][exerciseName] = {
          sets: 3,
          reps: Array(3).fill(null),
          weight: Array(3).fill(null)
        }
      }
      
      const exerciseData = currentWorkoutData.value[workoutType][exerciseName];
      
      if (!exerciseData[field]) {
        exerciseData[field] = [];
      }
      
      // Handle empty values - set to null to indicate no user input
      if (value === '' || value === null || value === undefined) {
        exerciseData[field][setIndex] = null;
      } else {
        exerciseData[field][setIndex] = field === 'reps' || field === 'weight' ? parseInt(value) || 0 : value;
      }
      
      // Auto-save immediately after each change (with small delay to avoid excessive saves)
      setTimeout(() => {
        autoSaveWorkout();
      }, 500);
    }

    function updateSets(workoutType, exerciseName, newSetCount) {
      isFreshWorkout.value = false
      newSetCount = parseInt(newSetCount)
      if (newSetCount < 1) newSetCount = 1
      if (newSetCount > 10) newSetCount = 10
      
      // Ensure the exercise data structure exists
      if (!currentWorkoutData.value[workoutType][exerciseName]) {
        currentWorkoutData.value[workoutType][exerciseName] = {
          sets: 3,
          reps: Array(3).fill(null),
          weight: Array(3).fill(null)
        }
      }
      
      const exerciseData = currentWorkoutData.value[workoutType][exerciseName]
      const currentSets = exerciseData.sets || 3
      
      if (!exerciseData.reps) exerciseData.reps = Array(currentSets).fill(null)
      if (!exerciseData.weight) exerciseData.weight = Array(currentSets).fill(null)
      
      if (newSetCount > currentSets) {
        for (let i = currentSets; i < newSetCount; i++) {
          exerciseData.reps[i] = null
          exerciseData.weight[i] = null
        }
      } else if (newSetCount < currentSets) {
        exerciseData.reps = exerciseData.reps.slice(0, newSetCount)
        exerciseData.weight = exerciseData.weight.slice(0, newSetCount)
      }
      
      exerciseData.sets = newSetCount
      
      // Auto-save after set count change
      setTimeout(() => {
        autoSaveWorkout();
      }, 500);
    }

    function autoSaveWorkout() {
      // Don't auto-save on the choose screen
      if (currentScreen.value === 'choose') return;
      // Avoid creating restore prompts for empty/fresh sessions (e.g. timer only)
      if (isFreshWorkout.value) return;
      
      const workoutType = currentScreen.value;
      const autoSaveData = {
        screen: currentScreen.value,
        workoutType: workoutType,
        data: JSON.parse(JSON.stringify(currentWorkoutData.value[workoutType])),
        timestamp: new Date().toISOString(),
        isFreshWorkout: isFreshWorkout.value
      }
      
      localStorage.setItem('workoutAutoSave', JSON.stringify(autoSaveData));
      console.log('Workout auto-saved');
    }

    function restoreAutoSavedWorkout() {
      const saved = localStorage.getItem('workoutAutoSave');
      if (saved) {
        try {
          const autoSaveData = JSON.parse(saved);
          // Check if the auto-save is recent (within last 2 hours)
          const saveTime = new Date(autoSaveData.timestamp);
          const now = new Date();
          const hoursDiff = (now - saveTime) / (1000 * 60 * 60);
          
          if (hoursDiff < 2) { // Restore if less than 2 hours old
            // Skip restore prompts for fresh sessions with no user-entered workout data
            if (autoSaveData.isFreshWorkout) {
              clearAutoSave();
              return;
            }
            // Restore automatically to avoid repeated restore prompts on normal reopen
            currentScreen.value = autoSaveData.screen;
            currentWorkoutData.value[autoSaveData.workoutType] = autoSaveData.data;
            isFreshWorkout.value = autoSaveData.isFreshWorkout || false;
          } else {
            // Clear old auto-saves
            clearAutoSave();
          }
        } catch (e) {
          console.error('Error restoring auto-saved workout:', e);
          clearAutoSave();
        }
      }
    }

    function clearAutoSave() {
      localStorage.removeItem('workoutAutoSave');
    }

    function handleAppPause() {
      if (currentScreen.value !== 'choose') {
        console.log('App pausing, saving workout state...');
        autoSaveWorkout();
      }
      // Save timer state when app pauses
      saveTimerState();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        handleAppPause();
        // Save timer state when app goes to background
        saveTimerState();
      }
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
      
      // Clear auto-save when workout is properly saved
      clearAutoSave()

      // Update streak after saving workout
      updateStreak()
      updateTodayStatus()
      updateRestDayButton()
      
      // Reload defaults from the now-updated workouts to reflect new placeholders
      loadDefaultData()
      
      alert('Workout saved! Your settings are remembered for next time.')
      showScreen('choose')
    }

    // Streak functionality - FIXED VERSION
    function updateStreak() {
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const restDays = JSON.parse(localStorage.getItem('restDays') || '[]')
      
      if (workouts.length === 0 && restDays.length === 0) {
        streak.value = 0
        return
      }
      
      // Combine workouts and rest days and sort by date
      const allActivity = [
        ...workouts.map(w => ({ date: w.date, type: 'workout' })),
        ...restDays.map(rd => ({ date: rd, type: 'rest' }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
      
      // If no activity at all, streak is 0
      if (allActivity.length === 0) {
        streak.value = 0
        return
      }
      
      // Calculate consecutive days including today if completed, otherwise up to yesterday
      let currentStreak = 0
      let currentDate = new Date()
      
      // Check if today is completed
      const todayStr = currentDate.toDateString()
      const todayActivity = allActivity.find(a => new Date(a.date).toDateString() === todayStr)
      
      if (todayActivity) {
        // If today has activity, include today in the streak count
        currentStreak = 1
        currentDate.setDate(currentDate.getDate() - 1) // Move to yesterday
      } else {
        // If today has no activity, start counting from yesterday
        currentDate.setDate(currentDate.getDate() - 1)
      }
      
      // Now count backwards for consecutive days
      while (true) {
        const dateStr = currentDate.toDateString()
        const hasActivity = allActivity.find(a => new Date(a.date).toDateString() === dateStr)
        
        if (hasActivity) {
          currentStreak++
          currentDate.setDate(currentDate.getDate() - 1)
        } else {
          break
        }
        
        // Stop if we go too far back (safety limit)
        if (currentStreak > 365) break
      }
      
      streak.value = currentStreak
    }

    function updateTodayStatus() {
      const today = new Date().toDateString()
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const restDays = JSON.parse(localStorage.getItem('restDays') || '[]')
      
      const todayWorkout = workouts.find(w => new Date(w.date).toDateString() === today)
      const todayRestDay = restDays.find(rd => new Date(rd).toDateString() === today)
      
      todayCompleted.value = !!(todayWorkout || todayRestDay)
    }

    function updateRestDayButton() {
      // Enable rest day button if:
      // 1. User has at least 3 consecutive days of activity (streak >= 3)
      // 2. AND today is not already completed
      restDayEnabled.value = streak.value >= 3 && !todayCompleted.value
    }

    function logRestDay() {
      if (!restDayEnabled.value) return
      
      const today = new Date().toISOString()
      const restDays = JSON.parse(localStorage.getItem('restDays') || '[]')
      
      // Check if today already has a rest day (shouldn't happen due to enabled check, but just in case)
      const todayStr = new Date().toDateString()
      const todayHasRestDay = restDays.find(rd => new Date(rd).toDateString() === todayStr)
      
      if (!todayHasRestDay) {
        restDays.push(today)
        localStorage.setItem('restDays', JSON.stringify(restDays))
        
        // Update streak and button state
        updateStreak()
        updateTodayStatus()
        updateRestDayButton()
        
        alert('Rest day logged! Your streak continues. 💪')
      }
    }

    // Import functionality
    function triggerFileInput() {
      fileInput.value.click()
    }

    function handleFileImport(event) {
      const file = event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result)
          importWorkoutData(importedData)
        } catch (error) {
          showImportMessage('Error parsing JSON file. Please make sure it\'s a valid workout data file.', true)
          console.error('Error parsing imported file:', error)
        }
      }
      reader.readAsText(file)
      
      // Reset file input
      event.target.value = ''
    }

    function importWorkoutData(importedData) {
      // Validate the imported data structure
      if (!importedData.workouts || !importedData.defaultSettings) {
        showImportMessage('Invalid file format. Missing required data.', true)
        return
      }

      // Ask for confirmation before importing
      const workoutCount = importedData.workouts.length
      const restDayCount = importedData.restDays ? importedData.restDays.length : 0
      
      if (!confirm(`This will import ${workoutCount} workout sessions and ${restDayCount} rest days. Your current data will be merged. Continue?`)) {
        return
      }

      try {
        // Get current data
        const currentWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
        const currentRestDays = JSON.parse(localStorage.getItem('restDays') || '[]')
        const currentDefaults = JSON.parse(localStorage.getItem('workoutDefaults') || '{}')

        // Merge workouts - avoid duplicates by date and type
        const workoutMap = new Map()
        
        // Add current workouts to map
        currentWorkouts.forEach(workout => {
          const key = `${workout.date}-${workout.type}`
          workoutMap.set(key, workout)
        })
        
        // Add imported workouts (will overwrite duplicates)
        importedData.workouts.forEach(workout => {
          const key = `${workout.date}-${workout.type}`
          workoutMap.set(key, workout)
        })
        
        const mergedWorkouts = Array.from(workoutMap.values())
        
        // Merge rest days - avoid duplicates
        const restDaySet = new Set([...currentRestDays, ...(importedData.restDays || [])])
        const mergedRestDays = Array.from(restDaySet)
        
        // Merge default settings (imported data takes precedence)
        const mergedDefaults = {
          ...currentDefaults,
          ...importedData.defaultSettings
        }

        // Save merged data to localStorage
        localStorage.setItem('workouts', JSON.stringify(mergedWorkouts))
        localStorage.setItem('restDays', JSON.stringify(mergedRestDays))

        // Reload defaults from the workouts (not from the imported static defaults)
        loadDefaultData()
        
        // Update streak and UI
        updateStreak()
        updateTodayStatus()
        updateRestDayButton()

        showImportMessage(`Successfully imported ${importedData.workouts.length} workouts and ${importedData.restDays ? importedData.restDays.length : 0} rest days!`)
        
      } catch (error) {
        showImportMessage('Error importing data. Please check the file format.', true)
        console.error('Error importing workout data:', error)
      }
    }

    function showImportMessage(message, isError = false) {
      importMessage.value = message
      importError.value = isError
      
      // Clear message after 3 seconds
      setTimeout(() => {
        importMessage.value = ''
        importError.value = false
      }, 3000)
    }

    function downloadWorkoutData() {
      // Get all saved workouts
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      
      if (workouts.length === 0) {
        alert('No workout data found to download.')
        return
      }

      // Get default settings and rest days too
      const defaults = JSON.parse(localStorage.getItem('workoutDefaults') || '{}')
      const restDays = JSON.parse(localStorage.getItem('restDays') || '[]')
      
      // Create a comprehensive data object
      const exportData = {
        exportedAt: new Date().toISOString(),
        workouts: workouts,
        defaultSettings: defaults,
        restDays: restDays,
        currentStreak: streak.value
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

    // Timer functions
    function showNotificationSetupHint(message) {
      if (hasShownNotificationSetupHint) return;
      hasShownNotificationSetupHint = true;
      alert(message);
    }

    function checkNotificationPermission() {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      const isSecureContextForPush = window.isSecureContext || window.location.hostname === 'localhost';

      if (!('Notification' in window)) {
        console.log('Notification API NOT available on this device');
        if (isIOS) {
          showNotificationSetupHint('Notifications are not available in this context on iPhone. Open the installed Home Screen app and try again.');
        }
        return;
      }

      if (isIOS && !isStandalone) {
        showNotificationSetupHint('On iPhone, notification permission works only in the installed Home Screen app. Use Safari -> Share -> Add to Home Screen, then open from your Home Screen.');
        return;
      }

      if (!isSecureContextForPush) {
        showNotificationSetupHint('Notifications require HTTPS. Your local network URL is HTTP, so iOS blocks notification permission. Use the installed app from a secure HTTPS URL (for example via a tunnel like ngrok or Cloudflare Tunnel).');
        return;
      }

      console.log('Notification API available, current permission:', Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission result:', permission);
          if (permission !== 'granted') {
            alert('Notification permission was not granted. You can enable it later in iOS Settings -> Notifications for this app.');
          }
        }).catch((err) => {
          console.error('Notification permission request failed:', err);
          alert('Could not request notification permission on this device/context.');
        });
      }
    }

    function sendTimerNotification() {
      console.log('Attempting to send notification. Notification API available:', 'Notification' in window);
      
      // Play vibration pattern (works on iOS and Android)
      if (navigator.vibrate) {
        // Vibrate pattern: 200ms on, 100ms off, 200ms on
        navigator.vibrate([200, 100, 200]);
        console.log('Vibration triggered');
      }
      
      // Play sound notification
      playNotificationSound();
      
      // Try service worker notification first (works even when app is backgrounded)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          console.log('Service Worker ready, attempting notification via SW');
          registration.showNotification('Rest Time Complete! ⏱️', {
            body: '15 seconds have passed',
            icon: '/android-chrome-192x192.png',
            badge: '/favicon-32x32.png',
            tag: 'rest-timer',
            requireInteraction: true,
            vibrate: [200, 100, 200]
          }).catch((err) => {
            console.log('Service Worker notification failed:', err);
            // Fallback to regular notification
            sendRegularNotification();
          });
        }).catch((err) => {
          console.log('Service Worker not ready:', err);
          sendRegularNotification();
        });
      } else {
        console.log('Service Worker not available');
        sendRegularNotification();
      }
      
      function sendRegularNotification() {
        // Try browser notification
        if ('Notification' in window) {
          console.log('Notification permission:', Notification.permission);
          if (Notification.permission === 'granted') {
            try {
              console.log('Sending regular notification...');
              new Notification('Rest Time Complete!', {
                body: '15 seconds have passed - test notification',
                tag: 'rest-timer',
                badge: '⏱️'
              });
              console.log('Notification sent successfully');
            } catch (e) {
              console.error('Notification error:', e);
              // Fallback to toast if notification fails
              showTimerToast.value = true;
              setTimeout(() => {
                showTimerToast.value = false;
              }, 4000);
            }
          } else {
            console.log('Notification permission not granted. Permission:', Notification.permission);
            // Use toast as fallback
            showTimerToast.value = true;
            setTimeout(() => {
              showTimerToast.value = false;
            }, 4000);
          }
        } else {
          console.log('Notification API not available, using toast fallback with vibration');
          // Notification API not available, use toast
          showTimerToast.value = true;
          setTimeout(() => {
            showTimerToast.value = false;
          }, 4000);
        }
      }
    }

    function playNotificationSound() {
      try {
        // Create audio context for beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set frequency and duration for notification beep
        oscillator.frequency.value = 800; // Hz
        oscillator.type = 'sine';
        
        // Create a beep: on for 100ms, off for 50ms, on for 100ms
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        
        // Second beep
        setTimeout(() => {
          try {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 900;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.1);
          } catch (e) {
            console.log('Second beep error:', e);
          }
        }, 150);
        
        console.log('Notification sound played');
      } catch (e) {
        console.log('Audio notification not available:', e);
      }
    }

    function saveTimerState() {
      if (timerStartTime) {
        localStorage.setItem('timerState', JSON.stringify({
          timerStartTime: timerStartTime,
          timerActive: timerActive.value,
          notificationSent: notificationSent
        }));
      }
    }

    function clearTimerState() {
      localStorage.removeItem('timerState');
    }

    function restoreTimerState() {
      const saved = localStorage.getItem('timerState');
      if (!saved) return;

      try {
        const state = JSON.parse(saved);
        const startTime = new Date(state.timerStartTime);
        const now = new Date();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);

        // Only restore if elapsed time is reasonable (less than 1 hour)
        if (elapsedSeconds >= 0 && elapsedSeconds < 3600) {
          timerSeconds.value = elapsedSeconds;
          timerStartTime = state.timerStartTime;
          notificationSent = state.notificationSent || false;
          
          // Restore the exact state: if it was running, resume it; if it was paused, keep it paused
          if (state.timerActive && (elapsedSeconds < 120 || !state.notificationSent)) {
            toggleTimer(false);
          }
        } else if (elapsedSeconds >= 3600) {
          // Timer was running for more than 1 hour, discard it
          clearTimerState();
        }
      } catch (e) {
        console.error('Error restoring timer state:', e);
        clearTimerState();
      }
    }

    function startTimer() {
      toggleTimer(true);
    }

    function toggleTimer(isUserAction = false) {
      if (!timerActive.value) {
        if (isUserAction) {
          // Request notification permission only when the user explicitly starts the timer
          checkNotificationPermission();
        }
        timerActive.value = true;
        
        // Save the start time if this is a fresh start (not from restore)
        if (!timerStartTime) {
          timerStartTime = new Date().toISOString();
        }
        
        if (timerIntervalId) {
          clearInterval(timerIntervalId);
        }
        
        // Use elapsed time calculation for accurate timing
        timerIntervalId = setInterval(() => {
          const startTime = new Date(timerStartTime);
          const now = new Date();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          
          timerSeconds.value = elapsedSeconds;
          
          // Debug: log every 5 seconds
          if (elapsedSeconds % 5 === 0 && elapsedSeconds > 0) {
            console.log('Timer at:', elapsedSeconds, 'seconds. Notification sent:', notificationSent);
          }
          
          // Send notification at 120 seconds (2 minutes)
          if (elapsedSeconds === 120 && !notificationSent) {
            console.log('Timer reached 120 seconds, sending notification');
            notificationSent = true;
            sendTimerNotification();
          }
        }, 100);
        
        // Save timer state when started
        saveTimerState();
      } else {
        // Pause timer
        timerActive.value = false;
        if (timerIntervalId) {
          clearInterval(timerIntervalId);
          timerIntervalId = null;
        }
        
        // Save paused state
        saveTimerState();
      }
    }

    function resetTimer() {
      const wasRunning = timerActive.value;
      
      // Reset to 00:00
      timerSeconds.value = 0;
      notificationSent = false;
      timerStartTime = new Date().toISOString(); // Reset start time for accurate elapsed calculation
      
      if (wasRunning) {
        // Keep running: restart the timer from 00:00
        if (timerIntervalId) {
          clearInterval(timerIntervalId);
        }
        
        timerIntervalId = setInterval(() => {
          const startTime = new Date(timerStartTime);
          const now = new Date();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          
          timerSeconds.value = elapsedSeconds;
          
          // Send notification at 120 seconds
          if (elapsedSeconds === 120 && !notificationSent) {
            console.log('Timer reached 120 seconds, sending notification');
            notificationSent = true;
            sendTimerNotification();
          }
        }, 100);
        
        saveTimerState();
      } else {
        // Not running: just reset to 00:00 and stop
        if (timerIntervalId) {
          clearInterval(timerIntervalId);
          timerIntervalId = null;
        }
        timerActive.value = false;
        timerStartTime = null;
        clearTimerState();
      }
    }

    onMounted(() => {
      loadDefaultData()
      restoreAutoSavedWorkout()
      restoreTimerState()
      updateStreak()
      updateTodayStatus()
      updateRestDayButton()
      
      // Set up auto-save every 30 seconds
      autoSaveInterval = setInterval(autoSaveWorkout, 30000)
      
      // Listen for page visibility changes (for mobile apps/tab switching)
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // Listen for page unload (closing/refreshing)
      window.addEventListener('beforeunload', handleAppPause)
      
      // iOS specific: listen for pagehide event
      window.addEventListener('pagehide', handleAppPause)
    })

    onUnmounted(() => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval)
      }
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleAppPause)
      window.removeEventListener('pagehide', handleAppPause)
    })

    return {
      currentScreen,
      workoutExercises,
      currentWorkoutData,
      defaultWorkoutData,
      streak,
      todayCompleted,
      restDayEnabled,
      fileInput,
      importMessage,
      importError,
      showScreen,
      updateExerciseData,
      updateSets,
      saveWorkout,
      downloadWorkoutData,
      autoSaveWorkout,
      clearAutoSave,
      logRestDay,
      triggerFileInput,
      handleFileImport,
      progressData,
      capitalize,
      timerSeconds,
      timerActive,
      startTimer,
      toggleTimer,
      resetTimer,
      showTimerToast
    }
  }
}
</script>

<style>
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

/* Prevent zoom on focus */
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

 .progress-btn {
   /* Use green accent color */
   background: rgba(102, 187, 106, 0.8);
   border: 2px solid rgba(255, 255, 255, 0.3);
   border-radius: 10px;
   padding: 15px;
   color: white;
   font-size: 1.1em;
   font-weight: 600;
   cursor: pointer;
   width: 100%;
   transition: all 0.3s ease;
 }
 .progress-btn:active {
   background: rgba(102, 187, 106, 1);
}

.data-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 0;
}

.progress-btn {
  grid-column: 1 / -1;
  margin-top: 0;
}

.import-btn:not(.progress-btn) {
  background: rgba(255, 152, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 10px 12px;
  color: white;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.import-btn:not(.progress-btn):active {
  background: rgba(255, 152, 0, 1);
}

.download-btn {
  background: rgba(156, 39, 176, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 10px 12px;
  color: white;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.download-btn:active {
  background: rgba(156, 39, 176, 1);
}

.rest-day-btn {
  background: rgba(128, 128, 128, 0.5);
  border: none;
  border-radius: 10px;
  padding: 20px;
  color: white;
  font-size: 1.2em;
  font-weight: 600;
  cursor: not-allowed;
  width: 100%;
  margin-top: 10px;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}

.rest-day-btn.enabled {
  background: rgba(33, 150, 243, 0.8);
  cursor: pointer;
}

.rest-day-btn.enabled:active {
  background: rgba(33, 150, 243, 1);
}

/* Streak Counter */
.streak-counter {
  position: fixed;
  top: 68px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 10px 15px;
  font-size: 1.2em;
  font-weight: 700;
  z-index: 1000;
  text-align: center;
  transition: all 0.3s ease;
}

.streak-counter.incomplete {
  background: rgba(255, 193, 7, 0.3);
  border: 2px solid rgba(255, 193, 7, 0.5);
}

.streak-hint {
  font-size: 0.7em;
  font-weight: 400;
  margin-top: 2px;
  opacity: 0.9;
}

/* Import Status Message */
.import-status {
  margin-top: 15px;
  padding: 12px;
  background: rgba(76, 175, 80, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  text-align: center;
  font-size: 0.9em;
  border: 1px solid rgba(76, 175, 80, 0.5);
  animation: fadeOut 0.5s ease-in-out 2.5s forwards;
}

.import-status.error {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.5);
  animation: fadeOut 0.5s ease-in-out 2.5s forwards;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
    pointer-events: none;
  }
}

/* Streak Status Message */
.streak-status {
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  text-align: center;
  font-size: 0.9em;
}

.status-completed {
  color: #4caf50;
  font-weight: 600;
}

.status-pending {
  color: #ffc107;
  font-weight: 600;
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

.timer-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
  color: white;
  padding: 20px 32px;
  border-radius: 12px;
  font-size: 1.3em;
  font-weight: 700;
  text-align: center;
  z-index: 10000;
  box-shadow: 0 8px 24px rgba(255, 0, 0, 0.4);
  max-width: 90%;
  animation: toastBounce 0.5s ease-out;
  border: 3px solid rgba(255, 255, 255, 0.8);
}

@keyframes toastBounce {
  0% {
    transform: translateX(-50%) translateY(-100px) scale(0.8);
    opacity: 0;
  }
  50% {
    transform: translateX(-50%) translateY(0) scale(1.05);
  }
  100% {
    transform: translateX(-50%) translateY(0) scale(1);
    opacity: 1;
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>