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

  // 6. iOS Install Guide Prompt for PWA
  function initIosInstallPrompt() {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.platform) || 
                  (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    
    if (!isIOS) return;

    // Detect Standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    // Check localStorage
    const dismissUntil = localStorage.getItem('yagssoog_ios_prompt_dismissed_until');
    if (dismissUntil && Date.now() < parseInt(dismissUntil)) {
      return;
    }

    // Detect Safari (iOS Chrome and others use 'crios', 'fxios', etc.)
    const isSafari = /^((?!chrome|android|crios|fxios|optios|ucbrowser).)*safari/i.test(navigator.userAgent);

    // Inject custom CSS to guarantee perfect layout, centering, and slide-up animation regardless of Tailwind CDN dynamic compilation
    if (!document.getElementById('ios-install-prompt-style')) {
      const style = document.createElement('style');
      style.id = 'ios-install-prompt-style';
      style.textContent = `
        #ios-install-prompt {
          position: fixed;
          bottom: 96px;
          left: 50%;
          transform: translate(-50%, 24px);
          width: 90%;
          max-width: 380px;
          background-color: #ffffff;
          border: 1px solid rgba(218, 194, 178, 0.4);
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          padding: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: iosPromptSlideUp 0.3s ease-out forwards;
        }
        @keyframes iosPromptSlideUp {
          from {
            transform: translate(-50%, 24px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Create dialog container
    const promptDiv = document.createElement('div');
    promptDiv.id = 'ios-install-prompt';
    promptDiv.className = 'bg-white border border-outline-variant/30 rounded-2xl shadow-2xl p-5 space-y-3';
    
    window.dismissIosPrompt = function(dontShowAgain) {
      if (dontShowAgain) {
        // Hide for 3 days
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        localStorage.setItem('yagssoog_ios_prompt_dismissed_until', (Date.now() + threeDays).toString());
      }
      const el = document.getElementById('ios-install-prompt');
      if (el) el.remove();
    };

    if (isSafari) {
      promptDiv.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-xl" style="font-variation-settings: 'FILL' 1;">lightbulb</span>
            <h4 class="font-bold text-sm text-on-surface">아이폰 홈 화면에 추가하기</h4>
          </div>
          <button onclick="dismissIosPrompt(false)" class="text-outline hover:text-on-surface">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <p class="text-xs text-on-surface-variant leading-relaxed">
          약쏘옥을 앱처럼 편리하게 사용하려면 홈 화면에 추가해 보세요! <b>아이폰 사용자(Safari 브라우저)는</b> 아래 순서대로 진행하시면 됩니다.
        </p>
        <div class="bg-surface-container-low p-3 rounded-xl space-y-2 text-xs text-on-surface-variant">
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">1</span>
            <span>하단 툴바의 <b>공유 버튼 <span class="inline-block px-1 bg-white border rounded">📤</span></b>을 누릅니다.</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">2</span>
            <span>메뉴를 올려 <b>'홈 화면에 추가'</b>를 선택합니다.</span>
          </div>
        </div>
        <div class="flex justify-between items-center pt-1">
          <button onclick="dismissIosPrompt(true)" class="text-[11px] text-outline underline hover:text-primary">3일 동안 보지 않기</button>
          <button onclick="dismissIosPrompt(false)" class="bg-primary text-white text-[11px] px-3.5 py-1.5 rounded-lg font-bold">확인</button>
        </div>
      `;
    } else {
      // iOS but not Safari (Chrome, KakaoTalk, etc.)
      promptDiv.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-error text-xl" style="font-variation-settings: 'FILL' 1;">warning</span>
            <h4 class="font-bold text-sm text-on-surface">아이폰 사용자는 Safari 브라우저로 열어주세요</h4>
          </div>
          <button onclick="dismissIosPrompt(false)" class="text-outline hover:text-on-surface">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <p class="text-xs text-on-surface-variant leading-relaxed">
          아이폰에서는 <b>Safari 브라우저</b>를 통해서만 홈 화면 설치(PWA)가 가능합니다.
        </p>
        <div class="bg-surface-container-low p-3 rounded-xl space-y-1.5 text-xs text-on-surface-variant">
          <p>1. 현재 주소를 복사해 주세요.</p>
          <p class="bg-white px-2 py-1 rounded border border-outline-variant/30 text-[10px] break-all select-all font-mono">${window.location.href}</p>
          <p class="pt-1">2. <b>Safari 앱</b>을 실행하고 주소창에 붙여넣어 접속하세요.</p>
        </div>
        <div class="flex justify-between items-center pt-1">
          <button onclick="dismissIosPrompt(true)" class="text-[11px] text-outline underline hover:text-primary">3일 동안 보지 않기</button>
          <button onclick="dismissIosPrompt(false)" class="bg-primary text-white text-[11px] px-3.5 py-1.5 rounded-lg font-bold">확인</button>
        </div>
      `;
    }

    document.body.appendChild(promptDiv);
  }

  // Run on DOMContentLoaded or immediate load if ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIosInstallPrompt);
  } else {
    initIosInstallPrompt();
  }
})();

