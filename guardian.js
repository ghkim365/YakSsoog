// ==========================================
// YakSsoog Guardian Safety Notification
// guardian.js — 보호자 안심 알림 모듈
// ==========================================
// 역할: 복약 미확인 시 보호자에게 카카오 링크 메시지(Web SMS fallback) 발송
// 설계: app.js 최소 수정, 독립 모듈로 동작
// ==========================================

(function() {
  'use strict';

  const GUARDIAN_KEY_PHONE   = 'yagssoog_guardian_phone';
  const GUARDIAN_KEY_ENABLED = 'yagssoog_guardian_enabled';
  const GUARDIAN_KEY_LAST    = 'yagssoog_guardian_last_sent_date';
  const CHECK_DELAY_MS       = 30 * 60 * 1000; // 30분 후 미복용 시 발송

  // ──────────────────────────────────────────
  // 1. 외부 hook: app.js의 toggleMedTaken 호출 후 가로채기
  //    app.js가 window.onMedTakenChange 를 호출하면 여기서 처리
  // ──────────────────────────────────────────
  window.onMedTakenChange = function(medId, taken, medName) {
    if (!isGuardianEnabled()) return;

    if (taken) {
      // 복약 완료 → 오늘 복약 완료 알림 발송 (즉시)
      const phone = getGuardianPhone();
      if (phone) {
        sendGuardianMessage(
          phone,
          `✅ [약쏘옥] 복약 확인\n` +
          `${medName}을(를) 방금 복용했습니다.\n` +
          `오늘도 건강하게 챙겨드셨어요! 😊`
        );
      }
      cancelPendingGuardianCheck(medId);
    } else {
      // 복약 취소 → 30분 후 미확인 시 발송 예약
      scheduleMissedDoseAlert(medId, medName);
    }
  };

  // ──────────────────────────────────────────
  // 2. 30분 후 미복용 경보 예약
  // ──────────────────────────────────────────
  const pendingTimers = {};

  function scheduleMissedDoseAlert(medId, medName) {
    cancelPendingGuardianCheck(medId);

    pendingTimers[medId] = setTimeout(() => {
      const phone = getGuardianPhone();
      if (!phone || !isGuardianEnabled()) return;

      // 현재도 여전히 미복용인지 재확인
      const meds = JSON.parse(localStorage.getItem('yagssoog_med_list') || '[]');
      const med  = meds.find(m => m.id === medId);
      if (med && !med.taken) {
        sendGuardianMessage(
          phone,
          `⚠️ [약쏘옥] 복약 미확인 알림\n` +
          `${medName}을(를) 아직 복용하지 않으셨습니다.\n` +
          `어르신의 복약 여부를 직접 확인해 주세요.`
        );
      }
      delete pendingTimers[medId];
    }, CHECK_DELAY_MS);
  }

  function cancelPendingGuardianCheck(medId) {
    if (pendingTimers[medId]) {
      clearTimeout(pendingTimers[medId]);
      delete pendingTimers[medId];
    }
  }

  // ──────────────────────────────────────────
  // 3. 메시지 발송 (run.py /api/guardian/send → Web SMS fallback)
  // ──────────────────────────────────────────
  async function sendGuardianMessage(phone, message) {
    const today = new Date().toDateString();
    const lastSent = localStorage.getItem(GUARDIAN_KEY_LAST);
    
    // 하루 최대 1회 발송 제한 (스팸 방지)
    if (lastSent === today) {
      console.log('[Guardian] 오늘 이미 발송됨 — 중복 발송 차단');
      return;
    }

    try {
      const res = await fetch('http://127.0.0.1:8001/api/guardian/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message }),
        signal: AbortSignal.timeout(3000)
      });

      if (res.ok) {
        localStorage.setItem(GUARDIAN_KEY_LAST, today);
        showGuardianToast('📨 보호자에게 알림을 발송했습니다.');
        console.log('[Guardian] 발송 성공:', phone, message);
      } else {
        throw new Error('서버 오류');
      }
    } catch (e) {
      console.warn('[Guardian] 서버 미연결 — 공유/전화/문자 모달 fallback:', e.message);
      showGuardianToast('⚠️ 알림 서버 미연결. 직접 알림 전송 창을 엽니다...');
      setTimeout(() => {
        showGuardianShareDialog(phone, message);
      }, 1000);
    }
  }

  // ──────────────────────────────────────────
  // 4. 테스트 발송 (설정 화면 "테스트 발송" 버튼용)
  // ──────────────────────────────────────────
  window.testGuardianAlert = async function() {
    if (!isGuardianEnabled()) {
      showGuardianToast('보호자 알림이 꺼져 있습니다. 먼저 켜주세요.');
      return;
    }
    const phone = getGuardianPhone();
    if (!phone) {
      showGuardianToast('보호자 연락처를 먼저 저장해 주세요.');
      return;
    }
    // 하루 제한 임시 해제 후 테스트
    localStorage.removeItem(GUARDIAN_KEY_LAST);
    await sendGuardianMessage(
      phone,
      `🧪 [약쏘옥] 보호자 알림 테스트\n` +
      `이 메시지는 테스트용입니다.\n` +
      `실제 미복용 시 이런 형태로 알림이 발송됩니다.`
    );
  };

  // ──────────────────────────────────────────
  // 5. 토글 상태 동기화 (설정 탭 UI와 연동)
  // ──────────────────────────────────────────
  window.toggleGuardianAlert = function() {
    const toggleBtn    = document.getElementById('guardian-toggle');
    const toggleCircle = document.getElementById('guardian-toggle-circle');
    const phoneContainer = document.getElementById('guardian-phone-container');
    const statusBadge  = document.getElementById('guardian-status-badge');

    if (!toggleBtn) return;

    const isEnabled = localStorage.getItem(GUARDIAN_KEY_ENABLED) === 'true';
    const next = !isEnabled;
    localStorage.setItem(GUARDIAN_KEY_ENABLED, next);

    if (next) {
      toggleBtn.classList.replace('bg-outline-variant', 'bg-primary');
      toggleCircle?.classList.replace('translate-x-0', 'translate-x-6');
      phoneContainer?.classList.remove('hidden');
      if (statusBadge) statusBadge.textContent = '켜짐';
      showGuardianToast('보호자 안심 알림이 켜졌습니다. 📱');
    } else {
      toggleBtn.classList.replace('bg-primary', 'bg-outline-variant');
      toggleCircle?.classList.replace('translate-x-6', 'translate-x-0');
      phoneContainer?.classList.add('hidden');
      if (statusBadge) statusBadge.textContent = '꺼짐';
      showGuardianToast('보호자 안심 알림이 꺼졌습니다.');
    }
  };

  window.saveGuardianPhone = function() {
    const input = document.getElementById('guardian-phone-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val || !/^01\d{1}-?\d{3,4}-?\d{4}$/.test(val.replace(/-/g, '').padStart(10, '0'))) {
      showGuardianToast('올바른 전화번호를 입력해 주세요. (예: 010-1234-5678)');
      return;
    }
    localStorage.setItem(GUARDIAN_KEY_PHONE, val);
    showGuardianToast('✅ 보호자 연락처가 저장되었습니다!');
  };

  // ──────────────────────────────────────────
  // 6. UI 초기화 (페이지 로드 시)
  // ──────────────────────────────────────────
  function initGuardianUI() {
    const isEnabled    = isGuardianEnabled();
    const savedPhone   = getGuardianPhone();
    const toggleBtn    = document.getElementById('guardian-toggle');
    const toggleCircle = document.getElementById('guardian-toggle-circle');
    const phoneContainer = document.getElementById('guardian-phone-container');
    const phoneInput   = document.getElementById('guardian-phone-input');
    const statusBadge  = document.getElementById('guardian-status-badge');

    if (!toggleBtn) return;

    if (isEnabled) {
      toggleBtn.className = toggleBtn.className.replace('bg-outline-variant', 'bg-primary');
      toggleCircle?.classList.add('translate-x-6');
      toggleCircle?.classList.remove('translate-x-0');
      phoneContainer?.classList.remove('hidden');
      if (statusBadge) statusBadge.textContent = '켜짐';
    } else {
      if (statusBadge) statusBadge.textContent = '꺼짐';
    }

    if (phoneInput && savedPhone) {
      phoneInput.value = savedPhone;
    }
  }

  // ──────────────────────────────────────────
  // 7. 유틸리티
  // ──────────────────────────────────────────
  function isGuardianEnabled() {
    return localStorage.getItem(GUARDIAN_KEY_ENABLED) === 'true';
  }

  function getGuardianPhone() {
    return localStorage.getItem(GUARDIAN_KEY_PHONE) || '';
  }

  function showGuardianToast(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
    } else {
      console.log('[Guardian Toast]', msg);
    }
  }

  // DOMContentLoaded 이후 UI 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuardianUI);
  } else {
    initGuardianUI();
  }

  // ──────────────────────────────────────────
  // 8. Web Share API & Direct SMS/Call Fallback Dialog
  // ──────────────────────────────────────────
  function showGuardianShareDialog(phone, message) {
    // If a modal already exists, remove it
    const existing = document.getElementById('guardian-share-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'guardian-share-modal';
    // Style with transition-opacity and translate classes
    modal.className = "absolute inset-0 bg-black/60 z-[100] flex items-end justify-center select-none opacity-0 transition-opacity duration-300";
    
    // Choose styling that fits inside the phone-shadow container
    modal.innerHTML = `
      <div class="w-full bg-background rounded-t-[28px] p-6 space-y-5 border-t border-outline-variant/30 shadow-2xl translate-y-full transition-transform duration-300 ease-out">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
              <span class="material-symbols-outlined text-[24px]">family_restroom</span>
            </div>
            <div>
              <h3 class="font-headline-md text-[18px] text-on-surface font-bold">보호자 안심 알림</h3>
              <p class="text-[11px] text-on-surface-variant font-medium">직접 알림 전송</p>
            </div>
          </div>
          <button id="guardian-share-close" class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline active:scale-90 transition-transform">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        <p class="text-xs text-on-surface-variant leading-relaxed">
          알림 서버가 연결되지 않았습니다. 아래 버튼을 눌러 보호자에게 복약 소식을 전해 주세요.
        </p>

        <!-- Message Preview Box -->
        <div class="bg-surface-container-low p-4 rounded-xl border border-outline-variant/15 text-xs text-on-surface-variant font-medium whitespace-pre-wrap leading-relaxed">${message}</div>

        <!-- Buttons -->
        <div class="flex flex-col gap-2 pt-1">
          <button id="guardian-share-btn" class="w-full h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md">
            <span class="material-symbols-outlined text-lg">share</span>
            카카오톡/문자 앱으로 공유
          </button>
          
          <div class="grid grid-cols-2 gap-2">
            <button id="guardian-call-btn" class="w-full h-11 bg-surface-container border border-outline-variant/30 text-on-surface font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs active:scale-[0.98] transition-all">
              <span class="material-symbols-outlined text-sm">call</span>
              전화 연결
            </button>
            <button id="guardian-sms-btn" class="w-full h-11 bg-surface-container border border-outline-variant/30 text-on-surface font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs active:scale-[0.98] transition-all">
              <span class="material-symbols-outlined text-sm">sms</span>
              문자 보내기
            </button>
          </div>
        </div>
      </div>
    `;

    // Append to mockup container if exists, otherwise to body
    const appContainer = document.querySelector('.phone-shadow') || document.body;
    if (appContainer !== document.body) {
      modal.style.position = 'absolute';
    } else {
      modal.style.position = 'fixed';
    }
    
    appContainer.appendChild(modal);

    // Trigger animations
    setTimeout(() => {
      modal.classList.add('opacity-100');
      modal.classList.remove('opacity-0');
      const card = modal.querySelector('.transition-transform');
      if (card) {
        card.classList.remove('translate-y-full');
        card.classList.add('translate-y-0');
      }
    }, 10);

    const closeModal = () => {
      modal.classList.remove('opacity-100');
      modal.classList.add('opacity-0');
      const card = modal.querySelector('.transition-transform');
      if (card) {
        card.classList.remove('translate-y-0');
        card.classList.add('translate-y-full');
      }
      setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector('#guardian-share-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Share Button Handler
    modal.querySelector('#guardian-share-btn').addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: '약쏘옥 복약 알림',
            text: message
          });
          const today = new Date().toDateString();
          localStorage.setItem(GUARDIAN_KEY_LAST, today);
          showGuardianToast('✅ 공유되었습니다.');
          closeModal();
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Web Share API error:', err);
            showGuardianToast('❌ 공유 중 오류가 발생했습니다.');
          }
        }
      } else {
        // Fallback: trigger direct SMS protocol
        triggerDirectSMS(phone, message);
        closeModal();
      }
    });

    // Call Button Handler
    modal.querySelector('#guardian-call-btn').addEventListener('click', () => {
      window.location.href = `tel:${phone.replace(/-/g, '')}`;
      closeModal();
    });

    // SMS Button Handler
    modal.querySelector('#guardian-sms-btn').addEventListener('click', () => {
      triggerDirectSMS(phone, message);
      closeModal();
    });
  }

  function triggerDirectSMS(phone, message) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const separator = isIOS ? '&' : '?';
    window.location.href = `sms:${phone.replace(/-/g, '')}${separator}body=${encodeURIComponent(message)}`;
    const today = new Date().toDateString();
    localStorage.setItem(GUARDIAN_KEY_LAST, today);
    showGuardianToast('💬 문자 메시지 화면으로 연결합니다.');
  }

})();
