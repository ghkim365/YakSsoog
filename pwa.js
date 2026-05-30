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

  // 4. Test Notification function (Delayed by 3 seconds so user can lock/close app)
  window.testNotification = function() {
    if (Notification.permission !== 'granted') {
      alert("알림 권한을 먼저 허용해 주셔야 테스트를 진행할 수 있습니다.");
      return;
    }

    showToast("🔔 4초 후 백그라운드 알림이 울립니다. 화면을 잠그거나 앱을 닫고 기다려 보세요!");
    
    setTimeout(() => {
      window.triggerLocalNotification(
        "💊 [약쏘옥] 복용 알람 테스트",
        "테스트용 알람입니다! 약 먹을 시간입니다. 약을 드시고 기록해 주세요."
      );
    }, 4000);
  };
})();
