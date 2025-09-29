<template>
  <div>
    <div v-for="exercise in exercises" :key="exercise" class="exercise-panel">
      <div class="exercise-header">
        <div class="exercise-name">{{ exercise }}</div>
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
      focusedInputs: new Set()
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
      
      // Return empty string if value is default (so placeholder shows)
      return (value === defaultValue || value === null || value === undefined) ? '' : value.toString();
    },
    
    handleFocus(event, field) {
      // Store that this input is focused
      this.focusedInputs.add(event.target);
      
      // Clear the field if it contains the default value
      const defaultValue = field === 'reps' ? '8' : '0';
      if (event.target.value === '' || event.target.value === defaultValue) {
        event.target.value = '';
      }
    },
    
    handleBlur(event, field) {
      // Remove from focused inputs
      this.focusedInputs.delete(event.target);
      
      // If empty after blur, restore placeholder behavior
      if (event.target.value === '') {
        event.target.value = '';
      }
    },
    
    handleInputChange(event, workoutType, exercise, setIndex, field) {
      const value = event.target.value;
      
      // If input is empty after change, keep it empty but don't update the model yet
      if (value === '') {
        return;
      }
      
      // Update the model with the new value
      this.$emit('update-exercise', workoutType, exercise, setIndex, field, value);
    }
  }
}
</script>