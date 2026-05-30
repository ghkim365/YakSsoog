// ==========================================
// YakSsoog (약쏘옥) Core Application Script
// ==========================================

// Initial default medication data matching the design system templates
const DEFAULT_MEDICATIONS = [
  {
    id: 1,
    name: "고혈압약 (아모디핀)",
    company: "유한양행",
    expiry: "2026.12",
    time: "오전 8시",
    instruction: "식후 30분",
    category: "혈압 관리",
    taken: true,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAzliNaUTv398ZvxoEczed4KKO3VV2D8vkf6_Uc_HfL3qFVe4S5yoF02SdQZO5iTik74Lz46wy3NYDc_IovTwd4xQexEeOEdgBbKSld8EwAIXzcfKT7G_dvB2E9kgEplMy0q1PM1ZmHZttapcHs-tJQhnpWVayml7e5uANHp3QfqTuUFhyt59RIfB3IZ3CrZE_JZZotYJl6jMcJ1d4uQICNgTOzuTWQnZaLSpH2UGHzh6gK2GOOqdDBmllp1g6AYPLOke9wSDx1RrMw"
  },
  {
    id: 2,
    name: "당뇨약 (메트포르민)",
    company: "종근당",
    expiry: "2027.03",
    time: "오후 1시",
    instruction: "식후 즉시",
    category: "당뇨 관리",
    taken: true,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZYaANYs749Dcz-CgWIhhtFy3gDiGxFDFpFLW7IP42k9gkRXJf0ERWOdtjuNFHURY6l-0rkpPbgtEcFG0AfzmwqXaAUPS2jsLRJ5vGUI6iDKFkVdjT8UTNWwiKvMn8yGBcexr2t49Pdz9QAxFj4fJ4k7f2MzIg7S08l526c6XsyHv7ZGoaVaE4hK8dMkrncTmDjgiQgLjf_Gm_vWdgQoMxsrSdO7M02tRjm1zFfXXwZYilsD4BgV5t4dvKDpmczk_x9VJ0PO8A5Yky"
  },
  {
    id: 3,
    name: "비타민D 보충제",
    company: "종합비타민",
    expiry: "2026.07", // Near-expiry date (Current is May 2026)
    time: "오후 6시",
    instruction: "식사와 함께",
    category: "영양제",
    taken: false,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDorrakPQnK9Gj1awftVNZjHf8W-3LqhdyNEN7zbBd9Tjj_J_8R61SqDbglgmj75o5GTreXrzt-BoZhQLcCWg9hyPq10xESPayX9Z4hQzV-8PVyC0O1LfMcNToOOTYNElmD6aZfDwASWsJQDXXdgTX5DL8iT84brdQ9FuMtFnsuD2FTSJUqxo2NKsK8QVOOdbp07muwG3c6pXTFlIcXZpl6AUGE35uuDncnxJzXDQlGBSDb-WvJPunW8F7SezZxx7artEIQvPf6oLf"
  }
];

// Default Alarm settings matching _4/code.html mockups
const DEFAULT_ALARMS = [
  {
    id: 1,
    medName: "혈압약 (아모디핀)",
    time: "08:00",
    period: "AM",
    active: true,
    soundType: "elderly",
    icon: "pill",
    color: "primary"
  },
  {
    id: 2,
    medName: "종합 비타민",
    time: "12:30",
    period: "PM",
    active: false,
    soundType: "normal",
    icon: "medication",
    color: "secondary"
  },
  {
    id: 3,
    medName: "수면 보조제",
    time: "10:00",
    period: "PM",
    active: true,
    soundType: "melody",
    icon: "nightlight",
    color: "tertiary"
  }
];

// App State Cache
let medications = [];
let alarms = [];
let activeTab = 'home';
let currentFontScale = 2; // Default: 2 (Large)
let repeatSettings = { enabled: false, interval: 10, count: 5 };

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  initDate();
  loadAppState();
  renderMedications();
  updateProgress();
  setupEventListeners();
  switchTab('home'); // Ensure Home page is shown initially
});

// Update Dates dynamically based on Current Local Time (e.g. 2026-05-30)
function initDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1; // 1-based
  const d = today.getDate();

  // Format Korean Weekdays
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = daysOfWeek[today.getDay()];

  const formattedBadgeDate = `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
  const badgeEl = document.getElementById('badge-date');
  if (badgeEl) {
    badgeEl.innerText = formattedBadgeDate;
  }
  updateHeaderForTab(activeTab);
}

// Load medications and settings from LocalStorage
function loadAppState() {
  const savedMeds = localStorage.getItem('yagssoog_med_list');
  if (savedMeds) {
    medications = JSON.parse(savedMeds);
  } else {
    medications = [...DEFAULT_MEDICATIONS];
    saveAppState();
  }
  
  // Load Alarms state
  const savedAlarms = localStorage.getItem('yagssoog_alarm_list');
  if (savedAlarms) {
    alarms = JSON.parse(savedAlarms);
    // ── 마이그레이션: 구버전 'child' → 'melody' ──
    let migrated = false;
    alarms.forEach(a => { if (a.soundType === 'child') { a.soundType = 'melody'; migrated = true; } });
    if (migrated) saveAlarmsState();
  } else {
    alarms = [...DEFAULT_ALARMS];
    saveAlarmsState();
  }
  renderAlarms();
  
  const savedFontScale = localStorage.getItem('yagssoog_font_scale');
  if (savedFontScale) {
    currentFontScale = parseInt(savedFontScale);
    const slider = document.getElementById('fontSizeSlider');
    if (slider) slider.value = currentFontScale;
  }
  applyFontScale(currentFontScale);

  // Load Guardian configuration state
  const guardianEnabled = localStorage.getItem('yagssoog_guardian_enabled') === 'true';
  const guardianPhone = localStorage.getItem('yagssoog_guardian_phone') || '';
  
  const toggleBtn = document.getElementById('guardian-toggle');
  const toggleCircle = document.getElementById('guardian-toggle-circle');
  const phoneContainer = document.getElementById('guardian-phone-container');
  const phoneInput = document.getElementById('guardian-phone-input');
  
  if (toggleBtn && toggleCircle && phoneContainer && phoneInput) {
    if (guardianEnabled) {
      toggleBtn.classList.remove('bg-outline-variant');
      toggleBtn.classList.add('bg-primary');
      toggleCircle.classList.remove('translate-x-0');
      toggleCircle.classList.add('translate-x-5');
      phoneContainer.classList.remove('hidden');
    } else {
      toggleBtn.classList.add('bg-outline-variant');
      toggleBtn.classList.remove('bg-primary');
      toggleCircle.classList.add('translate-x-5');
      toggleCircle.classList.remove('translate-x-5');
      toggleCircle.classList.add('translate-x-0');
      phoneContainer.classList.add('hidden');
    }
    phoneInput.value = guardianPhone;
  }

  // Load API Key
  const storedApiKey = localStorage.getItem('yagssoog_api_key') || '';
  const keyInput = document.getElementById('api-key-input');
  if (keyInput) {
    keyInput.value = storedApiKey;
  }

  // Load Notification Repeat Settings
  const savedRepeat = localStorage.getItem('yagssoog_repeat_settings');
  if (savedRepeat) {
    repeatSettings = JSON.parse(savedRepeat);
  }
  updateRepeatSummaryText();
}

// Save medications state
function saveAppState() {
  localStorage.setItem('yagssoog_med_list', JSON.stringify(medications));
}

// Apply font scaling via html root font-size so Tailwind rem classes all scale together
// Scale 1 (보통): 15px  |  Scale 2 (크게): 17px  |  Scale 3 (매우 크게): 20px
const FONT_SCALE_MAP = { 1: '15px', 2: '17px', 3: '20px' };

function applyFontScale(scale) {
  const size = FONT_SCALE_MAP[scale] || '17px';
  document.documentElement.style.fontSize = size;
  currentFontScale = scale;
  localStorage.setItem('yagssoog_font_scale', scale);
}

// Switch tabs and update header/navbar styles
function switchTab(tabId) {
  activeTab = tabId;
  
  // Update view contents visibility
  document.querySelectorAll('.view-content').forEach(view => {
    view.classList.remove('active');
  });
  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) {
    targetView.classList.add('active');
  }
  
  // Update header based on active tab matching stitch specifications
  updateHeaderForTab(tabId);
  
  // Update Bottom Nav Bar styles
  document.querySelectorAll('.nav-btn').forEach(btn => {
    // Reset to unselected classes
    btn.className = "nav-btn flex flex-col items-center justify-center text-on-secondary-fixed-variant hover:bg-surface-container-high transition-colors px-4 py-1 rounded-full active:scale-90 duration-150";
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.style.fontVariationSettings = "'FILL' 0";
    }
  });
  
  // Apply selected classes to current tab
  const activeBtn = document.getElementById(`nav-btn-${tabId}`);
  if (activeBtn) {
    activeBtn.className = "nav-btn flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-6 py-1 active:scale-90 transition-transform duration-150 font-bold";
    const icon = activeBtn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.style.fontVariationSettings = "'FILL' 1";
    }
  }

  if (tabId === 'settings') {
    if (typeof checkAndUpdateBackupStatus === 'function') {
      checkAndUpdateBackupStatus();
    }
  }
}

// Dynamically update the header layout and contents based on the active tab
function updateHeaderForTab(tabId) {
  const headerLeftContainer = document.querySelector('header .flex.items-center.gap-2');
  const headerRightContainer = document.querySelector('header .flex.flex-col.items-end');
  
  if (!headerLeftContainer || !headerRightContainer) return;

  const today = new Date();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  
  // Format Korean Weekdays
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = daysOfWeek[today.getDay()];
  const formattedDate = `${m}월 ${d}일 (${dayName})`;

  if (tabId === 'settings') {
    headerLeftContainer.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border border-outline-variant/30">
        <img alt="Yagssoog Logo" class="w-full h-full object-cover" src="assets/YakSsoog_logo_500x500.png" onerror="this.src='https://img.icons8.com/color/96/pill.png'"/>
      </div>
      <h1 class="font-headline-md text-headline-md-mobile text-primary font-bold">설정</h1>
    `;
    headerRightContainer.innerHTML = `
      <span class="text-on-surface-variant font-semibold text-xs">${formattedDate}</span>
    `;
  } else if (tabId === 'home') {
    headerLeftContainer.innerHTML = `
      <span class="material-symbols-outlined text-primary-container text-3xl" style="font-variation-settings: 'FILL' 1;">medication</span>
      <h1 class="font-headline-md text-headline-md-mobile text-primary font-bold">약쏘옥</h1>
    `;
    
    // Calculate taken status
    const total = medications.length;
    const taken = medications.filter(m => m.taken).length;
    const statusText = `오늘 복용 현황: ${taken}/${total} 완료`;
    
    // Lunar date placeholder
    let lunarText = '';
    try {
      if (typeof KoreanLunarCalendar !== 'undefined') {
        KoreanLunarCalendar.setSolarDate(today.getFullYear(), m, d);
        const lunar = KoreanLunarCalendar.getLunarCalendar();
        const leapMark = lunar.isLeapMonth ? '(윤)' : '';
        lunarText = `음력 ${leapMark}${lunar.month}월 ${lunar.day}일`;
      }
    } catch (e) {}

    headerRightContainer.innerHTML = `
      <span class="text-on-surface-variant font-semibold text-xs">${formattedDate}</span>
      <span class="text-outline text-[10px] font-medium">${lunarText}</span>
      <span class="text-secondary font-bold text-[11px]">${statusText}</span>
    `;
  } else if (tabId === 'scan') {
    headerLeftContainer.innerHTML = `
      <h1 class="font-headline-md text-headline-md-mobile text-primary font-bold">약쏘옥</h1>
    `;
    headerRightContainer.innerHTML = `
      <span class="text-primary font-semibold text-xs">${formattedDate}</span>
    `;
  } else if (tabId === 'alarm') {
    headerLeftContainer.innerHTML = `
      <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary">
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">medical_services</span>
      </div>
      <h1 class="font-headline-md text-headline-md-mobile text-primary font-bold">약쏘옥</h1>
    `;
    headerRightContainer.innerHTML = `
      <span class="text-on-surface-variant font-semibold text-xs">${formattedDate}</span>
    `;
  }
}

// Check if a medication's expiry date is close to current date (less than 3 months away)
function isExpiryImminent(expiryStr) {
  // Expected format: YYYY.MM
  const parts = expiryStr.split('.');
  if (parts.length < 2) return false;
  
  const expYear = parseInt(parts[0]);
  const expMonth = parseInt(parts[1]) - 1; // Month index is 0-based
  
  const expiryDate = new Date(expYear, expMonth, 1);
  const today = new Date();
  
  // Difference in milliseconds
  const diffTime = expiryDate - today;
  // Convert to months (approximate)
  const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.4);
  
  return diffMonths <= 3;
}

// Render dynamic medication card list
function renderMedications() {
  const container = document.getElementById('med-list-container');
  container.innerHTML = '';
  
  let showBanner = false;
  
  medications.forEach(med => {
    const isNearExpiry = isExpiryImminent(med.expiry);
    if (isNearExpiry) showBanner = true;
    
    // Checkbox styling depending on taken status
    const btnClass = med.taken
      ? "w-14 h-14 rounded-full bg-tertiary flex items-center justify-center text-white shadow-md active:scale-90 transition-all border border-tertiary"
      : "w-14 h-14 rounded-full border-4 border-primary-container flex items-center justify-center text-primary-container bg-white shadow-sm active:scale-90 transition-all hover:bg-primary-fixed/20";
      
    const iconName = med.taken ? 'check_circle' : 'radio_button_unchecked';
    const fillStyle = med.taken ? "'FILL' 1" : "'FILL' 0";
    
    // Main card styling container
    const cardEl = document.createElement('div');
    cardEl.className = med.taken
      ? "pill-card-shadow bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 flex items-center gap-4 transition-transform active:scale-[0.98]"
      : "bg-surface-container-lowest border-2 border-primary-container rounded-2xl p-5 flex items-center gap-4 transition-transform active:scale-[0.98] relative overflow-hidden active-pill-glow";
      
    cardEl.innerHTML = `
      ${!med.taken ? '<div class="absolute top-0 right-0 bg-primary-container text-on-primary-container px-3 py-1 rounded-bl-xl font-bold text-xs">다음 복용</div>' : ''}
      <div class="w-16 h-16 rounded-2xl ${med.taken ? 'bg-surface-container-low' : 'bg-primary-fixed/30'} flex items-center justify-center overflow-hidden">
        <img alt="${med.name}" class="w-12 h-12 object-contain" src="${med.img}" onerror="this.src='https://img.icons8.com/color/96/pill.png'"/>
      </div>
      <div class="flex-1">
        <h3 class="font-headline-md text-[18px] text-on-surface leading-tight font-bold">${med.name}</h3>
        <p class="text-on-surface-variant text-sm mt-1 flex items-center gap-1">
          ${med.company} · 만료: ${med.expiry}
          ${isNearExpiry ? `<span class="material-symbols-outlined text-error text-base" style="font-variation-settings: 'FILL' 1;">warning</span>` : ''}
        </p>
        <div class="mt-2 flex items-center gap-2">
          <span class="text-primary font-extrabold text-[16px]">${med.time}</span>
          <span class="bg-secondary-container/30 text-on-secondary-fixed-variant px-2 py-0.5 rounded text-xs font-semibold">${med.instruction}</span>
        </div>
      </div>
      <button class="${btnClass}" onclick="toggleTaken(${med.id})">
        <span class="material-symbols-outlined text-3xl" style="font-variation-settings: ${fillStyle};">${iconName}</span>
      </button>
    `;
    
    container.appendChild(cardEl);
  });
  
  // Show or hide expiry warning banner
  const banner = document.getElementById('expiry-warning-banner');
  if (showBanner) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

// Toggle pill status
window.toggleTaken = function(medId) {
  const med = medications.find(m => m.id === medId);
  if (med) {
    med.taken = !med.taken;
    saveAppState();
    renderMedications();
    updateProgress();
    
    // Simulate haptic feedback on toggle click
    if (window.navigator.vibrate) {
      window.navigator.vibrate(12);
    }
  }
};

// Calculate and render progress header
function updateProgress() {
  updateHeaderForTab(activeTab);
}

// Bind event listeners
function setupEventListeners() {
  // Font Size Slider input listener
  const slider = document.getElementById('fontSizeSlider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      applyFontScale(val);
    });
  }
}

// ==========================================
// [2단계] 약 스캔 & 식약처 API 연계 시뮬레이션
// ==========================================

// Mock Medication Database for scan simulation and search terms
const MOCK_SCAN_DB = {
  1: {
    id: 1,
    name: "고혈압약 (아모디핀)",
    company: "유한양행",
    expiry: "2026.12",
    time: "오전 8시",
    instruction: "식후 30분",
    category: "혈압 관리",
    taken: false,
    price: "약 5,000원",
    guide: "이 약은 혈압을 낮추는 약입니다. 매일 일정한 시간에 복용하는 것이 중요합니다.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3g_ENHplwqqHHynmqhzJUexTWPKIEP7xh7Wf2gYpPoJ3HMIRGdYlYJB52i-5mq3yf8rH4nP05kFzaFHYqrYtxcN2AvCENjTnxNtSrO3qwRsS01YObxpfpim2EZse9tD6QZS6AX26gD6T66aLEGda7sPUcN1XmpZUCXkYhRIvv_snMKH_a5USO2Z_sQop-ePw-JI7AvSSxIym6X2CeiXi3WEghXzrKaUZBJN3097WbTFiZuZEIAl9n6IjGr1ad5-sh3WC4CK8tlKPr"
  },
  2: {
    id: 2,
    name: "당뇨약 (메트포르민)",
    company: "종근당",
    expiry: "2027.03",
    time: "오후 1시",
    instruction: "식후 즉시",
    category: "당뇨 관리",
    taken: false,
    price: "약 4,200원",
    guide: "이 약은 혈당 수치를 낮춰주는 약입니다. 식사 직후에 물과 함께 복용하세요.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZYaANYs749Dcz-CgWIhhtFy3gDiGxFDFpFLW7IP42k9gkRXJf0ERWOdtjuNFHURY6l-0rkpPbgtEcFG0AfzmwqXaAUPS2jsLRJ5vGUI6iDKFkVdjT8UTNWwiKvMn8yGBcexr2t49Pdz9QAxFj4fJ4k7f2MzIg7S08l526c6XsyHv7ZGoaVaE4hK8dMkrncTmDjgiQgLjf_Gm_vWdgQoMxsrSdO7M02tRjm1zFfXXwZYilsD4BgV5t4dvKDpmczk_x9VJ0PO8A5Yky"
  },
  3: {
    id: 3,
    name: "비타민D 보충제",
    company: "종합비타민",
    expiry: "2026.07",
    time: "오후 6시",
    instruction: "식사와 함께",
    category: "영양제",
    taken: false,
    price: "약 12,000원",
    guide: "뼈 건강을 지켜주는 비타민D 복합 영양제입니다. 식사 직후 복용 시 흡수율이 더 높아집니다.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDorrakPQnK9Gj1awftVNZjHf8W-3LqhdyNEN7zbBd9Tjj_J_8R61SqDbglgmj75o5GTreXrzt-BoZhQLcCWg9hyPq10xESPayX9Z4hQzV-8PVyC0O1LfMcNToOOTYNElmD6aZfDwASWsJQDXXdgTX5DL8iT84brdQ9FuMtFnsuD2FTSJUqxo2NKsK8QVOOdbp07muwG3c6pXTFlIcXZpl6AUGE35uuDncnxJzXDQlGBSDb-WvJPunW8F7SezZxx7artEIQvPf6oLf"
  },
  "아스피린": {
    id: 101,
    name: "아스피린정 100mg",
    company: "바이엘코리아",
    expiry: "2027.09",
    time: "오전 8시",
    instruction: "식후 30분",
    category: "심혈관 예방",
    taken: false,
    price: "약 3,500원",
    guide: "혈전 예방 및 소염 진통제입니다. 위장 장애를 예방하기 위해 식사 후 충분한 물과 복용하세요.",
    img: "https://img.icons8.com/color/96/pill.png"
  },
  "타이레놀": {
    id: 102,
    name: "타이레놀정 500mg",
    company: "한국존슨앤드존슨",
    expiry: "2028.01",
    time: "필요시 복용",
    instruction: "공복 가능",
    category: "해열 진통제",
    taken: false,
    price: "약 3,000원",
    guide: "가장 대중적인 아세트아미노펜 진통제입니다. 하루 최대 4g(8정)을 초과해 복용하지 마세요.",
    img: "https://img.icons8.com/color/96/pill.png"
  },
  "0108806538063317": {
    id: 201,
    name: "덴치원캡슐",
    company: "신일제약 (API 보완적용)",
    expiry: "2028.05",
    time: "식전 또는 식간",
    instruction: "1회 2캡슐 (1일 3회)",
    category: "치통 치료제 (생약)",
    taken: false,
    price: "약 4,500원",
    guide: "위열(胃熱)에 의한 치통 완화에 도움을 주는 승마, 목단피, 당귀 등이 함유된 청위산 성분의 생약제제입니다. 식전 또는 식사 사이에 복용하세요.",
    img: "https://img.icons8.com/color/96/pill.png"
  }
};

// Map barcode aliases
MOCK_SCAN_DB["8806538063317"] = MOCK_SCAN_DB["0108806538063317"];
MOCK_SCAN_DB["0108806538063317정"] = MOCK_SCAN_DB["0108806538063317"];
MOCK_SCAN_DB["8806538063317정"] = MOCK_SCAN_DB["0108806538063317"];
MOCK_SCAN_DB["덴치원캡슐"] = MOCK_SCAN_DB["0108806538063317"];
MOCK_SCAN_DB["덴치원"] = MOCK_SCAN_DB["0108806538063317"];

let scanningActive = false;

// Simulate medication package scan
window.simulateScan = function(id) {
  if (scanningActive) return;
  scanningActive = true;
  
  // Update UI to show laser and loading status
  const laser = document.getElementById('scan-laser-line');
  if (laser) {
    laser.classList.add('scanner-line');
  }
  
  // Vibration simulation
  if (window.navigator.vibrate) {
    window.navigator.vibrate([100, 50, 100]);
  }
  
  // Fetch info from mock db
  const data = MOCK_SCAN_DB[id];
  
  // Swap viewfinder background to display simulated drug image
  const imgEl = document.getElementById('scan-viewfinder-img');
  if (imgEl && data) {
    imgEl.src = data.img;
  }
  
  // Show results after simulated scan timeout
  setTimeout(() => {
    renderScanResult(data);
    scanningActive = false;
  }, 1500);
};

// Render result card overlay
function renderScanResult(data) {
  const container = document.getElementById('scan-result-container');
  if (!container) return;
  
  if (!data) {
    container.innerHTML = `
      <div class="bg-surface-container-lowest border border-error/30 rounded-[28px] p-6 shadow-xl space-y-4">
        <div class="flex items-center gap-3 text-error">
          <span class="material-symbols-outlined text-3xl">error</span>
          <h3 class="font-headline-md text-lg font-bold">인식 실패</h3>
        </div>
        <p class="text-sm text-on-surface-variant leading-relaxed">약품 바코드 또는 낱알을 인식하지 못했습니다. 다시 시도해 주세요.</p>
        <button onclick="resetScanView()" class="w-full h-12 bg-surface-container border border-outline-variant/30 text-on-surface font-bold rounded-xl active:scale-95 transition-all">스캔 창으로 돌아가기</button>
      </div>
    `;
    container.classList.remove('hidden');
    document.getElementById('scan-controls-section').classList.add('hidden');
    return;
  }
  
  // Construct dynamic result html matching _3/code.html template
  container.innerHTML = `
    <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-[28px] shadow-2xl p-6 space-y-6 relative animate-slide-up">
      <!-- Pill Identity Header -->
      <div class="flex items-center gap-4">
        <div class="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center p-2 border border-outline-variant/20 pill-float">
          <img alt="${data.name}" class="w-full h-full object-contain" src="${data.img}" onerror="this.src='https://img.icons8.com/color/96/pill.png'"/>
        </div>
        <div class="flex-1">
          <span class="inline-block px-3 py-1 bg-secondary-container/30 text-on-secondary-container rounded-full font-bold text-xs mb-1.5">${data.category}</span>
          <h1 class="font-headline-md text-lg text-on-surface leading-tight font-extrabold">${data.name}</h1>
          <p class="text-on-surface-variant text-xs">${data.company}</p>
        </div>
      </div>
      
      <!-- Info Grid -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/15">
          <p class="text-outline text-xs mb-0.5">제조사</p>
          <p class="text-on-surface font-bold text-sm">${data.company}</p>
        </div>
        <div class="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/15">
          <p class="text-outline text-xs mb-0.5">유통기한</p>
          <p class="text-on-surface font-bold text-sm">${data.expiry}</p>
        </div>
        <div class="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/15">
          <p class="text-outline text-xs mb-0.5">복용법</p>
          <p class="text-primary font-bold text-sm">${data.instruction}</p>
        </div>
        <div class="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/15">
          <p class="text-outline text-xs mb-0.5">가격</p>
          <p class="text-on-surface font-bold text-sm">${data.price}</p>
        </div>
      </div>
      
      <!-- Guidance Note -->
      <div class="flex items-start gap-2.5 p-3.5 bg-tertiary-container/10 border border-tertiary-container/20 rounded-xl">
        <span class="material-symbols-outlined text-tertiary text-lg">info</span>
        <p class="text-on-tertiary-container text-xs leading-relaxed font-medium">${data.guide}</p>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex flex-col gap-2.5 pt-2">
        <button onclick="addMedFromScan(${data.id === undefined ? `'` + data.name + `'` : data.id})" class="btn-active-depress w-full h-12 bg-primary-container text-on-primary-container font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-primary-container/15">
          <span class="material-symbols-outlined text-lg">add_task</span>
          내 일정에 추가
        </button>
        <button onclick="resetScanView()" class="w-full h-12 bg-white border border-outline-variant/30 text-on-surface-variant font-bold rounded-xl active:scale-[0.98] transition-all">
          다시 스캔하기
        </button>
      </div>
    </div>
  `;
  
  container.classList.remove('hidden');
  document.getElementById('scan-controls-section').classList.add('hidden');
}

// Reset view to scanning mode
window.resetScanView = function() {
  document.getElementById('scan-result-container').classList.add('hidden');
  document.getElementById('scan-controls-section').classList.remove('hidden');
  document.getElementById('scan-viewfinder-img').src = "https://lh3.googleusercontent.com/aida-public/AB6AXuBYNCpfAbaZOphenDcJaBP12aVnYmcPPdYxgX_Azpc8_eMFLcelIwTU09NNqE_xKqSbg8Nm0deZQlj4KJkvjhK-_pkLj34MDE46mXw59OaaANvkzYb6gDsWEYFrjBf-9xUS4hmHdt34Fuy-d-2zIh_9qn9WNwtl_m53Wi7z4QCd2y2Mh9nQCTAJsuxZ--AWLw4n2Jc0QUCxXYZ-MNSIPumFmNEVotBCHKw0QveQDmjFqldnx-GmfDQlyT13pl_SwZPGGKxnLvG8_mjk";
  document.getElementById('api-search-input').value = '';
};

// Add drug to schedule array and go to home
window.addMedFromScan = function(key) {
  let sourceData = MOCK_SCAN_DB[key];
  if (!sourceData) return;
  
  // Verify if it is already added to schedule
  const exists = medications.some(m => m.name === sourceData.name);
  if (exists) {
    showToast("이미 일정에 등록된 약입니다!");
    resetScanView();
    switchTab('home');
    return;
  }
  
  // Clone object and append
  const newMed = {
    id: Date.now(),
    name: sourceData.name,
    company: sourceData.company,
    expiry: sourceData.expiry,
    time: sourceData.time,
    instruction: sourceData.instruction,
    category: sourceData.category,
    taken: false,
    img: sourceData.img
  };
  
  medications.push(newMed);
  saveAppState();
  renderMedications();
  updateProgress();
  
  showToast("내 복용 일정에 추가되었습니다!");
  resetScanView();
  switchTab('home');
};

// Fetch official data.go.kr e약은요 public API details
window.queryPublicAPI = async function() {
  const query = document.getElementById('api-search-input').value.trim();
  if (!query) {
    showToast("약 이름을 입력해 주세요.");
    return;
  }
  
  showToast("식약처 API 조회 중...");
  
  // If query matches any of our mock search keys (like '아스피린', '타이레놀')
  if (MOCK_SCAN_DB[query]) {
    setTimeout(() => {
      renderScanResult(MOCK_SCAN_DB[query]);
    }, 800);
    return;
  }
  
  // Real API Fetch with CORS & serviceKey check
  try {
    let response;
    let json;
    let lastErrorMessage = "";
    
    // Attempt 1: Try secure Serverless Proxy (/api/search)
    try {
      const proxyUrl = `/api/search?query=${encodeURIComponent(query)}`;
      response = await fetch(proxyUrl);
      if (response.ok) {
        json = await response.json();
        if (json && json.success === false) {
          lastErrorMessage = json.error || "서버 응답 오류";
          json = null;
        }
      } else {
        try {
          const errJson = await response.json();
          lastErrorMessage = errJson.error || `HTTP ${response.status} 오류`;
        } catch(e) {
          lastErrorMessage = `HTTP ${response.status} 오류`;
        }
      }
    } catch (proxyError) {
      console.warn("Secure API proxy fetch failed, falling back to direct client fetch:", proxyError);
      lastErrorMessage = proxyError.message || "네트워크 연결 실패";
    }
    
    // Attempt 2: Fallback to direct client-side fetch (using localStorage key)
    if (!json || !json.body?.items) {
      const serviceKey = localStorage.getItem('yagssoog_api_key');
      if (serviceKey) {
        const finalKey = serviceKey.includes('%') ? serviceKey : encodeURIComponent(serviceKey);
        const directUrl = `https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList01?serviceKey=${finalKey}&item_name=${encodeURIComponent(query)}&pageNo=1&numOfRows=1&type=json`;
        try {
          const directResponse = await fetch(directUrl);
          if (directResponse.ok) {
            json = await directResponse.json();
          } else {
            lastErrorMessage = `직접 요청 실패 (HTTP ${directResponse.status})`;
          }
        } catch(directErr) {
          lastErrorMessage = "브라우저 CORS 차단 또는 네트워크 실패";
        }
      }
    }
    
    // Parse result
    const items = json?.body?.items;
    if (items && items.length > 0) {
      const item = items[0];
      const match = {
        name: item.ITEM_NAME,
        company: item.ENTP_NAME,
        expiry: "2027.12", // Default placeholder for API response
        time: "오전 8시",
        instruction: "식후 30분",
        category: "기타 식별 정보",
        taken: false,
        price: "약 3,000원",
        guide: `낱알식별정보: ${item.PRINT_FRONT || ''} (${item.DRUG_SHAPE || '기타모양'}) / 성상: ${item.COLOR_CLASS1 || ''}`,
        img: item.ITEM_IMAGE || "https://img.icons8.com/color/96/pill.png"
      };
      
      // Cache this search result dynamic key
      MOCK_SCAN_DB[item.ITEM_NAME] = match;
      renderScanResult(match);
    } else {
      throw new Error(lastErrorMessage || "검색 결과가 없거나 API 응답 구조가 올바르지 않습니다.");
    }
  } catch (error) {
    console.warn("Public API error (likely CORS or serviceKey issue):", error);
    
    // Auto fallback to dynamically generated mock item to guarantee 100% working demo
    const fallbackMedName = `${query}정`;
    const fallbackData = {
      name: fallbackMedName,
      company: "동아제약 (조회대체)",
      expiry: "2027.06",
      time: "오전 9시",
      instruction: "식후 30분",
      category: "일반 의약품",
      taken: false,
      price: "약 4,000원",
      guide: `[식약처 API 조회 대체 안내] 상세 오류: ${error.message}. 로컬 웹 브라우저의 CORS 제한 또는 API 인증키 오류로 인해 모의 조회 결과를 반환합니다.`,
      img: "https://img.icons8.com/color/96/pill.png"
    };
    
    MOCK_SCAN_DB[fallbackMedName] = fallbackData;
    setTimeout(() => {
      renderScanResult(fallbackData);
    }, 600);
  }
};

// Simple Toast Notification component
function showToast(message) {
  // Check if active toast already exists
  let toast = document.getElementById('toast-container');
  if (toast) toast.remove();
  
  toast = document.createElement('div');
  toast.id = 'toast-container';
  toast.className = "fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs font-bold py-2.5 px-5 rounded-full shadow-lg z-50 transition-opacity duration-300 opacity-0 pointer-events-none";
  toast.innerText = message;
  
  document.body.appendChild(toast);
  
  // Fade in
  setTimeout(() => { toast.classList.remove('opacity-0'); }, 10);
  
  // Fade out and remove
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => { toast.remove(); }, 300);
  }, 2200);
}

// ==========================================
// [3단계] 알람 설정 및 실제 오디오 재생 로직
// ==========================================

function saveAlarmsState() {
  localStorage.setItem('yagssoog_alarm_list', JSON.stringify(alarms));
}

// Render dynamic alarm card list matching _4/code.html
window.renderAlarms = function() {
  const container = document.getElementById('alarm-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  alarms.forEach(alarm => {
    const cardEl = document.createElement('div');
    // Active / Inactive opacity class
    const opacityClass = alarm.active ? '' : 'opacity-60 transition-opacity duration-300';
    const glowClass = alarm.active ? 'alarm-card-glow' : '';
    
    // Toggle button style classes
    const toggleBg = alarm.active ? 'bg-primary' : 'bg-outline-variant';
    const toggleCircleTrans = alarm.active ? 'translate-x-6' : 'translate-x-0';
    
    // Sound option button helper for vertical list layout (Card 1)
    const soundOptBtnVertical = (typeLabel, typeVal, icon) => {
      const isSelected = alarm.soundType === typeVal;
      const activeBtnStyles = isSelected
        ? "flex items-center justify-between px-4 py-3 bg-primary-container/10 border-2 border-primary-container rounded-xl text-on-primary-container font-bold"
        : "flex items-center justify-between px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors";

      return `
        <button class="${activeBtnStyles} btn-active-depress" onclick="changeAlarmSound(${alarm.id}, '${typeVal}')" ${alarm.active ? '' : 'disabled'}>
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined">${icon}</span>
            <span class="font-label-lg">${typeLabel}</span>
          </div>
          ${isSelected ? `<span class="material-symbols-outlined text-primary">check_circle</span>` : ''}
        </button>
      `;
    };

    // Sound option button helper for horizontal layout (Card 2)
    const soundOptBtnHorizontal = (typeVal, typeLabel, icon) => {
      const isSelected = alarm.soundType === typeVal;
      const activeBtnStyles = isSelected
        ? "flex-1 min-w-[100px] flex flex-col items-center gap-2 p-3 bg-secondary-container/20 border-2 border-secondary rounded-xl text-on-secondary-container font-bold"
        : "flex-1 min-w-[100px] flex flex-col items-center gap-2 p-3 bg-surface-container border border-outline-variant/30 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors";

      return `
        <button class="${activeBtnStyles} btn-active-depress" onclick="changeAlarmSound(${alarm.id}, '${typeVal}')" ${alarm.active ? '' : 'disabled'}>
          <span class="material-symbols-outlined">${icon}</span>
          <span class="text-[12px] font-bold text-center">${typeLabel}</span>
        </button>
      `;
    };

    cardEl.className = `bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-6 space-y-4 ${glowClass} transition-all active:scale-[0.98]`;
    
    // Choose bottom sound panel HTML structure based on alarm ID to match stitch _4 exactly
    let soundPanelHtml = '';
    
    if (alarm.id === 1) {
      // Alarm Card 1: Vertical list format
      soundPanelHtml = `
        <div class="space-y-2 ${opacityClass}">
          <div class="flex justify-between items-center">
            <p class="font-label-lg text-on-surface-variant">알림 소리 선택</p>
            ${alarm.active ? `<button onclick="testAlarmSound('${alarm.soundType}')" class="text-primary font-label-lg text-sm flex items-center gap-0.5"><span class="material-symbols-outlined text-sm">volume_up</span>미리듣기</button>` : ''}
          </div>
          <div class="grid grid-cols-1 gap-2">
            ${soundOptBtnVertical("어르신 (크고 천천히)", "elderly", "elderly")}
            ${soundOptBtnVertical("일반 (표준)", "normal", "notifications")}
            ${soundOptBtnVertical("어린이 (멜로디)", "melody", "child_care")}
          </div>
        </div>
      `;
    } else if (alarm.id === 2) {
      // Alarm Card 2: Horizontal 3-column format
      soundPanelHtml = `
        <div class="space-y-2 ${opacityClass}">
          <p class="font-label-lg text-on-surface-variant">알림 소리 선택</p>
          <div class="flex flex-wrap gap-2">
            ${soundOptBtnHorizontal("melody", "어린이<br/>(멜로디)", "child_care")}
            ${soundOptBtnHorizontal("normal", "일반<br/>(표준)", "notifications")}
            ${soundOptBtnHorizontal("elderly", "어르신<br/>(크고 천천히)", "elderly")}
          </div>
        </div>
      `;
    } else if (alarm.id === 3) {
      // Alarm Card 3: Custom volume description box style
      const soundLabels = {
        elderly: "어르신 (크고 천천히)",
        normal: "일반 (표준)",
        melody: "어린이 (멜로디)"
      };
      const curLabel = soundLabels[alarm.soundType] || "일반 (표준)";
      soundPanelHtml = `
        <div class="flex items-center gap-3 p-4 bg-tertiary/5 rounded-xl border border-tertiary/10 cursor-pointer ${opacityClass}" onclick="testAlarmSound('${alarm.soundType}')">
          <span class="material-symbols-outlined text-tertiary">volume_up</span>
          <div>
            <div class="font-label-lg text-tertiary font-bold">${curLabel}</div>
            <div class="text-[12px] text-on-surface-variant">취침 전 부드러운 벨소리 (클릭 시 재생)</div>
          </div>
        </div>
      `;
    } else {
      // Default fallback for any dynamically added alarms: Vertical list format
      soundPanelHtml = `
        <div class="space-y-2 ${opacityClass}">
          <div class="flex justify-between items-center">
            <p class="font-label-lg text-on-surface-variant">알림 소리 선택</p>
            ${alarm.active ? `<button onclick="testAlarmSound('${alarm.soundType}')" class="text-primary font-label-lg text-sm flex items-center gap-0.5"><span class="material-symbols-outlined text-sm">volume_up</span>미리듣기</button>` : ''}
          </div>
          <div class="grid grid-cols-1 gap-2">
            ${soundOptBtnVertical("어르신 (크고 천천히)", "elderly", "elderly")}
            ${soundOptBtnVertical("일반 (표준)", "normal", "notifications")}
            ${soundOptBtnVertical("어린이 (멜로디)", "melody", "child_care")}
          </div>
        </div>
      `;
    }

    cardEl.innerHTML = `
      <!-- Card Top: Info & Toggle -->
      <div class="flex justify-between items-start">
        <div class="${opacityClass}">
          <div class="flex items-center gap-2 mb-1">
            <span class="material-symbols-outlined text-${alarm.color} text-lg" style="font-variation-settings: 'FILL' 1;">${alarm.icon}</span>
            <span class="font-label-xl text-on-surface">${alarm.medName}</span>
          </div>
          <div class="font-headline-xl text-headline-xl text-primary tracking-tight">
            ${alarm.time} <span class="text-headline-md font-medium text-on-surface-variant">${alarm.period}</span>
          </div>
        </div>

        <!-- Toggle button -->
        <button class="w-14 h-8 ${toggleBg} rounded-full relative p-1 transition-colors duration-300 btn-active-depress" onclick="toggleAlarmActive(${alarm.id})">
          <div class="w-6 h-6 bg-white rounded-full shadow-sm ${toggleCircleTrans} transition-transform duration-300"></div>
        </button>
      </div>

      ${soundPanelHtml}
    `;

    container.appendChild(cardEl);
  });
};

// Toggle alarm active/inactive
window.toggleAlarmActive = function(id) {
  const alarm = alarms.find(a => a.id === id);
  if (alarm) {
    alarm.active = !alarm.active;
    saveAlarmsState();
    renderAlarms();
    
    if (window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  }
};

// Change alarm sound selection
window.changeAlarmSound = function(id, soundType) {
  const alarm = alarms.find(a => a.id === id);
  if (alarm && alarm.active) {
    alarm.soundType = soundType;
    saveAlarmsState();
    renderAlarms();
    
    // Play test audio
    testAlarmSound(soundType);
  }
};

// Test play alert sound synthesized via Web Audio API
window.testAlarmSound = function(type) {
  // Create audio context
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  
  if (type === 'elderly') {
    // Senior Mode: Low frequency, slow loud repeating sawtooth beeps (richer harmonics)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, ctx.currentTime); // E4 note (gentle yet audible)
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
    
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(330, ctx.currentTime + 0.65);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.65);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    osc2.start(ctx.currentTime + 0.65);
    osc2.stop(ctx.currentTime + 1.25);
  } else if (type === 'normal') {
    // Normal Mode: Simple triple-tone chime (standard notifications)
    const notes = [587.33, 659.25, 783.99]; // D5, E5, G5
    const times = [0, 0.15, 0.3];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + times[idx]);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + times[idx]);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + times[idx] + 0.2);
      osc.start(ctx.currentTime + times[idx]);
      osc.stop(ctx.currentTime + times[idx] + 0.22);
    });
  } else if (type === 'melody') {
    // Melody Mode: Warm ascending chime – C단조 리파아르조 (영췄를 담은 대실엢 원형 파형파 음색)
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const times = [0, 0.18, 0.36, 0.54];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + times[idx]);
      gain.gain.setValueAtTime(0.22, ctx.currentTime + times[idx]);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + times[idx] + 0.35);
      osc.start(ctx.currentTime + times[idx]);
      osc.stop(ctx.currentTime + times[idx] + 0.38);
    });
  }
};

// Create a new alarm dynamically from list of medications
window.createNewAlarm = function() {
  const newAlarmId = Date.now();
  const medNames = ["비타민C", "오메가3", "루테인", "칼슘"];
  const randomMed = medNames[Math.floor(Math.random() * medNames.length)];
  const randomHour = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const randomMin = Math.random() > 0.5 ? '00' : '30';
  const period = Math.random() > 0.5 ? 'AM' : 'PM';
  
  const colors = ["primary", "secondary", "tertiary"];
  const icons = ["pill", "medication", "nightlight"];
  const selectIdx = Math.floor(Math.random() * 3);
  
  const newAlarm = {
    id: newAlarmId,
    medName: `${randomMed} 보충제`,
    time: `${randomHour}:${randomMin}`,
    period: period,
    active: true,
    soundType: "normal",
    icon: icons[selectIdx],
    color: colors[selectIdx]
  };
  
  alarms.push(newAlarm);
  saveAlarmsState();
  renderAlarms();
  
  showToast(`신규 알람이 생성되었습니다! (${newAlarm.medName})`);
  
  // Play the chime of the new alarm sound
  testAlarmSound("normal");
};

// ==========================================
// [4단계] 보호자 연락처, API 설정 및 앱 초기화
// ==========================================

window.toggleGuardianAlert = function() {
  const toggleBtn = document.getElementById('guardian-toggle');
  const toggleCircle = document.getElementById('guardian-toggle-circle');
  const phoneContainer = document.getElementById('guardian-phone-container');
  
  if (!toggleBtn || !toggleCircle || !phoneContainer) return;
  
  const isCurrentlyEnabled = localStorage.getItem('yagssoog_guardian_enabled') === 'true';
  const nextState = !isCurrentlyEnabled;
  
  localStorage.setItem('yagssoog_guardian_enabled', nextState);
  
  if (nextState) {
    toggleBtn.classList.remove('bg-outline-variant');
    toggleBtn.classList.add('bg-primary');
    toggleCircle.classList.remove('translate-x-0');
    toggleCircle.classList.add('translate-x-5');
    phoneContainer.classList.remove('hidden');
    showToast("보호자 안심 알림이 켜졌습니다.");
  } else {
    toggleBtn.classList.add('bg-outline-variant');
    toggleBtn.classList.remove('bg-primary');
    toggleCircle.classList.add('translate-x-5');
    toggleCircle.classList.remove('translate-x-5');
    toggleCircle.classList.add('translate-x-0');
    phoneContainer.classList.add('hidden');
    showToast("보호자 안심 알림이 꺼졌습니다.");
  }
};

window.saveGuardianPhone = function() {
  const phoneInput = document.getElementById('guardian-phone-input');
  if (phoneInput) {
    const val = phoneInput.value.trim();
    if (!val) {
      showToast("올바른 번호를 입력해 주세요.");
      return;
    }
    localStorage.setItem('yagssoog_guardian_phone', val);
    showToast("보호자 연락처가 저장되었습니다!");
  }
};

window.saveApiKey = function() {
  const keyInput = document.getElementById('api-key-input');
  if (keyInput) {
    const val = keyInput.value.trim();
    if (!val) {
      showToast("인증키를 입력해 주세요.");
      return;
    }
    localStorage.setItem('yagssoog_api_key', val);
    showToast("식약처 API 인증키가 저장되었습니다!");
  }
};

window.resetWholeApp = function() {
  if (confirm("애플리케이션의 모든 데이터를 초기화하고 처음 상태로 되돌리시겠습니까?")) {
    localStorage.clear();
    showToast("데이터를 초기화했습니다. 재로딩 중...");
    setTimeout(() => {
      window.location.reload();
    }, 800);
  }
};

// ==========================================
// [5단계] 디자인 백업 및 복구 기능
// ==========================================

const API_SERVER_URL = "http://127.0.0.1:8001";

// Helper to check if server is active (and to show warning if not)
async function checkBackupServerActive() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(`${API_SERVER_URL}/api/backups`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (e) {
    return false;
  }
}

window.runLocalBackup = async function() {
  const isServerActive = await checkBackupServerActive();
  if (!isServerActive) {
    showToast("⚠️ 백업 서버가 작동하고 있지 않습니다. Run_YakSsoog.bat를 실행해 주세요.");
    return;
  }

  try {
    showToast("디자인 백업 수행 중...");
    
    // Gather all local state
    const state = {
      yagssoog_med_list: JSON.parse(localStorage.getItem('yagssoog_med_list') || '[]'),
      yagssoog_alarm_list: JSON.parse(localStorage.getItem('yagssoog_alarm_list') || '[]'),
      yagssoog_font_scale: localStorage.getItem('yagssoog_font_scale') || '2',
      yagssoog_guardian_enabled: localStorage.getItem('yagssoog_guardian_enabled') || 'false',
      yagssoog_guardian_phone: localStorage.getItem('yagssoog_guardian_phone') || '',
      yagssoog_api_key: localStorage.getItem('yagssoog_api_key') || '',
      yagssoog_repeat_settings: JSON.parse(localStorage.getItem('yagssoog_repeat_settings') || '{"enabled":false,"interval":10,"count":5}')
    };

    const response = await fetch(`${API_SERVER_URL}/api/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ state, isSafety: false })
    });

    const res = await response.json();
    if (res.success) {
      showToast("✅ 디자인 백업 완료!");
      updateLastBackupTime();
      
      // If list is open, reload it
      const listContainer = document.getElementById('backup-list-container');
      if (listContainer && !listContainer.classList.contains('hidden')) {
        loadBackupList();
      }
    } else {
      showToast("❌ 백업 실패: " + (res.error || "서버 오류"));
    }
  } catch (e) {
    showToast("❌ 백업 실패: 서버와 통신할 수 없습니다.");
    console.error(e);
  }
};

window.toggleBackupList = function() {
  const listContainer = document.getElementById('backup-list-container');
  if (!listContainer) return;

  const isHidden = listContainer.classList.contains('hidden');
  if (isHidden) {
    listContainer.classList.remove('hidden');
    loadBackupList();
  } else {
    listContainer.classList.add('hidden');
  }
};

window.loadBackupList = async function() {
  const container = document.getElementById('backup-items');
  if (!container) return;

  container.innerHTML = '<p class="text-[12px] text-outline text-center py-4">백업 목록을 불러오는 중...</p>';

  const isServerActive = await checkBackupServerActive();
  if (!isServerActive) {
    container.innerHTML = '<p class="text-[12px] text-error text-center py-4">⚠️ 백업 서버가 연결되어 있지 않습니다.</p>';
    return;
  }

  try {
    const response = await fetch(`${API_SERVER_URL}/api/backups`);
    const res = await response.json();

    if (res.success && res.backups && res.backups.length > 0) {
      container.innerHTML = '';
      res.backups.forEach(backup => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors space-x-2";
        
        const isSafety = backup.type === "Safety";
        const badgeColor = isSafety ? "bg-error/10 text-error" : "bg-primary/10 text-primary";
        const badgeLabel = isSafety ? "안전복구" : "디자인";

        div.innerHTML = `
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 mb-1.5">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeColor}">${badgeLabel}</span>
              <span class="text-xs text-on-surface font-bold truncate block max-w-[120px]">${backup.name}</span>
            </div>
            <p class="text-[10px] text-outline">${formatBackupTime(backup.time)}</p>
          </div>
          <div class="flex gap-1">
            <button onclick="restoreBackup('${backup.name}')" class="text-xs px-2.5 py-1.5 bg-secondary text-on-secondary rounded-lg font-bold hover:brightness-105 active:scale-95 transition-all">
              복원
            </button>
            <button onclick="deleteBackup('${backup.name}', event)" class="text-xs px-2 py-1.5 border border-error/50 text-error rounded-lg font-bold hover:bg-error-container/20 active:scale-95 transition-all">
              삭제
            </button>
          </div>
        `;
        container.appendChild(div);
      });
    } else {
      container.innerHTML = '<p class="text-xs text-outline text-center py-4">저장된 백업 파일이 없습니다.</p>';
    }
  } catch (e) {
    container.innerHTML = '<p class="text-xs text-error text-center py-4">⚠️ 백업 파일 로딩에 실패했습니다.</p>';
    console.error(e);
  }
};

window.restoreBackup = async function(folderName) {
  if (!confirm(`선택한 백업(${folderName})으로 복원하시겠습니까?\n복원 전 현재 상태가 자동으로 안전 백업에 저장됩니다.`)) {
    return;
  }

  const isServerActive = await checkBackupServerActive();
  if (!isServerActive) {
    showToast("⚠️ 백업 서버가 연결되어 있지 않아 복원할 수 없습니다.");
    return;
  }

  try {
    showToast("복원 진행 중...");
    const response = await fetch(`${API_SERVER_URL}/api/restore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ folderName })
    });

    const res = await response.json();
    if (res.success) {
      // Restore LocalStorage state from response
      if (res.state) {
        if (res.state.yagssoog_med_list) localStorage.setItem('yagssoog_med_list', JSON.stringify(res.state.yagssoog_med_list));
        if (res.state.yagssoog_alarm_list) localStorage.setItem('yagssoog_alarm_list', JSON.stringify(res.state.yagssoog_alarm_list));
        if (res.state.yagssoog_font_scale) localStorage.setItem('yagssoog_font_scale', res.state.yagssoog_font_scale);
        if (res.state.yagssoog_guardian_enabled) localStorage.setItem('yagssoog_guardian_enabled', res.state.yagssoog_guardian_enabled);
        if (res.state.yagssoog_guardian_phone) localStorage.setItem('yagssoog_guardian_phone', res.state.yagssoog_guardian_phone);
        if (res.state.yagssoog_api_key) localStorage.setItem('yagssoog_api_key', res.state.yagssoog_api_key);
        if (res.state.yagssoog_repeat_settings) localStorage.setItem('yagssoog_repeat_settings', JSON.stringify(res.state.yagssoog_repeat_settings));
      }

      showToast("✅ 복원 완료! 화면을 새로고침합니다.");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showToast("❌ 복원 실패: " + (res.error || "서버 오류"));
    }
  } catch (e) {
    showToast("❌ 복원 실패: 서버와 통신할 수 없습니다.");
    console.error(e);
  }
};

window.deleteBackup = async function(folderName, event) {
  if (event) event.stopPropagation();

  if (!confirm(`정말로 이 백업(${folderName})을 영구적으로 삭제하시겠습니까?`)) {
    return;
  }

  const isServerActive = await checkBackupServerActive();
  if (!isServerActive) {
    showToast("⚠️ 백업 서버가 연결되어 있지 않아 삭제할 수 없습니다.");
    return;
  }

  try {
    showToast("백업 삭제 중...");
    const response = await fetch(`${API_SERVER_URL}/api/backup/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ folderName })
    });

    const res = await response.json();
    if (res.success) {
      showToast("✅ 백업 삭제 성공!");
      loadBackupList();
    } else {
      showToast("❌ 삭제 실패: " + (res.error || "서버 오류"));
    }
  } catch (e) {
    showToast("❌ 삭제 실패: 서버와 통신할 수 없습니다.");
    console.error(e);
  }
};

window.checkAndUpdateBackupStatus = async function() {
  const isServerActive = await checkBackupServerActive();
  const infoEl = document.getElementById('last-backup-info');
  if (infoEl) {
    if (isServerActive) {
      try {
        const response = await fetch(`${API_SERVER_URL}/api/backups`);
        const res = await response.json();
        if (res.success && res.backups && res.backups.length > 0) {
          const latestDesign = res.backups.find(b => b.type === "Standard");
          if (latestDesign) {
            infoEl.innerText = `최근 백업: ${formatBackupTime(latestDesign.time)}`;
          } else {
            infoEl.innerText = `최근 백업: 없음`;
          }
        } else {
          infoEl.innerText = `최근 백업: 없음`;
        }
      } catch (e) {
        infoEl.innerText = `최근 백업: 로딩 실패`;
      }
    } else {
      infoEl.innerText = `최근 백업: 백업 서버 미연결`;
    }
  }
};

function formatBackupTime(tsStr) {
  try {
    const regex = /^(\d{4})-(\d{2})(\d{2})_(\d{2})(\d{2})(am|pm)$/;
    const match = tsStr.match(regex);
    if (!match) return tsStr;

    const [_, year, month, day, hour, min, ampm] = match;
    const ampmKo = ampm === "pm" ? "오후" : "오전";
    return `${year}년 ${month}월 ${day}일 ${ampmKo} ${hour}:${min}`;
  } catch (e) {
    return tsStr;
  }
}

function updateLastBackupTime() {
  const infoEl = document.getElementById('last-backup-info');
  if (infoEl) {
    const now = new Date();
    const ampm = now.getHours() >= 12 ? "오후" : "오전";
    let hour = now.getHours() % 12;
    hour = hour ? hour : 12;
    const min = String(now.getMinutes()).padStart(2, '0');
    infoEl.innerText = `최근 백업: 오늘 ${ampm} ${hour}:${min}`;
  }
}

// ==========================================
// [6단계] 알림 반복 설정 모달 동작 로직
// ==========================================

// Temporary settings for pending edits before save button is pressed
let tempRepeatSettings = { enabled: false, interval: 10, count: 5 };

window.openRepeatSettingsModal = function() {
  const modal = document.getElementById('repeat-settings-modal');
  if (!modal) return;
  
  // Clone current settings to temp object
  tempRepeatSettings = { ...repeatSettings };
  
  // Update modal UI elements to match temp state
  updateRepeatModalUI();
  
  modal.classList.remove('hidden');
};

window.closeRepeatSettingsModal = function() {
  const modal = document.getElementById('repeat-settings-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

window.toggleRepeatEnabled = function() {
  tempRepeatSettings.enabled = !tempRepeatSettings.enabled;
  updateRepeatModalUI();
  
  if (window.navigator.vibrate) {
    window.navigator.vibrate(10);
  }
};

window.selectRepeatInterval = function(mins) {
  if (!tempRepeatSettings.enabled) return;
  tempRepeatSettings.interval = mins;
  updateRepeatModalUI();
};

window.selectRepeatCount = function(cnt) {
  if (!tempRepeatSettings.enabled) return;
  tempRepeatSettings.count = cnt;
  updateRepeatModalUI();
};

window.saveRepeatSettings = function() {
  // Save temp settings to active state
  repeatSettings = { ...tempRepeatSettings };
  localStorage.setItem('yagssoog_repeat_settings', JSON.stringify(repeatSettings));
  
  // Update main summary text
  updateRepeatSummaryText();
  
  showToast("알림 반복 설정이 저장되었습니다!");
  closeRepeatSettingsModal();
};

function updateRepeatModalUI() {
  const toggleBtn = document.getElementById('repeat-toggle-btn');
  const toggleCircle = document.getElementById('repeat-toggle-circle');
  const optionsContainer = document.getElementById('repeat-options-container');
  
  if (!toggleBtn || !toggleCircle || !optionsContainer) return;
  
  // 1. Toggle button styling
  if (tempRepeatSettings.enabled) {
    toggleBtn.classList.remove('bg-outline-variant');
    toggleBtn.classList.add('bg-primary');
    toggleCircle.classList.remove('translate-x-0');
    toggleCircle.classList.add('translate-x-6');
    optionsContainer.style.opacity = '1';
    optionsContainer.style.pointerEvents = 'auto';
  } else {
    toggleBtn.classList.add('bg-outline-variant');
    toggleBtn.classList.remove('bg-primary');
    toggleCircle.classList.add('translate-x-6');
    toggleCircle.classList.remove('translate-x-6');
    toggleCircle.classList.add('translate-x-0');
    optionsContainer.style.opacity = '0.4';
    optionsContainer.style.pointerEvents = 'none';
  }
  
  // 2. Interval buttons styling
  const intervals = [5, 10, 15, 30];
  intervals.forEach(val => {
    const btn = document.getElementById(`repeat-interval-${val}`);
    if (btn) {
      if (tempRepeatSettings.enabled && tempRepeatSettings.interval === val) {
        btn.className = "py-2.5 text-xs font-bold rounded-xl border-2 border-primary bg-primary-container/10 text-primary active:scale-95 transition-all";
      } else {
        btn.className = "py-2.5 text-xs font-bold rounded-xl border border-outline-variant/30 bg-surface-container text-on-surface-variant active:scale-95 transition-all";
      }
    }
  });
  
  // 3. Count buttons styling
  const counts = [3, 5, 999];
  counts.forEach(val => {
    const btn = document.getElementById(`repeat-count-${val}`);
    if (btn) {
      if (tempRepeatSettings.enabled && tempRepeatSettings.count === val) {
        btn.className = "py-2.5 text-xs font-bold rounded-xl border-2 border-primary bg-primary-container/10 text-primary active:scale-95 transition-all";
      } else {
        btn.className = "py-2.5 text-xs font-bold rounded-xl border border-outline-variant/30 bg-surface-container text-on-surface-variant active:scale-95 transition-all";
      }
    }
  });
}

function updateRepeatSummaryText() {
  const summaryEl = document.getElementById('repeat-settings-summary');
  if (!summaryEl) return;
  
  if (repeatSettings.enabled) {
    const countText = repeatSettings.count === 999 ? "무제한" : `${repeatSettings.count}회`;
    summaryEl.innerText = `반복: 켜짐 (${repeatSettings.interval}분 간격 / ${countText})`;
  } else {
    summaryEl.innerText = "반복: 꺼짐";
  }
}


