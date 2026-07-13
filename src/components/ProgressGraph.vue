<template>
  <div class="progress-graph">
    <div v-if="!hasData" class="no-data">No data to display.</div>
    <div v-else>
      <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
      <div v-if="!isRunWorkout" class="strength-legend" aria-label="Reps set color legend">
        <span v-for="item in strengthSetLegend" :key="item.label" class="legend-chip">
          <span class="legend-dot" :style="{ backgroundColor: item.color }"></span>
          {{ item.label }}
        </span>
        <span class="legend-chip">
          <span class="legend-line"></span>
          Weight
        </span>
      </div>
      <div class="graph-controls">
        <label>
          Exercise:
          <select v-model="selectedExercise" class="exercise-select">
            <option v-for="ex in exerciseList" :key="ex" :value="ex">{{ ex }}</option>
          </select>
        </label>
        <label v-if="isRunWorkout">
          Metric:
          <select v-model="selectedMetric" class="metric-select">
            <option v-if="isRunWorkout" value="length">Length (km)</option>
            <option v-if="isRunWorkout" value="pace">Pace (min/km)</option>
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
    },
    workoutType: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      selectedExercise: this.exerciseList[0] || '',
      selectedMetric: this.workoutType === 'run' ? 'length' : '',
      setColors: ['#4c6bf4', '#22f0ff', '#ffb347', '#ff4c4c']
    }
  },
  computed: {
    isRunWorkout() {
      return this.workoutType === 'run';
    },
    exercisesWithData() {
      const set = new Set(this.progressData.map(entry => entry.exercise));
      return this.exerciseList.filter(ex => set.has(ex));
    },
    filteredData() {
      return this.progressData
        .filter(entry => entry.exercise === this.selectedExercise)
        .slice()
        .sort((a, b) => {
          const aTime = Number.isFinite(Number(a.timestampMs)) ? Number(a.timestampMs) : new Date(a.date).getTime();
          const bTime = Number.isFinite(Number(b.timestampMs)) ? Number(b.timestampMs) : new Date(b.date).getTime();
          return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
        });
    },
    hasData() {
      return this.filteredData.length > 0;
    },
    canvasWidth() {
      const count = Math.max(2, this.filteredData.length);
      return Math.max(400, count * 72);
    },
    canvasHeight() {
      return this.isRunWorkout ? 260 : 300;
    },
    strengthSetLegend() {
      return this.setColors.map((color, idx) => ({
        label: `Set ${idx + 1}`,
        color
      }));
    }
  },
  watch: {
    workoutType() {
      this.selectedMetric = this.isRunWorkout ? 'length' : '';
      this.drawGraph();
    },
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
    toNumber(value) {
      if (value == null || value === '-') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    },
    ensureSelectedMetricHasData() {
      if (!this.hasData || !this.isRunWorkout) return;
      const lengthValues = this.filteredData
        .map(entry => this.toNumber(entry.lengthKm))
        .filter(v => v !== null);
      const paceValues = this.filteredData
        .map(entry => this.toNumber(entry.paceSecPerKm))
        .filter(v => v !== null);

      if (this.selectedMetric === 'length' && lengthValues.length === 0 && paceValues.length > 0) {
        this.selectedMetric = 'pace';
      }
      if (this.selectedMetric === 'pace' && paceValues.length === 0 && lengthValues.length > 0) {
        this.selectedMetric = 'length';
      }
    },
    drawGraph() {
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!this.hasData) return;

      if (this.isRunWorkout) {
        this.ensureSelectedMetricHasData();
        this.drawRunGraph(ctx, canvas);
        return;
      }

      this.drawStrengthGraph(ctx, canvas);
    },
    drawRunGraph(ctx, canvas) {
      const w = canvas.width;
      const h = canvas.height;
      const marginLeft = 48;
      const marginRight = 20;
      const marginTop = 32;
      const marginBottom = 56;
      const plotHeight = h - marginTop - marginBottom;

      const metricData = this.selectedMetric === 'pace'
        ? this.filteredData.map(entry => this.toNumber(entry.paceSecPerKm))
        : this.filteredData.map(entry => this.toNumber(entry.lengthKm));
      const dates = this.filteredData.map(entry => entry.date);

      const validData = metricData.filter(v => v !== null);
      if (validData.length === 0) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#ffc107';
        ctx.textAlign = 'center';
        ctx.fillText('No numeric data for this metric.', w / 2, h / 2);
        return;
      }

      const minY = Math.min(...validData);
      const maxY = Math.max(...validData);

      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginLeft, marginTop);
      ctx.lineTo(marginLeft, h - marginBottom);
      ctx.lineTo(w - marginRight, h - marginBottom);
      ctx.stroke();

      const tickValues = [];
      if (this.selectedMetric === 'pace') {
        const minTick = Math.floor(minY);
        const maxTick = Math.ceil(maxY);
        const range = Math.max(0, maxTick - minTick);
        const step = Math.max(10, Math.ceil(range / 6 / 10) * 10);
        for (let value = minTick; value <= maxTick; value += step) {
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
        const y = h - marginBottom - ((value - minY) / (maxY - minY || 1)) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(marginLeft - 6, y);
        ctx.lineTo(marginLeft, y);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.stroke();
        const label = this.selectedMetric === 'pace'
          ? `${Math.floor(value / 60)}:${String(Math.round(value % 60)).padStart(2, '0')}`
          : String(Math.round(value * 100) / 100);
        ctx.fillText(label, marginLeft - 10, y + 4);
      }

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      const yAxisLabel = this.selectedMetric === 'pace' ? 'Pace (min/km)' : 'Length (km)';
      ctx.fillText(yAxisLabel, marginLeft - 8, marginTop - 16);
      ctx.textAlign = 'center';
      ctx.fillText('Date', w / 2, h - marginBottom + 34);

      const n = dates.length;
      const plotWidth = w - marginLeft - marginRight;
      const xStep = plotWidth / (n - 1 || 1);
      const pointColor = '#22f0ff';

      const points = [];
      for (let i = 0; i < n; i++) {
        if (metricData[i] === null) continue;
        const x = marginLeft + i * xStep;
        const y = h - marginBottom - ((metricData[i] - minY) / (maxY - minY || 1)) * plotHeight;
        points.push({ i, x, y });
      }

      ctx.strokeStyle = pointColor;
      ctx.lineWidth = 2;
      for (let p = 1; p < points.length; p++) {
        ctx.beginPath();
        ctx.moveTo(points[p - 1].x, points[p - 1].y);
        ctx.lineTo(points[p].x, points[p].y);
        ctx.stroke();
      }

      ctx.fillStyle = pointColor;
      for (let p = 0; p < points.length; p++) {
        const point = points[p];
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.save();
        ctx.translate(point.x, h - marginBottom + 12);
        ctx.rotate(-Math.PI / 4);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(dates[point.i], 0, 0);
        ctx.restore();
      }
    },
    drawStrengthGraph(ctx, canvas) {
      const w = canvas.width;
      const h = canvas.height;
      const marginLeft = 50;
      const marginRight = 56;
      const marginTop = 28;
      const marginBottom = 66;
      const plotWidth = w - marginLeft - marginRight;
      const plotHeight = h - marginTop - marginBottom;
      const yBottom = h - marginBottom;

      const dates = this.filteredData.map(entry => entry.date);
      const n = dates.length;
      const xStep = plotWidth / (n - 1 || 1);

      const repsBySet = Array.from({ length: 4 }, (_, setIdx) =>
        this.filteredData.map(entry => {
          if (!Array.isArray(entry.reps)) return null;
          return this.toNumber(entry.reps[setIdx]);
        })
      );
      const weightsBySet = Array.from({ length: 4 }, (_, setIdx) =>
        this.filteredData.map(entry => {
          if (!Array.isArray(entry.weights)) return null;
          return this.toNumber(entry.weights[setIdx]);
        })
      );
      const weightData = this.filteredData.map(entry => this.toNumber(entry.lastSetWeight));

      const hasAnyRep = repsBySet.some(setValues => setValues.some(v => v !== null));
      const weightValues = [
        ...weightData.filter(v => v !== null),
        ...weightsBySet.flat().filter(v => v !== null)
      ];
      if (!hasAnyRep && weightValues.length === 0) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#ffc107';
        ctx.textAlign = 'center';
        ctx.fillText('No numeric data for this exercise.', w / 2, h / 2);
        return;
      }

      const repsToY = (value) => {
        const clamped = Math.max(0, Math.min(12, value));
        return yBottom - (clamped / 12) * plotHeight;
      };

      // Highlight low-rep threshold zone from 0 to 8 reps.
      const repsThresholdTopY = repsToY(8);
      ctx.fillStyle = 'rgba(255, 80, 80, 0.20)';
      ctx.fillRect(marginLeft, repsThresholdTopY, w - marginLeft - marginRight, yBottom - repsThresholdTopY);

      // Highlight high-rep threshold zone from 12 reps to y-max.
      const repsHighThresholdBottomY = repsToY(12);
      const repsHighThresholdTopY = marginTop;
      // With fixed 0-12 scaling, 12 maps to y-max and this zone can collapse to ~0px.
      // Keep a visible cap so the threshold is still readable.
      const rawHighThresholdHeight = repsHighThresholdBottomY - repsHighThresholdTopY;
      const repsHighThresholdHeight = Math.max(10, rawHighThresholdHeight);
      ctx.fillStyle = 'rgba(80, 200, 120, 0.20)';
      ctx.fillRect(marginLeft, repsHighThresholdTopY, w - marginLeft - marginRight, repsHighThresholdHeight);

      let minWeight = 0;
      let maxWeight = 1;
      if (weightValues.length > 0) {
        const rawMin = Math.min(...weightValues);
        const rawMax = Math.max(...weightValues);
        if (rawMin === rawMax) {
          const pad = Math.max(1, Math.abs(rawMin) * 0.05);
          minWeight = rawMin - pad;
          maxWeight = rawMax + pad;
        } else {
          const pad = Math.max(0.5, (rawMax - rawMin) * 0.08);
          minWeight = rawMin - pad;
          maxWeight = rawMax + pad;
        }
      }

      let weightTicks = [];
      let axisMinWeight = minWeight;
      let axisMaxWeight = maxWeight;
      if (weightValues.length > 0) {
        const weightTickMin = Math.floor(minWeight);
        const weightTickMax = Math.ceil(maxWeight);
        axisMinWeight = weightTickMin;
        axisMaxWeight = weightTickMax;
        const desiredTickCount = 6;
        const tickStep = Math.max(1, Math.ceil((weightTickMax - weightTickMin) / (desiredTickCount - 1 || 1)));
        for (let value = weightTickMin; value <= weightTickMax; value += tickStep) {
          weightTicks.push(value);
        }
        if (weightTicks.length === 0 || weightTicks[weightTicks.length - 1] !== weightTickMax) {
          weightTicks.push(weightTickMax);
        }
      }

      const weightToY = (value) => {
        if (axisMaxWeight === axisMinWeight) return marginTop + (plotHeight / 2);
        return yBottom - ((value - axisMinWeight) / (axisMaxWeight - axisMinWeight)) * plotHeight;
      };
      const topWeightY = Math.round(weightToY(axisMaxWeight)) + 0.5;
      const bottomWeightY = Math.round(weightToY(axisMinWeight)) + 0.5;
      const minLabelY = topWeightY + 6;
      const maxLabelY = bottomWeightY - 6;

      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginLeft, marginTop);
      ctx.lineTo(marginLeft, yBottom);
      ctx.lineTo(w - marginRight, yBottom);
      ctx.lineTo(w - marginRight, marginTop);
      ctx.stroke();

      if (weightValues.length > 0) {
        for (let i = 0; i < weightTicks.length; i++) {
          const value = weightTicks[i];
          const y = Math.round(weightToY(value)) + 0.5;

          // Left axis tick marks and labels for weight
          ctx.beginPath();
          ctx.moveTo(marginLeft - 6, y);
          ctx.lineTo(marginLeft, y);
          ctx.strokeStyle = '#aaa';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Weight grid lines
          ctx.beginPath();
          ctx.moveTo(marginLeft, y);
          ctx.lineTo(w - marginRight, y);
          ctx.strokeStyle = i === 0 ? '#8d939e' : 'rgba(141, 147, 158, 0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Right axis tick marks aligned with weight for reference
          ctx.beginPath();
          ctx.moveTo(w - marginRight, y);
          ctx.lineTo(w - marginRight + 6, y);
          ctx.strokeStyle = '#aaa';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      const repTicks = [0, 2, 4, 6, 8, 10, 12];
      const repMinorTicks = [1, 3, 5, 7, 9, 11];

      for (let i = 0; i < n; i++) {
        const x = marginLeft + i * xStep;
        const groupWidth = Math.min(34, (n > 1 ? xStep * 0.72 : 34));
        const barGap = 2;
        const barWidth = Math.max(2, (groupWidth - (3 * barGap)) / 4);
        const startX = x - groupWidth / 2;

        for (let setIdx = 0; setIdx < 4; setIdx++) {
          const repValue = repsBySet[setIdx][i];
          if (repValue === null) continue;
          const y = repsToY(repValue);
          const height = yBottom - y;
          if (height <= 0) continue;
          const rawBarX = startX + setIdx * (barWidth + barGap);

          ctx.fillStyle = this.setColors[setIdx];
          ctx.fillRect(rawBarX, y, barWidth, height);
        }

        ctx.fillStyle = '#d8dee8';
        ctx.beginPath();
        ctx.arc(x, yBottom, 2.2, 0, 2 * Math.PI);
        ctx.fill();

        ctx.save();
        ctx.translate(x, yBottom + 12);
        ctx.rotate(-Math.PI / 4);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(dates[i], 0, 0);
        ctx.restore();
      }

      // Draw even-numbered rep guide lines as major grid lines above bars.
      for (let i = 0; i < repTicks.length; i++) {
        const y = Math.round(repsToY(repTicks[i])) + 0.5;
        ctx.beginPath();
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(w - marginRight, y);
        ctx.strokeStyle = i === 0 ? 'rgba(216, 224, 236, 0.65)' : 'rgba(216, 224, 236, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw odd-numbered rep guide lines as an overlay so they remain visible above bars.
      ctx.save();
      ctx.setLineDash([3, 4]);
      for (let i = 0; i < repMinorTicks.length; i++) {
        const y = Math.round(repsToY(repMinorTicks[i])) + 0.5;
        ctx.beginPath();
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(w - marginRight, y);
        ctx.strokeStyle = 'rgba(225, 232, 243, 0.32)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      const weightPointsByEntry = [];
      for (let i = 0; i < n; i++) {
        const x = marginLeft + i * xStep;
        const groupWidth = Math.min(34, (n > 1 ? xStep * 0.72 : 34));
        const barGap = 2;
        const barWidth = Math.max(2, (groupWidth - (3 * barGap)) / 4);
        const startX = x - groupWidth / 2;

        const groupedByWeight = new Map();
        for (let setIdx = 0; setIdx < 4; setIdx++) {
          const setWeight = weightsBySet[setIdx][i];
          if (setWeight === null) continue;
          const key = String(setWeight);
          if (!groupedByWeight.has(key)) {
            groupedByWeight.set(key, { weight: setWeight, xCenters: [], firstSetIdx: setIdx });
          }
          const group = groupedByWeight.get(key);
          group.xCenters.push(startX + setIdx * (barWidth + barGap) + (barWidth / 2));
          group.firstSetIdx = Math.min(group.firstSetIdx, setIdx);
        }

        const points = Array.from(groupedByWeight.values())
          .sort((a, b) => a.firstSetIdx - b.firstSetIdx)
          .map(group => {
            const centerX = group.xCenters.reduce((sum, value) => sum + value, 0) / group.xCenters.length;
            return {
              x: centerX,
              y: weightToY(group.weight)
            };
          });

        if (points.length === 0) {
          const fallbackWeight = weightData[i];
          if (fallbackWeight !== null) {
            points.push({ x, y: weightToY(fallbackWeight) });
          }
        }

        weightPointsByEntry.push(points);
      }

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      let previousPoint = null;
      for (let i = 0; i < n; i++) {
        const pointsForEntry = weightPointsByEntry[i];
        if (!pointsForEntry || pointsForEntry.length === 0) {
          previousPoint = null;
          continue;
        }

        for (let p = 0; p < pointsForEntry.length; p++) {
          const point = pointsForEntry[p];
          if (previousPoint) {
            ctx.beginPath();
            ctx.moveTo(previousPoint.x, previousPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
          }
          previousPoint = point;
        }
      }

      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < n; i++) {
        const pointsForEntry = weightPointsByEntry[i];
        if (!pointsForEntry || pointsForEntry.length === 0) continue;
        for (let p = 0; p < pointsForEntry.length; p++) {
          const point = pointsForEntry[p];
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Repaint axis ticks and labels on top so bars stay visually behind label text.
      if (weightValues.length > 0) {
        ctx.font = '11px sans-serif';
        for (let i = 0; i < weightTicks.length; i++) {
          const value = weightTicks[i];
          const y = Math.round(weightToY(value)) + 0.5;
          ctx.beginPath();
          ctx.moveTo(marginLeft - 6, y);
          ctx.lineTo(marginLeft, y);
          ctx.strokeStyle = '#aaa';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#fff';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          const labelY = Math.max(minLabelY, Math.min(maxLabelY, y));
          ctx.fillText(String(value), marginLeft - 10, labelY);
        }
      }

      ctx.font = '11px sans-serif';
      for (let i = 0; i < repTicks.length; i++) {
        const value = repTicks[i];
        const y = Math.round(repsToY(value)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(w - marginRight, y);
        ctx.lineTo(w - marginRight + 6, y);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const labelY = Math.max(minLabelY, Math.min(maxLabelY, y));
        ctx.fillText(String(value), w - marginRight + 10, labelY);
      }

      ctx.textBaseline = 'alphabetic';

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText('Weight', marginLeft - 8, marginTop - 10);

      ctx.textAlign = 'left';
      ctx.fillText('Reps', w - marginRight + 10, marginTop - 10);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('Date', w / 2, h - 18);
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
.strength-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #ecf3ff;
  font-size: 0.92em;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.legend-line {
  width: 16px;
  height: 2px;
  background: #fff;
  display: inline-block;
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
  .strength-legend {
    gap: 6px;
  }
  .legend-chip {
    font-size: 0.86em;
    padding: 3px 7px;
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
