<template>
  <div class="floating-timer" :class="{ 'active': isActive }">
    <div class="timer-display">{{ formattedTime }}</div>
    <div class="timer-controls">
      <button 
        v-if="notificationsAvailable && !notificationsEnabled"
        class="timer-btn notify-btn" 
        @click="handleNotificationRequest"
        title="Enable notifications for timer alerts"
      >
        🔔
      </button>
      <button class="timer-btn start-btn" @click="handleStartClick" :title="isActive ? 'Pause' : 'Start'">
        {{ isActive ? '⏸' : '▶' }}
      </button>
      <button class="timer-btn reset-btn" @click="handleResetClick" title="Reset">
        ↺
      </button>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted } from 'vue'

export default {
  name: 'FloatingTimer',
  props: {
    seconds: {
      type: Number,
      required: true
    },
    isActive: {
      type: Boolean,
      required: true
    }
  },
  emits: ['start-timer', 'reset-timer', 'request-notifications'],
  setup(props, { emit }) {
    const formattedTime = computed(() => {
      const minutes = Math.floor(props.seconds / 60)
      const secs = props.seconds % 60
      return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    })

    const handleStartClick = () => {
      emit('start-timer')
    }

    const handleResetClick = () => {
      emit('reset-timer')
    }

    const notificationsAvailable = ref('Notification' in window)
    const notificationsEnabled = ref(false)

    const handleNotificationRequest = () => {
      if ('Notification' in window) {
        console.log('User clicked notification button, requesting permission...')
        Notification.requestPermission().then((permission) => {
          console.log('Notification permission result:', permission)
          notificationsEnabled.value = permission === 'granted'
          emit('request-notifications', permission)
        })
      }
    }

    onMounted(() => {
      if ('Notification' in window) {
        notificationsEnabled.value = Notification.permission === 'granted'
        console.log('Notifications available. Current permission:', Notification.permission)
      }
    })

    return {
      formattedTime,
      handleStartClick,
      handleResetClick,
      handleNotificationRequest,
      notificationsAvailable,
      notificationsEnabled
    }
  }
}
</script>

<style scoped>
.floating-timer {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 110px;
  max-width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.floating-timer.active {
  background: rgba(76, 175, 80, 0.95);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.4);
}

.timer-display {
  font-size: 1.8em;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #333;
  letter-spacing: 0.05em;
  min-height: 1.2em;
  line-height: 1;
}

.floating-timer.active .timer-display {
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.timer-controls {
  display: flex;
  gap: 6px;
  width: 100%;
  justify-content: center;
}

.timer-btn {
  flex: 1;
  min-width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.1);
  color: #333;
  font-size: 1.1em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.2s ease;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.floating-timer.active .timer-btn {
  background: rgba(255, 255, 255, 0.3);
  color: white;
}

.timer-btn:active {
  transform: scale(0.95);
  background: rgba(0, 0, 0, 0.2);
}

.floating-timer.active .timer-btn:active {
  background: rgba(255, 255, 255, 0.4);
}

/* Ensure minimum tap target size for mobile (44px) */
.timer-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  pointer-events: none;
}

.notify-btn {
  background: rgba(255, 193, 7, 0.2) !important;
  color: #ff9800 !important;
  animation: pulse 2s infinite;
}

.notify-btn:hover {
  background: rgba(255, 193, 7, 0.4) !important;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(255, 152, 0, 0);
  }
}

/* iPhone 8 specific adjustments (max 375px width) */
@media screen and (max-width: 380px) {
  .floating-timer {
    bottom: 15px;
    right: 15px;
    padding: 10px 14px;
    min-width: 100px;
    max-width: 130px;
  }

  .timer-display {
    font-size: 1.6em;
  }

  .timer-btn {
    min-width: 32px;
    height: 32px;
    font-size: 1em;
  }
}

/* Prevent layout shift in notched devices */
@supports (padding: max(0px)) {
  .floating-timer {
    bottom: max(20px, env(safe-area-inset-bottom, 20px));
    right: max(20px, env(safe-area-inset-right, 20px));
  }
  
  @media screen and (max-width: 380px) {
    .floating-timer {
      bottom: max(15px, env(safe-area-inset-bottom, 15px));
      right: max(15px, env(safe-area-inset-right, 15px));
    }
  }
}
</style>
