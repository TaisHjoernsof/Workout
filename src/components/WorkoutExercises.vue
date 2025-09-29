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
            :placeholder="getDefaultValue(exercise, 'reps', i-1)"
            :value="getCurrentValue(exercise, 'reps', i-1)"
            @input="$emit('update-exercise', workoutType, exercise, i-1, 'reps', $event.target.value)"
            @focus="clearIfDefault($event, getDefaultValue(exercise, 'reps', i-1))"
          >
          <input 
            type="number" 
            class="set-input" 
            :placeholder="getDefaultValue(exercise, 'weight', i-1)"
            :value="getCurrentValue(exercise, 'weight', i-1)"
            @input="$emit('update-exercise', workoutType, exercise, i-1, 'weight', $event.target.value)"
            @focus="clearIfDefault($event, getDefaultValue(exercise, 'weight', i-1))"
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
      return value === defaultValue ? '' : value.toString();
    },
    
    clearIfDefault(event, defaultValue) {
      if (event.target.value === '' || event.target.value === defaultValue) {
        event.target.value = '';
      }
    }
  }
}
</script>