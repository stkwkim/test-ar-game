// 遊戲狀態管理
const GameState = {
    currentLocation: null,
    visitedLocations: [],
    userPosition: null,
    watchId: null,
    isGPSWorking: false,
    useTestLocations: false, // 設為true使用測試地點
    gameStarted: false
};

// 初始化遊戲
async function initGame() {
    try {
        updateLoadingText("初始化遊戲系統...");
        updateProgress(10);
        
        // 選擇使用正式地點還是測試地點
        const locations = GameState.useTestLocations ? testLocations : gameLocations;
        GameState.totalLocations = locations.length;
        
        updateLoadingText("載入地點資料...");
        updateProgress(30);
        
        // 更新UI顯示
        document.getElementById('total-locations').textContent = GameState.totalLocations;
        document.getElementById('progress-count').textContent = GameState.visitedLocations.length;
        
        updateLoadingText("啟動GPS定位...");
        updateProgress(60);
        
        // 開始GPS追蹤
        await startGPSTracking();
        
        updateLoadingText("準備完成！");
        updateProgress(100);
        
        // 顯示遊戲畫面
        setTimeout(() => {
            switchScreen('game-screen');
            GameState.gameStarted = true;
        }, 1000);
        
    } catch (error) {
        console.error('遊戲初始化失敗:', error);
        showError(`初始化失敗: ${error.message}`);
    }
}

// 開始GPS追蹤
function startGPSTracking() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("您的瀏覽器不支持GPS功能"));
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        };
        
        GameState.watchId = navigator.geolocation.watchPosition(
            // 成功回調
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const acc = position.coords.accuracy;
                
                GameState.userPosition = { lat, lng, acc };
                GameState.isGPSWorking = true;
                
                updateGPSStatus(true, acc);
                checkNearbyLocations();
                updateDebugInfo();
                
                if (!GameState.gpsInitialized) {
                    GameState.gpsInitialized = true;
                    resolve();
                }
            },
            // 錯誤回調
            (error) => {
                GameState.isGPSWorking = false;
                const errorMsg = getGPSErrorMessage(error);
                updateGPSStatus(false, 0, errorMsg);
                
                if (!GameState.gpsInitialized) {
                    reject(new Error(errorMsg));
                } else {
                    showError(errorMsg);
                }
            },
            options
        );
        
        // 10秒超時
        setTimeout(() => {
            if (!GameState.gpsInitialized) {
                reject(new Error("GPS啟動超時，請檢查位置權限"));
            }
        }, 10000);
    });
}

// 檢查附近地點
function checkNearbyLocations() {
    if (!GameState.userPosition) return;
    
    const userLat = GameState.userPosition.lat;
    const userLng = GameState.userPosition.lng;
    const locations = GameState.useTestLocations ? testLocations : gameLocations;
    
    let nearestLocation = null;
    let minDistance = Infinity;
    
    // 找出最近且未訪問的地點
    locations.forEach(location => {
        if (GameState.visitedLocations.includes(location.id)) return;
        
        const distance = calculateDistance(
            userLat, userLng, 
            location.lat, location.lng
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestLocation = location;
        }
        
        // 如果在地點觸發範圍內
        if (distance <= location.range) {
            if (GameState.currentLocation?.id !== location.id) {
                triggerLocation(location);
            }
        }
    });
    
    // 更新指引信息
    updateGuidanceInfo(minDistance, nearestLocation);
}

// 觸發地點
function triggerLocation(location) {
    GameState.currentLocation = location;
    
    // 更新UI顯示地點信息
    document.getElementById('location-title').textContent = location.title;
    document.getElementById('location-story').textContent = location.story;
    document.getElementById('question-text').textContent = location.question;
    
    // 顯示地點卡片和問題區域
    document.getElementById('location-card').classList.remove('hidden');
    document.getElementById('question-section').classList.remove('hidden');
    document.getElementById('guidance-screen').classList.add('hidden');
    
    // 隱藏提示內容
    document.getElementById('hint-content').classList.add('hidden');
    
    // 清空之前的答案
    document.getElementById('user-answer').value = '';
    
    // 更新距離顯示
    updateLocationDistance();
}

// 提交答案
function submitAnswer() {
    const userAnswer = document.getElementById('user-answer').value.trim();
    
    if (!GameState.currentLocation) {
        alert("請先到達一個探索地點");
        return;
    }
    
    if (!userAnswer) {
        alert("請輸入答案");
        return;
    }
    
    const correctAnswer = GameState.currentLocation.answer.toLowerCase();
    const userAnswerLower = userAnswer.toLowerCase();
    
    // 簡單的答案驗證（可以擴展為更複雜的邏輯）
    if (userAnswerLower === correctAnswer) {
        // 答案正確
        handleCorrectAnswer();
    } else {
        // 答案錯誤
        alert("答案不正確，請再試一次或查看提示。");
        document.getElementById('user-answer').focus();
    }
}

// 處理正確答案
function handleCorrectAnswer() {
    if (!GameState.visitedLocations.includes(GameState.currentLocation.id)) {
        GameState.visitedLocations.push(GameState.currentLocation.id);
        updateProgressDisplay();
    }
    
    // 顯示慶祝訊息
    showCelebration(GameState.currentLocation.unlockMessage);
    
    // 重置當前地點
    GameState.currentLocation = null;
    
    // 檢查是否完成所有地點
    if (GameState.visitedLocations.length >= GameState.totalLocations) {
        setTimeout(() => {
            completeGame();
        }, 2000);
    }
}

// 顯示提示
function showHint() {
    if (!GameState.currentLocation) {
        alert("請先到達一個探索地點");
        return;
    }
    
    const hintContent = document.getElementById('hint-content');
    const hintText = document.getElementById('hint-text');
    
    hintText.textContent = GameState.currentLocation.hint;
    hintContent.classList.remove('hidden');
}

// 更新指引信息
function updateGuidanceInfo(distance, nearestLocation) {
    const directionText = document.getElementById('direction-text');
    const nextLocationName = document.getElementById('next-location-name');
    const nextLocationDistance = document.getElementById('next-location-distance');
    
    if (nearestLocation && distance < 1000) {
        directionText.textContent = `朝著 ${nearestLocation.name} 前進`;
        nextLocationName.textContent = nearestLocation.name;
        nextLocationDistance.textContent = `距離: ${Math.round(distance)} 米`;
    } else {
        directionText.textContent = "正在尋找最近的地點...";
        nextLocationName.textContent = "--";
        nextLocationDistance.textContent = "距離: -- 米";
    }
}

// 更新地點距離顯示
function updateLocationDistance() {
    if (!GameState.currentLocation || !GameState.userPosition) return;
    
    const distance = calculateDistance(
        GameState.userPosition.lat,
        GameState.userPosition.lng,
        GameState.currentLocation.lat,
        GameState.currentLocation.lng
    );
    
    document.getElementById('location-distance').textContent = `${Math.round(distance)} 米`;
}

// 計算兩個座標點之間的距離（米）
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // 地球半徑（米）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 更新GPS狀態顯示
function updateGPSStatus(connected, accuracy, errorMessage = "") {
    const statusEl = document.getElementById('gps-status');
    const statusText = statusEl.querySelector('.status-text');
    const statusIcon = statusEl.querySelector('.status-icon');
    
    statusEl.className = 'gps-status';
    
    if (connected) {
        if (accuracy <= 20) {
            statusEl.classList.add('connected');
            statusIcon.textContent = '🎯';
            statusText.textContent = `GPS信號優秀 (${Math.round(accuracy)}米)`;
        } else if (accuracy <= 50) {
            statusEl.classList.add('connected');
            statusIcon.textContent = '📍';
            statusText.textContent = `GPS信號良好 (${Math.round(accuracy)}米)`;
        } else {
            statusEl.classList.add('searching');
            statusIcon.textContent = '🔍';
            statusText.textContent = `GPS信號一般 (${Math.round(accuracy)}米)`;
        }
    } else {
        statusEl.classList.add('error');
        statusIcon.textContent = '❌';
        statusText.textContent = errorMessage || "GPS信號丟失";
    }
}

// 獲取GPS錯誤信息
function getGPSErrorMessage(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return "位置權限被拒絕";
        case error.POSITION_UNAVAILABLE:
            return "無法獲取位置信息";
        case error.TIMEOUT:
            return "獲取位置超時";
        default:
            return "GPS未知錯誤";
    }
}

// 更新進度顯示
function updateProgressDisplay() {
    document.getElementById('progress-count').textContent = GameState.visitedLocations.length;
    
    const progressFill = document.getElementById('progress-fill');
    const percentage = (GameState.visitedLocations.length / GameState.totalLocations) * 100;
    progressFill.style.width = percentage + '%';
}

// 顯示慶祝訊息
function showCelebration(message) {
    const celebration = document.getElementById('celebration');
    celebration.classList.remove('hidden');
}

// 關閉慶祝訊息
function closeCelebration() {
    const celebration = document.getElementById('celebration');
    celebration.classList.add('hidden');
    
    // 重置UI顯示
    document.getElementById('location-card').classList.add('hidden');
    document.getElementById('guidance-screen').classList.remove('hidden');
}

// 完成遊戲
function completeGame() {
    // 這裡可以跳轉到完成頁面或顯示完成訊息
    alert(`🎉 恭喜！您已完成所有 ${GameState.totalLocations} 個地點的探索！\n\n感謝您參與九龍城土瓜灣探索之旅！`);
    
    // 可以重設遊戲或跳轉到其他頁面
    // window.location.href = 'success.html';
}

// 屏幕切換
function switchScreen(screenId) {
    // 隱藏所有屏幕
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // 顯示目標屏幕
    document.getElementById(screenId).classList.add('active');
}

// 顯示錯誤
function showError(message) {
    document.getElementById('error-message').textContent = message;
    switchScreen('gps-error-screen');
}

// 重試GPS
function retryGPS() {
    switchScreen('loading-screen');
    initGame().catch(error => {
        showError(error.message);
    });
}

// 前往測試頁面
function goToTest() {
    window.location.href = 'gps-test.html';
}

// 更新載入文字和進度
function updateLoadingText(text) {
    document.getElementById('loading-text').textContent = text;
}

function updateProgress(percentage) {
    document.getElementById('progress-fill').style.width = percentage + '%';
}

// 更新除錯信息
function updateDebugInfo() {
    if (!GameState.userPosition) return;
    
    const debugPosition = document.getElementById('debug-position');
    const debugAccuracy = document.getElementById('debug-accuracy');
    const debugNearby = document.getElementById('debug-nearby');
    
    debugPosition.textContent = `${GameState.userPosition.lat.toFixed(6)}, ${GameState.userPosition.lng.toFixed(6)}`;
    debugAccuracy.textContent = Math.round(GameState.userPosition.accuracy);
    
    // 找出最近地點
    const locations = GameState.useTestLocations ? testLocations : gameLocations;
    let nearest = null;
    let minDist = Infinity;
    
    locations.forEach(loc => {
        const dist = calculateDistance(
            GameState.userPosition.lat,
            GameState.userPosition.lng,
            loc.lat,
            loc.lng
        );
        if (dist < minDist) {
            minDist = dist;
            nearest = loc.name;
        }
    });
    
    debugNearby.textContent = `${nearest} (${Math.round(minDist)}米)`;
}

// 切換除錯信息顯示
function toggleDebug() {
    const debugInfo = document.getElementById('debug-info');
    debugInfo.classList.toggle('hidden');
}

// 頁面載入完成後初始化遊戲
document.addEventListener('DOMContentLoaded', function() {
    initGame().catch(error => {
        console.error('遊戲啟動失敗:', error);
        showError(error.message);
    });
});

// 頁面卸載時清理資源
window.addEventListener('beforeunload', function() {
    if (GameState.watchId) {
        navigator.geolocation.clearWatch(GameState.watchId);
    }
});
