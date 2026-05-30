// ==========================================
// YakSsoog (약쏘옥) Camera Scanner Loader
// ==========================================

(function() {
  let html5QrcodeScanner = null;
  let isCameraActive = false;
  let isFallbackMode = false;

  // 1. html5-qrcode CDN script dynamic loading
  const script = document.createElement('script');
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js";
  script.onload = () => {
    initCameraScannerUI();
  };
  document.head.appendChild(script);

  function initCameraScannerUI() {
    // 2. Add "실제 카메라로 스캔하기" button in the scan controls section
    const controlsSection = document.getElementById('scan-controls-section');
    if (!controlsSection) return;

    // Create a new container card for the real camera scanner
    const cameraCard = document.createElement('div');
    cameraCard.className = "bg-surface-container-lowest border border-primary/30 rounded-2xl p-5 shadow-md space-y-3 mt-4";
    cameraCard.innerHTML = `
      <div class="flex items-center gap-2 text-primary">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">photo_camera</span>
        <h3 class="font-label-lg font-bold text-on-surface">실제 스마트폰 카메라 스캔</h3>
      </div>
      <p class="text-xs text-on-surface-variant leading-relaxed">
        카메라를 통해 약 포장지의 바코드를 직접 스캔합니다. (HTTP 환경이나 일부 브라우저에서는 안전한 체험 모드로 자동 실행됩니다.)
      </p>
      <button id="toggle-camera-scan-btn" onclick="toggleCameraScan()" class="btn-active-depress w-full h-12 bg-primary text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md">
        <span class="material-symbols-outlined">videocam</span>
        카메라 스캔 시작
      </button>
    `;

    // Append as first child to controlsSection
    controlsSection.insertBefore(cameraCard, controlsSection.firstChild);
  }

  // Define global toggle function to bind with html button
  window.toggleCameraScan = async function() {
    const btn = document.getElementById('toggle-camera-scan-btn');
    const viewfinderContainer = document.querySelector('#view-scan section.relative');
    const viewfinderImg = document.getElementById('scan-viewfinder-img');
    const laser = document.getElementById('scan-laser-line');
    
    if (!viewfinderContainer || !btn) return;

    if (!isCameraActive) {
      isCameraActive = true;
      isFallbackMode = false;
      btn.innerHTML = `<span class="material-symbols-outlined">videocam_off</span>스캔 종료`;
      btn.className = "btn-active-depress w-full h-12 bg-error text-on-error font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md";

      // Hide mock image and laser animation
      if (viewfinderImg) viewfinderImg.style.display = 'none';
      if (laser) laser.classList.remove('scanner-line');

      // Create video reader element inside viewfinder
      let readerDiv = document.getElementById('reader');
      if (!readerDiv) {
        readerDiv = document.createElement('div');
        readerDiv.id = 'reader';
        readerDiv.className = "absolute inset-0 z-0 bg-black flex flex-col items-center justify-center p-4 text-center space-y-4";
        viewfinderContainer.insertBefore(readerDiv, viewfinderContainer.firstChild);
      } else {
        readerDiv.style.display = 'flex';
        readerDiv.innerHTML = ''; // Reset content
      }

      // Launch HTML5 QR Code Camera
      try {
        html5QrcodeScanner = new Html5Qrcode("reader", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_39
          ]
        });

        // Set higher frame rate and dynamic scanner box size
        const config = { 
          fps: 20, 
          qrbox: function(width, height) {
            const size = Math.min(width, height) * 0.75;
            return { width: size, height: size };
          },
          aspectRatio: 1.0
        };
        
        await html5QrcodeScanner.start(
          { 
            facingMode: "environment",
            width: { min: 1280, ideal: 1920 },
            height: { min: 720, ideal: 1080 }
          }, 
          config,
          onScanSuccess,
          onScanFailure
        );

        // Apply advanced autofocus constraints to clear macro blur
        setTimeout(async () => {
          const videoEl = document.querySelector('#reader video');
          if (videoEl && videoEl.srcObject) {
            const track = videoEl.srcObject.getVideoTracks()[0];
            if (track) {
              const capabilities = track.getCapabilities ? track.getCapabilities() : {};
              const advancedConstraints = {};
              if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                advancedConstraints.focusMode = 'continuous';
              }
              if (Object.keys(advancedConstraints).length > 0) {
                try {
                  await track.applyConstraints({ advanced: [advancedConstraints] });
                } catch (e) {
                  console.warn("Failed to apply advanced camera focus", e);
                }
              }
            }
          }
        }, 1000);

      } catch (err) {
        console.warn("Camera startup failed, falling back to simulated scan mode:", err);
        // Switch to Simulator Mode automatically to prevent user frustration
        isFallbackMode = true;
        startFallbackScanner(readerDiv);
      }
    } else {
      stopCameraScan();
    }
  };

  function startFallbackScanner(readerDiv) {
    showToast("ℹ️ 보안 정책에 따라 '가상 체험 스캔 모드'로 실행됩니다.");
    
    readerDiv.innerHTML = `
      <div class="space-y-4 w-full">
        <p class="text-xs text-red-400 font-bold">⚠️ 보안 정책(HTTP)으로 카메라 차단됨</p>
        <p class="text-[13px] text-white leading-normal">
          카메라 대신 아래 시뮬레이터 약품 버튼을 터치하여 바코드 조회 기능을 테스트해 보세요!
        </p>
        <div class="grid grid-cols-2 gap-2 max-w-[280px] mx-auto">
          <button onclick="window.triggerSimulatedScan('199303108')" class="p-2.5 text-xs bg-primary/20 border border-primary/40 rounded-xl text-primary font-bold active:scale-95 transition-all text-white">
            타이레놀 스캔
          </button>
          <button onclick="window.triggerSimulatedScan('199801452')" class="p-2.5 text-xs bg-primary/20 border border-primary/40 rounded-xl text-primary font-bold active:scale-95 transition-all text-white">
            아스피린 스캔
          </button>
          <button onclick="window.triggerSimulatedScan('198801784')" class="p-2.5 text-xs bg-primary/20 border border-primary/40 rounded-xl text-primary font-bold active:scale-95 transition-all text-white">
            까스활명수 스캔
          </button>
          <button onclick="window.triggerSimulatedScan('200701103')" class="p-2.5 text-xs bg-primary/20 border border-primary/40 rounded-xl text-primary font-bold active:scale-95 transition-all text-white">
            비타500 스캔
          </button>
        </div>
      </div>
    `;
  }

  window.triggerSimulatedScan = function(barcode) {
    onScanSuccess(barcode, null);
  };

  async function stopCameraScan() {
    const btn = document.getElementById('toggle-camera-scan-btn');
    const viewfinderImg = document.getElementById('scan-viewfinder-img');
    const laser = document.getElementById('scan-laser-line');
    const readerDiv = document.getElementById('reader');

    isCameraActive = false;
    isFallbackMode = false;
    if (btn) {
      btn.innerHTML = `<span class="material-symbols-outlined">videocam</span>카메라 스캔 시작`;
      btn.className = "btn-active-depress w-full h-12 bg-primary text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md";
    }

    // Restore mock elements
    if (viewfinderImg) viewfinderImg.style.display = 'block';
    if (laser) laser.classList.add('scanner-line');
    if (readerDiv) {
      readerDiv.style.display = 'none';
      readerDiv.innerHTML = '';
    }

    // Stop scanning engine
    if (html5QrcodeScanner) {
      try {
        await html5QrcodeScanner.stop();
        html5QrcodeScanner = null;
      } catch (e) {
        console.warn("Error stopping scanner:", e);
      }
    }
  }

  function onScanSuccess(decodedText, decodedResult) {
    if (window.navigator.vibrate) {
      window.navigator.vibrate(100);
    }
    
    stopCameraScan();

    const apiInput = document.getElementById('api-search-input');
    if (apiInput) {
      apiInput.value = decodedText;
      showToast(`스캔 완료: ${decodedText}`);
      if (typeof window.queryPublicAPI === 'function') {
        window.queryPublicAPI();
      }
    }
  }

  function onScanFailure(error) {
    // Fail silently frame by frame
  }
})();
