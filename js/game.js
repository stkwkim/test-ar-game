// 遊戲狀態
const gameState = {
    currentLocation: null,
    visitedLocations: [],
    allLocations: [],
    userPosition: null,
    watchId: null
};

// 測試地點資料
const testLocations = [
    {
        id: "test-1",
        name: "測試起點",
        lat: 22.3191,
        lng: 114.1694,
        range: 50,
        title: "歡迎來到時光之旅",
        story: "這是一個測試地點，想像這裡是九龍寨城的入口...",
        question: "請觀察四周，這裡是什麼類型的地點？",
        answer: "公園",
        hint: "看看周圍的綠化環境"
    },
    {
        id: "test-2",
        name: "測試中點", 
        lat: 22.3195,
        lng: 114.1702,
        range: 50,
        title: "歷史的痕跡",
        story: "繼續往前走，這裡曾經是古老的市集...",
        question: "根據故事，這裡曾經是什麼場所？",
        answer: "市集",
        hint: "回想故事中提到的商業活動"
    },
    {
        id: "test-3",
        name: "測試終點",
        lat: 22.3200,
        lng: 114.1710,
        range: 50,
        title: "探索完成",
        story: "恭喜完成測試！這裡是虛擬的終點站...",
        question: "您對這次探索體驗滿意嗎？",
        answer: "滿意",
        hint: "這是最後一題，輕鬆回答即可"
    }
];

// 初始化遊戲
async function initGame() {
    try {
        showStatus("遊戲初始化中...");
        
        // 使用測試資料
        gameState.allLocations = testLocations;
        updateProgress();
        
        // 開始GPS監聽
        await startLocationTracking();
        
        // 顯示遊戲界面
        document.getElementById('loading').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        
        showStatus("遊戲載入完成！開始探索吧", "success");
        
    } catch (error) {
        console.error('初始化失敗:', error);
        showStatus(`遊戲載入失敗: ${error.message}`, "error");
    }
}

// 開始GPS追蹤
function startLocationTracking() {
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
        
        gameState.watchId = navigator.geolocation.watchPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const acc = position.coords.accuracy;
                
                gameState.userPosition = { lat, lng, acc };
                updateGPSStatus(true, acc);
                checkNearbyLocations();
                updateDebugInfo();
                
                // 第一次成功獲取位置時解析Promise
                if (!resolve) return;
                resolve();
                resolve = null;
            },
            error => {
                const errorMsg = getGPSErrorMessage(error);
                updateGPSStatus(false, 0, errorMsg);
                reject(new Error(errorMsg));
            },
            options
        );
        
        // 10秒後超時
        setTimeout(() => {
            if (resolve) {
                reject(new Error("GPS請求超時，請檢查位置權限"));
            }
        }, 10000);
    });
}

// 更新GPS狀態顯示
function updateGPSStatus(connected, accuracy, errorMessage = "") {
    const statusEl = document.getElementById('gps-status');
    
    if (connected) {
        statusEl.textContent = `GPS: 已連接 (精度: ${Math.round(accuracy)}米)`;
        statusEl.className = "gps-status connected";
    } else if (errorMessage) {
        statusEl.textContent = `GPS: ${errorMessage}`;
        statusEl.className = "gps-status disconnected";
    } else {
        statusEl.textContent = "GPS: 搜尋中...";
        statusEl.className = "gps-status searching";
    }
}

// 檢查附近地點
function checkNearbyLocations() {
    if (!gameState.userPosition) return;
    
    const userLat = gameState.userPosition.lat;
    const userLng = gameState.userPosition.lng;
    
    let nearestLocation = null;
    let minDistance = Infinity;
    
    // 找出最近的地點
    gameState.allLocations.forEach(location => {
        if (gameState.visitedLocations.includes(location.id)) return;
        
        const distance = calculateDistance(
            userLat, userLng, 
            location.lat, location.lng
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestLocation = location;
        }
        
        // 如果在地點範圍內，觸發地點
        if (distance <= location.range) {
            triggerLocation(location);
        }
    });
    
    // 更新距離信息
    updateDistanceInfo(minDistance, nearestLocation);
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

// 觸發地點
function triggerLocation(location) {
    if (gameState.currentLocation && gameState.currentLocation.id === location.id) {
        return; // 已經在這個地點
    }
    
    gameState.currentLocation = location;
    
    // 更新UI顯示地點信息
    document.getElementById('loc-title').textContent = location.title;
    document.getElementById('loc-story').textContent = location.story;
    document.getElementById('question-text').textContent = location.question;
    
    // 顯示問題區域
    document.getElementById('question-section').style.display = 'block';
    
    showStatus(`發現新地點: ${location.name}`, "success");
}

// 更新距離信息
function updateDistanceInfo(distance, nearestLocation) {
    const distanceEl = document.getElementById('distance');
    
    if (nearestLocation && distance < 1000) {
        distanceEl.textContent = Math.round(distance);
        
        // 更新指南針方向（簡化版）
        if (nearestLocation) {
            updateCompassDirection(nearestLocation);
        }
    } else {
        distanceEl.textContent = ">1000";
    }
}

// 更新指南針方向（簡化版）
function updateCompassDirection(targetLocation) {
    if (!gameState.userPosition || !targetLocation) return;
    
    const compassEl = document.querySelector('.compass');
    // 這裡可以實現更複雜的方向計算
    compassEl.style.transform = 'rotate(0deg)';
}

// 檢查答案
function checkAnswer() {
    const userAnswer = document.getElementById('answer-input').value.trim();
    
    if (!gameState.currentLocation) {
        alert("請先到達一個探索地點");
        return;
    }
    
    if (!userAnswer) {
        alert("請輸入答案");
        return;
    }
    
    const correctAnswer = gameState.currentLocation.answer;
    
    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
        // 答案正確
        if (!gameState.visitedLocations.includes(gameState.currentLocation.id)) {
            gameState.visitedLocations.push(gameState.currentLocation.id);
            updateProgress();
        }
        
        showStatus("答案正確！恭喜完成這個地點的探索", "success");
        document.getElementById('answer-input').value = '';
        
        // 隱藏問題區域，直到下個地點
        document.getElementById('question-section').style.display = 'none';
        document.getElementById('loc-title').textContent = "尋找下個地點";
        document.getElementById('loc-story').textContent = "請移動到下個指定地點繼續探索";
        
        gameState.currentLocation = null;
        
        // 檢查是否完成所有地點
        if (gameState.visitedLocations.length === gameState.allLocations.length) {
            completeGame();
        }
        
    } else {
        showStatus("答案不正確，請再試一次或點擊「需要靈感？」獲得提示", "error");
    }
}

// 顯示提示
function showHint() {
    if (gameState.currentLocation && gameState.currentLocation.hint) {
        alert('提示：' + gameState.currentLocation.hint);
    } else {
        alert('這個地點暫時沒有提示。');
    }
}

// 更新進度顯示
function updateProgress() {
    const total = gameState.allLocations.length;
    const visited = gameState.visitedLocations.length;
    
    document.getElementById('progress-count').textContent = visited;
    document.getElementById('total-locations').textContent = total;
    
    // 更新進度條
    const progressFill = document.getElementById('progress-fill');
    const percentage = (visited / total) * 100;
    progressFill.style.width = percentage + '%';
}

// 完成遊戲
function completeGame() {
    alert('恭喜！您已完成所有地點的探索！\n請前往終點領取您的電子紀念證書。');
}

// 獲取GPS錯誤信息
function getGPSErrorMessage(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return "用戶拒絕了位置請求";
        case error.POSITION_UNAVAILABLE:
            return "位置信息不可用";
        case error.TIMEOUT:
            return "請求位置超時";
        default:
            return "未知錯誤";
    }
}

// 顯示狀態信息
function showStatus(message, type = "info") {
    console.log(`[${type}] ${message}`);
    // 可以在這裡添加狀態顯示邏輯
}

// 更新除錯信息
function updateDebugInfo() {
    const debugPos = document.getElementById('debug-pos');
    const debugNearby = document.getElementById('debug-nearby');
    
    if (gameState.userPosition) {
        debugPos.textContent = `${gameState.userPosition.lat.toFixed(4)}, ${gameState.userPosition.lng.toFixed(4)}`;
    }
    
    // 找出最近的地點
    if (gameState.userPosition) {
        let nearest = null;
        let minDist = Infinity;
        
        gameState.allLocations.forEach(loc => {
            const dist = calculateDistance(
                gameState.userPosition.lat, gameState.userPosition.lng,
                loc.lat, loc.lng
            );
            if (dist < minDist) {
                minDist = dist;
                nearest = loc.name;
            }
        });
        
        debugNearby.textContent = `${nearest} (${Math.round(minDist)}米)`;
    }
}

// 切換除錯信息顯示
function toggleDebug() {
    const debugInfo = document.getElementById('debug-info');
    debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
}

// 頁面載入完成後初始化遊戲
window.addEventListener('DOMContentLoaded', initGame);

// 頁面卸載時停止GPS
window.addEventListener('beforeunload', () => {
    if (gameState.watchId) {
        navigator.geolocation.clearWatch(gameState.watchId);
    }
});
