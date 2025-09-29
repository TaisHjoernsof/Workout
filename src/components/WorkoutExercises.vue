<template>
  <div>
    <div v-for="exercise in exercises" :key="exercise" class="exercise-panel">
      <div class="exercise-header">
        <div class="exercise-name">{{ exercise }}</div>
        <div class="exercise-controls">
          <button 
            v-if="hasVideo(exercise)"
            class="video-btn"
            @click="toggleVideo(exercise)"
            :title="`${showVideo[exercise] ? 'Hide' : 'Show'} demonstration video`"
          >
            {{ showVideo[exercise] ? '▲' : '▶' }}
          </button>
          <div class="sets-control">
            <span>Sets:</span>
            <input 
              type="number" 
              :value="workoutData[exercise]?.sets || 3"
              min="1" 
              max="10"
              @change="$emit('update-sets', workoutType, exercise, $event.target.value)"
            >
          </div>
        </div>
      </div>
      
      <!-- Video Display -->
      <div v-if="showVideo[exercise] && hasVideo(exercise)" class="video-container">
        <video 
          :src="getVideoPath(exercise)" 
          controls 
          preload="metadata"
          class="exercise-video"
          :data-exercise="exercise"
          @error="handleVideoError(exercise)"
          @loadeddata="handleVideoLoaded(exercise)"
        >
          Your browser does not support the video tag.
          <p>Video path: {{ getVideoPath(exercise) }}</p>
        </video>
        <div v-if="videoError[exercise]" class="video-error">
          Video not found: {{ getVideoPath(exercise) }}
        </div>
      </div>
      
      <div class="sets-container">
        <div class="set-header">
          <div class="set-header-label">Set</div>
          <div class="set-header-label">Reps</div>
          <div class="set-header-label">Weight</div>
        </div>
        <div 
          v-for="i in (workoutData[exercise]?.sets || 3)" 
          :key="i"
          class="set-row"
        >
          <div class="set-label">{{ i }}</div>
          <input 
            type="number" 
            class="set-input" 
            :placeholder="getCurrentValue(exercise, 'reps', i-1)"
            @change="handleInputChange($event, workoutType, exercise, i-1, 'reps')"
            @focus="handleFocus($event, 'reps')"
            @blur="handleBlur($event, 'reps')"
          >
          <input 
            type="number" 
            class="set-input" 
            :placeholder="getCurrentValue(exercise, 'weight', i-1)"
            @change="handleInputChange($event, workoutType, exercise, i-1, 'weight')"
            @focus="handleFocus($event, 'weight')"
            @blur="handleBlur($event, 'weight')"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WorkoutExercises',
  props: {
    workoutType: String,
    exercises: Array,
    workoutData: Object
  },
  emits: ['update-exercise', 'update-sets'],
  data() {
    return {
      focusedInputs: new Set(),
      showVideo: {},
      videoError: {}
    }
  },
  methods: {
    getDefaultValue(exercise, field, index) {
      return field === 'reps' ? '8' : '0';
    },
    
    getCurrentValue(exercise, field, index) {
      const exerciseData = this.workoutData[exercise];
      if (!exerciseData || !exerciseData[field]) {
        return '';
      }
      const value = exerciseData[field][index];
      const defaultValue = field === 'reps' ? 8 : 0;
      
      return (value === defaultValue || value === null || value === undefined) ? '' : value.toString();
    },
    
    handleFocus(event, field) {
      this.focusedInputs.add(event.target);
      const defaultValue = field === 'reps' ? '8' : '0';
      if (event.target.value === '' || event.target.value === defaultValue) {
        event.target.value = '';
      }
    },
    
    handleBlur(event, field) {
      this.focusedInputs.delete(event.target);
      if (event.target.value === '') {
        event.target.value = '';
      }
    },
    
    handleInputChange(event, workoutType, exercise, setIndex, field) {
      const value = event.target.value;
      if (value === '') {
        return;
      }
      this.$emit('update-exercise', workoutType, exercise, setIndex, field, value);
    },
    
    hasVideo(exercise) {
      // Check if video exists for this exercise
      const videoPath = this.getVideoPath(exercise);
      // This is a simple check - in a real app, you might want to verify the file exists
      return true; // Assuming all exercises have videos
    },
    
    getVideoPath(exercise) {
      // Clean the exercise name for use in file paths
      const cleanName = exercise.replace(/[^a-zA-Z0-9\s\-]/g, '').replace(/\s+/g, ' ');
      return `/src/videos/${cleanName}.webm`;
    },
    
    toggleVideo(exercise) {
      this.$set(this.showVideo, exercise, !this.showVideo[exercise]);
    },

    hasVideo(exercise) {
      return true;
    },
    
    getVideoPath(exercise) {
      // Clean the exercise name for use in file paths
      const cleanName = exercise.replace(/[^a-zA-Z0-9\s\-]/g, '').replace(/\s+/g, ' ');
      // Use relative path from public folder
      return `videos/${cleanName}.webm`;
    },
    
    toggleVideo(exercise) {
      const videoPath = this.getVideoPath(exercise);
      console.log('Toggling video for:', exercise);
      console.log('Video path:', videoPath);
      
      // Reset error state when toggling
      this.$set(this.videoError, exercise, false);
      
      this.$set(this.showVideo, exercise, !this.showVideo[exercise]);
    },

    handleVideoError(exercise) {
      console.error(`Failed to load video for: ${exercise}`);
      console.error(`Tried path: ${this.getVideoPath(exercise)}`);
      this.$set(this.videoError, exercise, true);
    },

    handleVideoLoaded(exercise) {
      console.log(`Video loaded successfully for: ${exercise}`);
      this.$set(this.videoError, exercise, false);
    }
  }
}
</script>

<style scoped>
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

.video-error {
  color: #ff6b6b;
  text-align: center;
  padding: 10px;
  font-size: 0.9em;
}
</style>