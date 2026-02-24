<template>
  <div class="progress-graph">
    <div v-if="!hasData" class="no-data">No data to display.</div>
    <div v-else>
      <canvas ref="canvas" width="400" height="260"></canvas>
      <div class="graph-controls">
        <label>
          Exercise:
          <select v-model="selectedExercise" class="exercise-select">
            <option v-for="ex in exerciseList" :key="ex" :value="ex">{{ ex }}</option>
          </select>
        </label>
        <label>
          Metric:
          <select v-model="selectedMetric" class="metric-select">
            <option value="weight">Last Set Weight</option>
            <option value="reps">Reps (All Sets)</option>
          </select>
        </label>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProgressGraph',
  props: {
    progressData: {
      type: Array,
      default: () => []
    },
    exerciseList: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      selectedExercise: this.exerciseList[0] || '',
      selectedMetric: 'weight',
    }
  },
  computed: {
    exercisesWithData() {
      const set = new Set(this.progressData.map(entry => entry.exercise));
      return this.exerciseList.filter(ex => set.has(ex));
    },
    filteredData() {
      return this.progressData.filter(entry => entry.exercise === this.selectedExercise);
    },
    hasData() {
      return this.filteredData.length > 0;
    }
  },
  watch: {
    selectedExercise() {
      this.drawGraph();
    },
    selectedMetric() {
      this.drawGraph();
    },
    progressData: {
      handler() {
        this.ensureSelectedExercise();
        this.drawGraph();
      },
      deep: true
    },
    exerciseList() {
      this.ensureSelectedExercise();
      this.drawGraph();
    }
  },
  mounted() {
    this.ensureSelectedExercise();
    this.drawGraph();
  },
  methods: {
    drawStar(ctx, x, y, radius) {
      const spikes = 5;
      const innerRadius = radius * 0.45;
      let rotation = -Math.PI / 2;

      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        const outerX = x + Math.cos(rotation) * radius;
        const outerY = y + Math.sin(rotation) * radius;
        ctx.lineTo(outerX, outerY);
        rotation += Math.PI / spikes;

        const innerX = x + Math.cos(rotation) * innerRadius;
        const innerY = y + Math.sin(rotation) * innerRadius;
        ctx.lineTo(innerX, innerY);
        rotation += Math.PI / spikes;
      }
      ctx.closePath();
      ctx.fillStyle = '#ffd54a';
      ctx.fill();
    },
    ensureSelectedExercise() {
      if (this.hasData) return;
      if (this.exercisesWithData.length > 0) {
        this.selectedExercise = this.exercisesWithData[0];
        return;
      }
      if (this.exerciseList.length > 0 && !this.selectedExercise) {
        this.selectedExercise = this.exerciseList[0];
      }
    },
    ensureSelectedMetricHasData() {
      if (!this.hasData) return;
      const weightValues = this.filteredData
        .map(entry => entry.lastSetWeight === '-' || entry.lastSetWeight == null ? null : Number(entry.lastSetWeight))
        .filter(v => v !== null && !Number.isNaN(v));
      const repsValues = this.filteredData
        .flatMap(entry => Array.isArray(entry.reps) ? entry.reps : [])
        .map(rep => rep === '-' || rep == null ? null : Number(rep))
        .filter(v => v !== null && !Number.isNaN(v));

      if (this.selectedMetric === 'weight' && weightValues.length === 0 && repsValues.length > 0) {
        this.selectedMetric = 'reps';
      }
    },
    drawGraph() {
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!this.hasData) return;
      this.ensureSelectedMetricHasData();
      // Prepare data
      const w = canvas.width;
      const h = canvas.height;
      const margin = 48;
      let dataSets = [];
      const weights = this.filteredData.map(entry => entry.lastSetWeight === '-' || entry.lastSetWeight == null ? null : Number(entry.lastSetWeight));
      if (this.selectedMetric === 'weight') {
        // Only one set for weight
        dataSets = [this.filteredData.map(entry => entry.lastSetWeight === '-' ? null : Number(entry.lastSetWeight))];
      } else if (this.selectedMetric === 'reps') {
        // Show all sets for reps
        // Find max set count
        const maxSets = Math.max(...this.filteredData.map(entry => Array.isArray(entry.reps) ? entry.reps.length : 0));
        for (let setIdx = 0; setIdx < maxSets; setIdx++) {
          dataSets.push(this.filteredData.map(entry => {
            if (!Array.isArray(entry.reps)) return null;
            return entry.reps[setIdx] === '-' || entry.reps[setIdx] == null ? null : Number(entry.reps[setIdx]);
          }));
        }
      }
      const dates = this.filteredData.map(entry => entry.date);
      // Ensure validData is calculated correctly
      const validData = dataSets.flat().filter(v => v !== null);
      if (validData.length === 0) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#ffc107';
        ctx.textAlign = 'center';
        ctx.fillText('No numeric data for this metric.', w / 2, h / 2);
        return;
      }
      const minY = Math.min(...validData);
      const maxY = Math.max(...validData);
      // Draw axes
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, margin);
      ctx.lineTo(margin, h - margin);
      ctx.lineTo(w - margin, h - margin);
      ctx.stroke();

      // Draw y-axis ticks and labels
      const tickValues = [];
      if (this.selectedMetric === 'reps') {
        const minTick = Math.floor(minY);
        const maxTick = Math.ceil(maxY);
        const range = Math.max(0, maxTick - minTick);
        const integerStep = Math.max(1, Math.ceil(range / 6));
        for (let value = minTick; value <= maxTick; value += integerStep) {
          tickValues.push(value);
        }
        if (tickValues[tickValues.length - 1] !== maxTick) {
          tickValues.push(maxTick);
        }
      } else {
        const yTickCount = 5;
        const yTickStep = (maxY - minY || 1) / (yTickCount - 1);
        for (let i = 0; i < yTickCount; i++) {
          tickValues.push(minY + i * yTickStep);
        }
      }

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      for (let i = 0; i < tickValues.length; i++) {
        const value = tickValues[i];
        const y = h - margin - ((value - minY) / (maxY - minY || 1)) * (h - 2 * margin);
        ctx.beginPath();
        ctx.moveTo(margin - 6, y);
        ctx.lineTo(margin, y);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.stroke();
        const label = this.selectedMetric === 'reps'
          ? String(Math.round(value))
          : String(Math.round(value * 100) / 100);
        ctx.fillText(label, margin - 10, y + 4);
      }

      // Draw labels
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(this.selectedMetric === 'weight' ? 'Weight' : 'Reps', margin - 8, margin - 18);
      ctx.textAlign = 'center';
      ctx.fillText('Date', w / 2, h - margin + 28);
      // Draw data points and lines
      const n = dates.length;
      const xStep = (w - 2 * margin) / (n - 1 || 1);
      // Colors for sets
      const setColors = ['#4c6bf4', '#22f0ff', '#ffb347', '#ff4c4c', '#7fff7f'];
      for (let setIdx = 0; setIdx < dataSets.length; setIdx++) {
        const data = dataSets[setIdx];
        const baseColor = setColors[setIdx % setColors.length];
        ctx.lineWidth = 2;
        const points = [];
        for (let i = 0; i < n; i++) {
          if (data[i] === null) continue;
          const x = margin + i * xStep;
          const y = h - margin - ((data[i] - minY) / (maxY - minY || 1)) * (h - 2 * margin);
          points.push({ i, x, y });
        }

        for (let p = 1; p < points.length; p++) {
          const prev = points[p - 1];
          const curr = points[p];
          ctx.strokeStyle = baseColor;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }

        // Draw points
        for (let p = 0; p < points.length; p++) {
          const point = points[p];
          const prevPoint = p > 0 ? points[p - 1] : null;
          const pointWeightIncreased =
            this.selectedMetric === 'reps' &&
            prevPoint &&
            weights[point.i] !== null &&
            weights[prevPoint.i] !== null &&
            weights[point.i] > weights[prevPoint.i];

          ctx.fillStyle = baseColor;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          if (pointWeightIncreased) {
            this.drawStar(ctx, point.x, point.y, 2.4);
          }
          // Date label rotated 45 degrees
          if (setIdx === 0) {
            ctx.save();
            ctx.translate(point.x, h - margin + 12);
            ctx.rotate(-Math.PI / 4);
            ctx.font = '10px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.fillText(dates[point.i], 0, 0);
            ctx.restore();
          }
        }
      }
    }
  }
}
</script>

<style scoped>
.progress-graph {
  margin: 20px 0;
  background: rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  max-width: 100vw;
  overflow-x: auto;
}
.no-data {
  color: #ffc107;
  text-align: center;
  font-size: 1em;
  margin: 20px 0;
}
/* Improved alignment for graph controls */
/* Left-align graph controls */
.graph-controls {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 24px;
  margin-top: 18px;
  justify-content: flex-start;
  flex-wrap: wrap;
  max-width: 100vw;
}
/* Style labels and selects for alignment */
.graph-controls label {
  display: grid;
  grid-template-columns: 72px auto;
  align-items: center;
  gap: 8px;
  font-size: 1em;
}
.graph-controls label {
  text-align: right;
}
/* Make select boxes larger and more readable */
/* Make Exercise select larger, Metric select automatic */
.graph-controls select {
  margin-left: 4px;
  font-size: 1.15em;
  padding: 9px 14px;
  width: 220px;
  min-width: 220px;
  justify-self: start;
}
.graph-controls select.exercise-select {
  min-width: 220px;
}
.graph-controls select.metric-select {
  min-width: 220px;
  width: 220px;
  font-size: 1.15em;
  padding: 9px 14px;
}
canvas {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}
select {
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  font-size: 1.15em;
  min-width: 180px;
  max-width: 100%;
}
@media (max-width: 600px) {
  .progress-graph {
    padding: 8px;
  }
  .graph-controls {
    gap: 6px;
    font-size: 0.95em;
  }
  select {
    font-size: 0.95em;
    max-width: 100px;
  }
  canvas {
    width: 100% !important;
    max-width: 100vw;
    height: auto !important;
  }
}
</style>
