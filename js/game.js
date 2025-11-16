// 遊戲狀態
let gameState = {
    currentLocation: null,
    visitedLocations: [],
    allLocations: []
};

// 初始化遊戲
async function initGame() {
    try {
        // 載入地點資料
        const response = await fetch('data/locations.json');
        const data = await response.json();
        gameState.allLocations = data.locations;
        
        // 更新進度顯示
        updateProgress();
        
        // 開始GPS監聽
        startLocationTracking();
        
        // 隱藏載入畫面，顯示遊戲界面
        document.getElementById('loading').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        
    } catch (error) {
        console.error('初始化失敗:', error);
        alert('遊戲載入失敗，請刷新頁面重試');
    }
}

// 更新進度顯示
function updateProgress() {
    const total = gameState.allLocations.length;
    const visited = gameState.visitedLocations.length;
    
    document.getElementById('progress-count').textContent = visited;
    document.getElementById('total-locations').textContent = total;
    
    // 更新進度條
    const progressBar = document.getElementById('progress-bar');
    const percentage = (visited / total) * 100;
    progressBar.style.width = percentage + '%';
    progressBar.style.background = '#4CAF50';
    progressBar.style.height = '20px';
    progressBar.style.transition = 'width 0.5s';
}

// 檢查答案
function checkAnswer() {
    const userAnswer = document.getElementById('answer-input').value.trim();
    const correctAnswer = gameState.currentLocation.answer;
    
    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
        // 答案正確
        if (!gameState.visitedLocations.includes(gameState.currentLocation.id)) {
            gameState.visitedLocations.push(gameState.currentLocation.id);
            updateProgress();
        }
        
        alert('答案正確！恭喜您完成這個地點的探索。');
        document.getElementById('answer-input').value = '';
        
        // 檢查是否完成所有地點
        if (gameState.visitedLocations.length === gameState.allLocations.length) {
            completeGame();
        }
        
    } else {
        alert('答案不正確，請再試一次或點擊「需要靈感？」獲得提示。');
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

// 完成遊戲
function completeGame() {
    alert('恭喜！您已完成所有地點的探索！\n請前往終點領取您的電子紀念證書。');
    // 這裡可以跳轉到證書頁面
}

// 頁面載入完成後初始化遊戲
window.addEventListener('DOMContentLoaded', initGame);
