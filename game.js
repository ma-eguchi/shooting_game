// ゲームの設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400;
canvas.height = 600;

// サウンドエフェクト
const sounds = {
    shoot: new Audio('https://www.soundjay.com/mechanical/sounds/laser-gun-19.mp3'),
    explosion: new Audio('https://www.soundjay.com/mechanical/sounds/explosion-01.mp3'),
    powerup: new Audio('https://www.soundjay.com/button/sounds/button-09.mp3'),
    bossBattle: new Audio('https://www.soundjay.com/mechanical/sounds/robot-movement-18.mp3')
};

// 音量調整
Object.values(sounds).forEach(sound => {
    sound.volume = 0.3;
});

// ゲーム状態
let score = 0;
let lives = 3;
let gameOver = false;
let gameSpeed = 2;
let enemySpawnRate = 0.02;
let lastTime = 0;
let enemySpeed = 3;
let bossSpawned = false;
let bossDefeated = false;
let bossSpawnScore = 500; // ボスが出現するスコア

// プレイヤー設定
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 70,
    width: 50,
    height: 50,
    speed: 5,
    color: '#00BFFF',
    bullets: [],
    lastShot: 0,
    shootDelay: 300, // ミリ秒
    powerLevel: 1,   // パワーレベル（1-3）
    powerUpTime: 0   // パワーアップの残り時間
};

// 敵の配列
const enemies = [];

// パワーアップアイテムの配列
const powerUps = [];

// ボス設定
const boss = {
    x: canvas.width / 2 - 75,
    y: -150,
    width: 150,
    height: 100,
    health: 100,
    maxHealth: 100,
    active: false,
    speed: 2,
    shootDelay: 1000,
    lastShot: 0,
    bullets: [],
    pattern: 0,
    patternTime: 0
};

// 入力制御
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false
};

// キー入力のイベントリスナー
window.addEventListener('keydown', (e) => {
    if (e.code in keys) {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
    }
});

// タッチ操作のサポート
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    // タッチで射撃
    shoot();
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    // 移動方向を計算
    const diffX = touchX - touchStartX;
    const diffY = touchY - touchStartY;
    
    // 横方向の移動
    if (diffX > 10) {
        player.x += player.speed;
    } else if (diffX < -10) {
        player.x -= player.speed;
    }
    
    // 縦方向の移動
    if (diffY > 10) {
        player.y += player.speed;
    } else if (diffY < -10) {
        player.y -= player.speed;
    }
    
    // 新しい位置を記録
    touchStartX = touchX;
    touchStartY = touchY;
});

// 弾を発射する関数
function shoot() {
    const now = Date.now();
    if (now - player.lastShot > player.shootDelay) {
        // パワーレベルに応じて弾の数と強さを変える
        switch(player.powerLevel) {
            case 1:
                // 通常の弾
                player.bullets.push({
                    x: player.x + player.width / 2 - 2.5,
                    y: player.y,
                    width: 5,
                    height: 15,
                    color: '#FF0',
                    speed: 7,
                    damage: 1
                });
                break;
            case 2:
                // 2発同時発射
                player.bullets.push({
                    x: player.x + player.width / 4 - 2.5,
                    y: player.y,
                    width: 5,
                    height: 15,
                    color: '#FF0',
                    speed: 7,
                    damage: 1
                });
                player.bullets.push({
                    x: player.x + player.width * 3/4 - 2.5,
                    y: player.y,
                    width: 5,
                    height: 15,
                    color: '#FF0',
                    speed: 7,
                    damage: 1
                });
                break;
            case 3:
                // 3発同時発射（強化版）
                player.bullets.push({
                    x: player.x + player.width / 2 - 2.5,
                    y: player.y,
                    width: 5,
                    height: 20,
                    color: '#F00',
                    speed: 9,
                    damage: 2
                });
                player.bullets.push({
                    x: player.x + player.width / 4 - 2.5,
                    y: player.y + 10,
                    width: 5,
                    height: 15,
                    color: '#FF0',
                    speed: 7,
                    damage: 1
                });
                player.bullets.push({
                    x: player.x + player.width * 3/4 - 2.5,
                    y: player.y + 10,
                    width: 5,
                    height: 15,
                    color: '#FF0',
                    speed: 7,
                    damage: 1
                });
                break;
        }
        
        // 発射音を再生
        sounds.shoot.currentTime = 0;
        sounds.shoot.play().catch(e => console.log("Audio play failed:", e));
        
        player.lastShot = now;
    }
}

// 敵を生成する関数
function spawnEnemy() {
    // ボスが出現中は通常の敵を出さない
    if (boss.active) return;
    
    if (Math.random() < enemySpawnRate) {
        const size = 30 + Math.random() * 20;
        enemies.push({
            x: Math.random() * (canvas.width - size),
            y: -size,
            width: size,
            height: size,
            color: `hsl(${Math.random() * 360}, 50%, 50%)`,
            speed: enemySpeed,
            health: 1 // 通常の敵は1ヒットで倒れる
        });
    }
    
    // ボスの出現チェック
    spawnBoss();
}

// 衝突判定
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// ゲームオーバー処理
function handleGameOver() {
    document.getElementById('gameOver').classList.remove('hidden');
    document.getElementById('finalScore').textContent = score;
    gameOver = true;
}

// ゲームをリセット
function resetGame() {
    score = 0;
    lives = 3;
    gameOver = false;
    enemies.length = 0;
    powerUps.length = 0;
    player.bullets.length = 0;
    boss.bullets.length = 0;
    boss.active = false;
    bossSpawned = false;
    bossDefeated = false;
    bossSpawnScore = 500;
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 70;
    player.powerLevel = 1;
    player.powerUpTime = 0;
    enemySpeed = 3;
    gameSpeed = 2;
    enemySpawnRate = 0.02;
    
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('score').textContent = `スコア: ${score}`;
    document.getElementById('lives').textContent = `ライフ: ${lives}`;
    
    requestAnimationFrame(gameLoop);
}

// リスタートボタンのイベントリスナー
document.getElementById('restartButton').addEventListener('click', resetGame);

// ゲームループ
function gameLoop(timestamp) {
    // デルタタイム計算
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    if (gameOver) return;
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // プレイヤーの移動
    if (keys.ArrowLeft && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys.ArrowRight && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    if (keys.ArrowUp && player.y > 0) {
        player.y -= player.speed;
    }
    if (keys.ArrowDown && player.y < canvas.height - player.height) {
        player.y += player.speed;
    }
    
    // スペースキーで射撃
    if (keys.Space) {
        shoot();
    }
    
    // パワーアップの時間経過
    if (player.powerLevel > 1 && player.powerUpTime > 0) {
        player.powerUpTime -= deltaTime;
        if (player.powerUpTime <= 0) {
            player.powerLevel = 1;
        }
    }
    
    // プレイヤーの描画
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // パワーレベル表示
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText(`Power: ${player.powerLevel}`, 10, 20);
    if (player.powerUpTime > 0) {
        ctx.fillText(`Time: ${Math.ceil(player.powerUpTime / 1000)}s`, 10, 40);
    }
    
    // 弾の更新と描画
    for (let i = player.bullets.length - 1; i >= 0; i--) {
        const bullet = player.bullets[i];
        bullet.y -= bullet.speed;
        
        // 画面外に出た弾を削除
        if (bullet.y + bullet.height < 0) {
            player.bullets.splice(i, 1);
            continue;
        }
        
        // 弾の描画
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        
        // ボスとの衝突判定
        if (boss.active && checkCollision(bullet, boss)) {
            boss.health -= bullet.damage;
            player.bullets.splice(i, 1);
            
            // ボスを倒した場合
            if (boss.health <= 0) {
                boss.active = false;
                bossDefeated = true;
                score += 200;
                document.getElementById('score').textContent = `スコア: ${score}`;
                
                // 爆発音を再生
                sounds.explosion.currentTime = 0;
                sounds.explosion.play().catch(e => console.log("Audio play failed:", e));
                
                // ボスを倒したらパワーアップアイテムを確実に出す
                spawnPowerUp(boss.x + boss.width / 2, boss.y + boss.height / 2);
                
                // 次のボスの準備
                bossSpawnScore += 500;
                bossSpawned = false;
            }
            continue;
        }
        
        // 敵との衝突判定
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullet, enemies[j])) {
                // 敵のヘルスを減らす
                enemies[j].health -= bullet.damage;
                
                // 敵を倒した場合
                if (enemies[j].health <= 0) {
                    // 爆発音を再生
                    sounds.explosion.currentTime = 0;
                    sounds.explosion.play().catch(e => console.log("Audio play failed:", e));
                    
                    // パワーアップアイテムの生成
                    spawnPowerUp(enemies[j].x + enemies[j].width / 2, enemies[j].y + enemies[j].height / 2);
                    
                    // スコア加算
                    score += 10;
                    document.getElementById('score').textContent = `スコア: ${score}`;
                    enemies.splice(j, 1);
                }
                
                player.bullets.splice(i, 1);
                break;
            }
        }
    }
    
    // 敵の生成
    spawnEnemy();
    
    // 敵の更新と描画
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.y += enemy.speed;
        
        // 画面外に出た敵を削除
        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
            lives--;
            document.getElementById('lives').textContent = `ライフ: ${lives}`;
            
            if (lives <= 0) {
                handleGameOver();
                return;
            }
            continue;
        }
        
        // 敵の描画
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // プレイヤーとの衝突判定
        if (checkCollision(player, enemy)) {
            lives--;
            document.getElementById('lives').textContent = `ライフ: ${lives}`;
            enemies.splice(i, 1);
            
            // 爆発音を再生
            sounds.explosion.currentTime = 0;
            sounds.explosion.play().catch(e => console.log("Audio play failed:", e));
            
            if (lives <= 0) {
                handleGameOver();
                return;
            }
        }
    }
    
    // パワーアップアイテムの更新と描画
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.y += powerUp.speed;
        
        // 画面外に出たアイテムを削除
        if (powerUp.y > canvas.height) {
            powerUps.splice(i, 1);
            continue;
        }
        
        // アイテムの描画
        ctx.fillStyle = powerUp.type === 'power' ? '#0F0' : '#0FF';
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, powerUp.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // プレイヤーとの衝突判定
        if (checkCollision(player, powerUp)) {
            if (powerUp.type === 'power') {
                // パワーアップ
                player.powerLevel = Math.min(player.powerLevel + 1, 3);
                player.powerUpTime = 10000; // 10秒間
            } else {
                // 1UP
                lives++;
                document.getElementById('lives').textContent = `ライフ: ${lives}`;
            }
            
            // パワーアップ音を再生
            sounds.powerup.currentTime = 0;
            sounds.powerup.play().catch(e => console.log("Audio play failed:", e));
            
            powerUps.splice(i, 1);
        }
    }
    
    // ボスの更新と描画
    if (boss.active) {
        // ボスの移動
        if (boss.y < 50) {
            boss.y += 1; // 登場
        } else {
            // 左右に動く
            boss.x += Math.sin(timestamp / 1000) * boss.speed;
            
            // 画面外に出ないように
            if (boss.x < 0) boss.x = 0;
            if (boss.x > canvas.width - boss.width) boss.x = canvas.width - boss.width;
            
            // 弾を発射
            bossShoot();
        }
        
        // ボスの描画
        ctx.fillStyle = '#F00';
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        
        // ボスのHPバー
        const hpBarWidth = boss.width;
        const hpBarHeight = 10;
        const hpRatio = boss.health / boss.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(boss.x, boss.y - hpBarHeight - 5, hpBarWidth, hpBarHeight);
        ctx.fillStyle = '#0F0';
        ctx.fillRect(boss.x, boss.y - hpBarHeight - 5, hpBarWidth * hpRatio, hpBarHeight);
        
        // ボスの弾の更新と描画
        for (let i = boss.bullets.length - 1; i >= 0; i--) {
            const bullet = boss.bullets[i];
            bullet.x += bullet.speedX;
            bullet.y += bullet.speedY;
            
            // 画面外に出た弾を削除
            if (bullet.y > canvas.height || bullet.x < 0 || bullet.x > canvas.width) {
                boss.bullets.splice(i, 1);
                continue;
            }
            
            // 弾の描画
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // プレイヤーとの衝突判定
            if (checkCollision(player, bullet)) {
                lives--;
                document.getElementById('lives').textContent = `ライフ: ${lives}`;
                boss.bullets.splice(i, 1);
                
                // 爆発音を再生
                sounds.explosion.currentTime = 0;
                sounds.explosion.play().catch(e => console.log("Audio play failed:", e));
                
                if (lives <= 0) {
                    handleGameOver();
                    return;
                }
            }
        }
    }
    
    // 難易度の調整（スコアに応じて）
    if (score > 100) enemySpawnRate = 0.03;
    if (score > 300) enemySpawnRate = 0.04;
    if (score > 500) {
        enemySpawnRate = 0.05;
        enemySpeed = 4;
    }
    if (score > 1000) {
        enemySpawnRate = 0.06;
        enemySpeed = 5;
    }
    
    // 次のフレームを要求
    requestAnimationFrame(gameLoop);
}

// ゲーム開始
window.onload = () => {
    document.getElementById('score').textContent = `スコア: ${score}`;
    document.getElementById('lives').textContent = `ライフ: ${lives}`;
    requestAnimationFrame(gameLoop);
};
// パワーアップアイテムを生成する関数
function spawnPowerUp(x, y) {
    if (Math.random() < 0.2) { // 20%の確率でパワーアップアイテムを出現
        powerUps.push({
            x: x,
            y: y,
            width: 20,
            height: 20,
            color: '#0F0',
            speed: 2,
            type: Math.random() < 0.7 ? 'power' : 'life' // 70%の確率でパワーアップ、30%の確率で1UP
        });
    }
}

// ボスを生成する関数
function spawnBoss() {
    if (!bossSpawned && score >= bossSpawnScore) {
        boss.active = true;
        boss.health = boss.maxHealth;
        boss.x = canvas.width / 2 - boss.width / 2;
        boss.y = -boss.height;
        bossSpawned = true;
        
        // ボス登場音を再生
        sounds.bossBattle.currentTime = 0;
        sounds.bossBattle.play().catch(e => console.log("Audio play failed:", e));
    }
}

// ボスの弾を発射する関数
function bossShoot() {
    const now = Date.now();
    if (now - boss.lastShot > boss.shootDelay) {
        // パターンに応じて弾の発射方法を変える
        switch(boss.pattern) {
            case 0: // 前方3発
                for (let i = -1; i <= 1; i++) {
                    boss.bullets.push({
                        x: boss.x + boss.width / 2 + i * 30,
                        y: boss.y + boss.height,
                        width: 10,
                        height: 10,
                        color: '#F00',
                        speedX: i * 1,
                        speedY: 5
                    });
                }
                break;
            case 1: // 扇状に5発
                for (let i = -2; i <= 2; i++) {
                    boss.bullets.push({
                        x: boss.x + boss.width / 2,
                        y: boss.y + boss.height,
                        width: 8,
                        height: 8,
                        color: '#F0F',
                        speedX: i * 2,
                        speedY: 4
                    });
                }
                break;
            case 2: // 全方向8発
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    boss.bullets.push({
                        x: boss.x + boss.width / 2,
                        y: boss.y + boss.height / 2,
                        width: 6,
                        height: 6,
                        color: '#FF0',
                        speedX: Math.cos(angle) * 3,
                        speedY: Math.sin(angle) * 3
                    });
                }
                break;
        }
        
        boss.lastShot = now;
    }
    
    // パターン変更
    boss.patternTime++;
    if (boss.patternTime > 100) {
        boss.pattern = (boss.pattern + 1) % 3;
        boss.patternTime = 0;
    }
}
