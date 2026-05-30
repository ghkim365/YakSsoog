// ==========================================
// YakSsoog (약쏘옥) PWA & Background Notification Manager
// ==========================================

(function() {
  let swRegistration = null;

  // 1. Register Service Worker on load
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          swRegistration = registration;
          console.log('SW: Registered successfully with scope:', registration.scope);
          updatePermissionUI();
        })
        .catch((error) => {
          console.error('SW: Registration failed:', error);
        });
    });
  }

  // 2. Request Notification Permission
  window.requestNotificationPermission = async function() {
    if (!('Notification' in window)) {
      alert("이 브라우저는 시스템 알림 기능을 지원하지 않습니다.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      updatePermissionUI();
      if (permission === 'granted') {
        showToast("🔔 알림 권한이 승인되었습니다!");
        // Play small feedback vibration
        if (navigator.vibrate) navigator.vibrate(100);
      } else {
        alert("알림 권한이 거부되었습니다. 기기 설정에서 알림을 허용해 주세요.");
      }
    } catch (e) {
      console.warn("Failed to request notification permission:", e);
    }
  };

  // Update Notification UI elements dynamically
  function updatePermissionUI() {
    const statusText = document.getElementById('notif-permission-status');
    const requestBtn = document.getElementById('notif-request-btn');
    
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      if (statusText) statusText.innerText = "승인 완료 (작동 중)";
      if (requestBtn) {
        requestBtn.className = "btn-active-depress px-4 py-2 bg-success text-white font-bold rounded-xl text-xs flex items-center gap-1 active:scale-95 transition-all cursor-default opacity-80 pointer-events-none";
        requestBtn.innerHTML = `<span class="material-symbols-outlined text-sm">check</span>승인됨`;
      }
    } else if (Notification.permission === 'denied') {
      if (statusText) statusText.innerText = "차단됨 (설정 필요)";
      if (requestBtn) {
        requestBtn.innerText = "권한 재요청";
      }
    } else {
      if (statusText) statusText.innerText = "승인 필요";
    }
  }

  // 3. Global Notification Trigger (Sends message to Service Worker for background alert)
  window.triggerLocalNotification = function(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.log("SW Notification: Permission not granted or not supported.");
      return;
    }

    // Attempt through Active Service Worker for background execution
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TRIGGER_NOTIFICATION',
        title: title,
        body: body
      });
    } else {
      // Fallback: direct notification if SW is not active yet
      new Notification(title, {
        body: body,
        icon: '/assets/YakSsoog_logo_500x500.png',
        badge: '/assets/YakSsoog_logo_500x500.png',
        vibrate: [200, 100, 200]
      });
    }
  };

  // 4. Reschedule all active alarms using the Notification Triggers API
  window.rescheduleAllAlarms = async function() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.log("SW rescheduleAllAlarms: Notification permission not granted.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Cancel/clear all existing scheduled alarms
      const notifications = await registration.getNotifications({ includeTriggered: true });
      notifications.forEach(notification => {
        if (notification.tag && notification.tag.startsWith('yagssoog-pill-alarm-')) {
          notification.close();
        }
      });
      console.log("SW rescheduleAllAlarms: Cleared previous scheduled alarms.");

      // Fetch current active alarms from localStorage
      const savedAlarms = localStorage.getItem('yagssoog_alarm_list');
      if (!savedAlarms) return;
      const alarmsList = JSON.parse(savedAlarms);

      // Check if browser supports showTrigger
      const supportsTrigger = 'showTrigger' in Notification.prototype;

      alarmsList.forEach(alarm => {
        if (alarm.active) {
          const timestamp = getNextAlarmTimestamp(alarm);
          const title = `💊 [약쏘옥] ${alarm.medName} 복용 시간!`;
          const body = `${alarm.medName}을(를) 복용할 시간입니다. 약을 복용하고 체크해 주세요.`;

          if (supportsTrigger) {
            // Schedule using Notification Trigger API
            registration.showNotification(title, {
              body: body,
              icon: '/assets/YakSsoog_logo_500x500.png',
              badge: '/assets/YakSsoog_logo_500x500.png',
              vibrate: [200, 100, 200],
              tag: `yagssoog-pill-alarm-${alarm.id}`,
              showTrigger: new TimestampTrigger(timestamp),
              requireInteraction: true,
              data: { url: '/' }
            });
            console.log(`Scheduled: "${alarm.medName}" for ${new Date(timestamp).toLocaleString()} (Timestamp: ${timestamp})`);
          } else {
            console.warn("NotificationTrigger is not supported on this browser. Scheduling falls back to active client polling.");
          }
        }
      });
    } catch (e) {
      console.error("SW rescheduleAllAlarms error:", e);
    }
  };

  // Helper to calculate the next trigger timestamp
  function getNextAlarmTimestamp(alarm) {
    const now = new Date();
    const [hourStr, minStr] = alarm.time.split(':');
    let hour = parseInt(hourStr);
    const min = parseInt(minStr);
    
    if (alarm.period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (alarm.period === 'AM' && hour === 12) {
      hour = 0;
    }
    
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0, 0);
    // If the time has already passed today, set it for tomorrow
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    return targetDate.getTime();
  }

  // 5. Test Notification function (Scheduled 5 seconds in the future using TimestampTrigger)
  window.testNotification = async function() {
    if (Notification.permission !== 'granted') {
      alert("알림 권한을 먼저 허용해 주셔야 테스트를 진행할 수 있습니다.");
      return;
    }

    showToast("🔔 5초 후 백그라운드 알림이 울립니다. 화면을 잠그거나 앱을 닫고 기다려 보세요!");
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const triggerTime = Date.now() + 5000; // 5 seconds from now
      
      if ('showTrigger' in Notification.prototype) {
        await registration.showNotification("💊 [약쏘옥] 복용 알람 테스트", {
          body: "테스트용 알람입니다! 약 먹을 시간입니다. 약을 드시고 기록해 주세요.",
          icon: '/assets/YakSsoog_logo_500x500.png',
          badge: '/assets/YakSsoog_logo_500x500.png',
          vibrate: [200, 100, 200],
          tag: 'yagssoog-test-alarm',
          showTrigger: new TimestampTrigger(triggerTime),
          requireInteraction: true,
          data: { url: '/' }
        });
        console.log("Test notification scheduled with Trigger API for +5s.");
      } else {
        // Fallback to normal setTimeout if Notification Triggers are not supported
        console.warn("NotificationTrigger not supported, falling back to setTimeout.");
        setTimeout(() => {
          window.triggerLocalNotification(
            "💊 [약쏘옥] 복용 알람 테스트",
            "테스트용 알람입니다! 약 먹을 시간입니다. 약을 드시고 기록해 주세요."
          );
        }, 5000);
      }
    } catch (e) {
      console.error("Test notification scheduling failed:", e);
    }
  };
})();
