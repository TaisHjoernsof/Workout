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
            placeholder="8"
            :value="getCurrentValue(exercise, 'reps', i-1)"
            @change="$emit('update-exercise', workoutType, exercise, i-1, 'reps', $event.target.value)"
          >
          <input 
            type="number" 
            class="set-input" 
            placeholder="0"
            :value="getCurrentValue(exercise, 'weight', i-1)"
            @change="$emit('update-exercise', workoutType, exercise, i-1, 'weight', $event.target.value)"
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
    getCurrentValue(exercise, field, index) {
      const exerciseData = this.workoutData[exercise];
      if (!exerciseData || !exerciseData[field]) {
        return '';
      }
      const value = exerciseData[field][index];
      // Only return non-default values
      const defaultValue = field === 'reps' ? 8 : 0;
      return (value === defaultValue || value === null || value === undefined) ? '' : value.toString();
    }
  }
}
</script>