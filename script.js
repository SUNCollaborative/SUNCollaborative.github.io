const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");

const coinImg = document.getElementById("coinImg");
const dumpsterNoFireImg = document.getElementById("dumpsterNoFireImg");
const dumpsterImg = document.getElementById("dumpsterImg");
const piggyBankImg = document.getElementById("piggyBankImg");
const resetImg = document.getElementById("resetImg");
const logoImg = document.getElementById("logoImg");

const coinDropSound = document.getElementById("coinDropSound");
const cashRegisterSound = document.getElementById("cashRegisterSound");

// For lerp animatinos
const ANIM_SPEED = 0.2;

const SIDEBAR_FRACTION = 0.25;

const RESET_SPACE_FRACTION = 0.1;
const RESET_FRACTION = 0.075;

const LOGO_FRACTION = 0.1;
const LOGO_PADDING_FRACTION = 0.01;

const NUM_COINS = 10;
const TOTAL_COINS_FRACTION = 1 - RESET_SPACE_FRACTION;
const COIN_FRACTION = (TOTAL_COINS_FRACTION / NUM_COINS) * 0.9;
const COIN_GAP_FRACTION = (TOTAL_COINS_FRACTION / NUM_COINS) * 0.1;

const DUMSPTER_HEIGHT_SPACE_FRACTION = 0.5;
const PIGGY_BANK_HEIGHT_SPACE_FRACTION = 0.5;
const DUMPSTER_HEIGHT_FRACTION = 0.5 * 0.8;
const PIGGY_BANK_HEIGHT_FRACTION = 0.5 * 0.8;
const DUMPSTER_WIDTH_FRACTION = (1 - SIDEBAR_FRACTION) * 0.8;
const PIGGY_BANK_WIDTH_FRACTION = (1 - SIDEBAR_FRACTION) * 0.8;

const DUMPSTER_FIRE_THRESHOLD = 5;

const TEXT_FRACTION = 0.05;
const DUMPSTER_TEXT_X_FRACTION = 1.0;
const DUMPSTER_TEXT_Y_FRACTION = 0.9;
const PIGGY_BANK_TEXT_X_FRACTION = 0.8;
const PIGGY_BANK_TEXT_Y_FRACTION = 0.8;

const DUMPSTER_BOUNCE_HEIGHT = 0.005;
const DUMPSTER_COIN_GET_OFFSET = 0.05;
const PIGGY_BANK_BOUNCE_HEIGHT = 0.005;
const PIGGY_BANK_COIN_GET_OFFSET = 0.05;

const DUMPSTER_BOUNCE_FREQ = 2 + Math.random();
const PIGGY_BANK_BOUNCE_FREQ = 1 + Math.random();

let dumpsterTargetYOffset = 0;
let dumpsterYOffset = 0;

let piggyBankTargetYOffset = 0;
let piggyBankYOffset = 0;

let coins = [];
let coinAnimations = [];
let activeCoin = -1;

let numDumpsterCoins = 0;
let numPiggyBankCoins = 0;

let resetDrawAngle = 0;
let resetDrawRadius = canvas.height * (RESET_FRACTION * 0.5);
let clickingReset = false;

let firstReset = true;
function reset() {
    numDumpsterCoins = 0;
    numPiggyBankCoins = 0;

    coinAnimations = [];
    coins = [];
    for (let i = 0; i < NUM_COINS; i++) {
        coins.push(new Coin());
    }

    // No animation on first reset
    if (firstReset) {
        firstReset = false;
        return;
    }

    // Rotation Animation
    const intervalTime = 20;
    const totalTime = 500;
    let runningTime = 0;
    const rotateInterval = setInterval(() => {
        const t = runningTime / totalTime;
        // Cubic ease in out
        const fraction = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        resetDrawAngle = -2 * Math.PI * fraction;

        runningTime += intervalTime;
    }, intervalTime);
    setTimeout(() => {
        clearInterval(rotateInterval);
        resetDrawAngle = 0;
    }, totalTime);
}

let mouseX = 0;
let mouseY = 0;

function getDumpsterRect() {
    const dumpsterWidth = canvas.width * DUMPSTER_WIDTH_FRACTION;
    const dumpsterHeight = canvas.height * DUMPSTER_HEIGHT_FRACTION;
    const dumpsterSpacing = canvas.height * DUMSPTER_HEIGHT_SPACE_FRACTION - dumpsterHeight;

    const mainMid = canvas.width * SIDEBAR_FRACTION + canvas.width * (1 - SIDEBAR_FRACTION) * 0.5;

    return {
        x: mainMid - dumpsterWidth * 0.5,
        y: dumpsterSpacing * 0.5,
        w: dumpsterWidth,
        h: dumpsterHeight
    };
}
function getPiggyBankRect() {
    const piggyBankWidth = canvas.width * PIGGY_BANK_WIDTH_FRACTION;
    const piggyBankHeight = canvas.height * PIGGY_BANK_HEIGHT_FRACTION;
    const piggyBankSpacing = canvas.height * PIGGY_BANK_HEIGHT_SPACE_FRACTION - piggyBankHeight;

    const mainMid = canvas.width * SIDEBAR_FRACTION + canvas.width * (1 - SIDEBAR_FRACTION) * 0.5;

    return {
        x: mainMid - piggyBankWidth * 0.5,
        y: canvas.height - piggyBankSpacing * 0.5 - piggyBankHeight,
        w: piggyBankWidth,
        h: piggyBankHeight
    };
}

function getResetCircle() {
    return {
        x: canvas.width * (SIDEBAR_FRACTION * 0.5),
        y: canvas.height * (RESET_SPACE_FRACTION * 0.5),
        r: canvas.height * (RESET_FRACTION * 0.5)
    };
}

function circleCollidePoint(cx, cy, radius, x, y) {
    return Math.sqrt(Math.pow(cx - x, 2) + Math.pow(cy - y, 2)) <= radius;
}

function circleObjCollidePoint(circle, x, y) {
    return Math.sqrt(Math.pow(circle.x - x, 2) + Math.pow(circle.y - y, 2)) <= circle.r;
}

// https://www.jeffreythompson.org/collision-detection/circle-rect.php
function circleCollideRect(cx, cy, radius, rx, ry, rw, rh) {
  // temporary variables to set edges for testing
  let testX = cx;
  let testY = cy;

  // which edge is closest?
  if (cx < rx)         testX = rx;      // test left edge
  else if (cx > rx+rw) testX = rx+rw;   // right edge
  if (cy < ry)         testY = ry;      // top edge
  else if (cy > ry+rh) testY = ry+rh;   // bottom edge

  // get distance from closest edges
  const distX = cx-testX;
  const distY = cy-testY;
  const distance = Math.sqrt( (distX*distX) + (distY*distY) );

  // if the distance is less than the radius, collision!
  if (distance <= radius) {
    return true;
  }
  return false;
}

function mouseDown() {
    if (circleObjCollidePoint(getResetCircle(), mouseX, mouseY)) {
        clickingReset = true;
        return;
    }

    const coinRadius = canvas.height * (COIN_FRACTION * 0.5);
    for (let i = 0; i < coins.length; i++) {
        if (circleCollidePoint(coins[i].x, coins[i].y, coinRadius, mouseX, mouseY)) {
            activeCoin = i;
            break;
        }
    }
}

function mouseUp() {
    if (circleObjCollidePoint(getResetCircle(), mouseX, mouseY)) {
        clickingReset = false;
        reset();
        return;
    }
    
    const piggyBankRect = getPiggyBankRect();

    if (activeCoin != -1) {
        const coinRadius = canvas.height * (COIN_FRACTION * 0.5);
        const dumpsterRect = getDumpsterRect();

        // The coin animation increments the coin counters
        if (circleCollideRect(mouseX, mouseY, coinRadius, piggyBankRect.x, piggyBankRect.y, piggyBankRect.w, piggyBankRect.h)) {
            const anim = new CoinAnimation(coins[activeCoin].x, coins[activeCoin].y, coinRadius, piggyBankRect.x + piggyBankRect.w * 0.5, piggyBankRect.y + piggyBankRect.h * 0.3, false);
            coinAnimations.push(anim);

            coins.splice(activeCoin, 1);
        } else if (circleCollideRect(mouseX, mouseY, coinRadius, dumpsterRect.x, dumpsterRect.y, dumpsterRect.w, dumpsterRect.h)) {
            const anim = new CoinAnimation(coins[activeCoin].x, coins[activeCoin].y, coinRadius, dumpsterRect.x + dumpsterRect.w * 0.5, dumpsterRect.y + dumpsterRect.h * 0.3, true);
            coinAnimations.push(anim);

            coins.splice(activeCoin, 1);
        }
    } else if (circleCollideRect(mouseX, mouseY, 1, piggyBankRect.x, piggyBankRect.y, piggyBankRect.w, piggyBankRect.h)) {
        if (coins.length < NUM_COINS && numPiggyBankCoins > 0) {
            numPiggyBankCoins--;
            coins.push(new Coin());
            coins[coins.length - 1].x = piggyBankRect.x + piggyBankRect.w * 0.5;
            coins[coins.length - 1].y = piggyBankRect.y + piggyBankRect.h * 0.5;
        }
        piggyBankTargetYOffset = canvas.height * PIGGY_BANK_COIN_GET_OFFSET * 0.5;
    }

    activeCoin = -1;
}

window.onmousemove = (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
}

window.onmousedown = (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    mouseDown();
}

window.onmouseup = (e) => {
    mouseUp();
}

let activeTouch = -1;

window.ontouchstart = (e) => {
    e.preventDefault();

    if (activeTouch == -1) {
        activeTouch = e.changedTouches[0].identifier;
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier == activeTouch) {
            mouseX = e.changedTouches[i].clientX;
            mouseY = e.changedTouches[i].clientY;
            
            mouseDown();
            break;
        }
    }
}
window.ontouchmove = (e) => {
    e.preventDefault();
    
    if (activeTouch == -1) {
        return;
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier == activeTouch) {
            mouseX = e.changedTouches[i].clientX;
            mouseY = e.changedTouches[i].clientY;
        }
    }
}
function touchEnd(e) {
    e.preventDefault();
    
    if (activeTouch == -1) {
        return;
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier == activeTouch) {
            mouseX = e.changedTouches[i].clientX;
            mouseY = e.changedTouches[i].clientY;
            
            mouseUp();
            
            mouseX = 0;
            mouseY = 0;

            activeTouch = -1;
        }
    }
}
window.ontouchend = touchEnd;
window.ontouchcancel = touchEnd;

const RINGS1_DELTA = canvas.height * 0.3;
const RINGS1_OFFSET_X = -0.3;
const RINGS1_OFFSET_Y = -0.1;

const RINGS2_DELTA = canvas.height * 0.2;
const RINGS2_OFFSET_X = -0.1;
const RINGS2_OFFSET_Y = 1.05;

const starTime = Date.now();

function drawBackground() {
    ctx.fillStyle = "#010630";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#01136D";

    const rings1CenterX = Math.max(-250, canvas.width * RINGS1_OFFSET_X);
    const rings1CenterY = canvas.height * RINGS1_OFFSET_Y;

    const rings2CenterX = canvas.width * RINGS2_OFFSET_X;
    const rings2CenterY = canvas.height * RINGS2_OFFSET_Y;

    ctx.lineWidth = 10;

    const numRings1 = Math.floor(canvas.height * 0.75 / RINGS1_DELTA);
    for (let i = 0; i < numRings1; i++) {
        ctx.beginPath();
        ctx.arc(rings1CenterX, rings1CenterY, RINGS1_DELTA * i, 0, 2 * Math.PI);
        ctx.stroke();
    }

    ctx.lineWidth = 5;

    const numRings2 = Math.floor(canvas.height * 0.5 / RINGS2_DELTA);
    for (let i = 0; i < numRings2; i++) {
        ctx.beginPath();
        ctx.arc(rings2CenterX, rings2CenterY, RINGS2_DELTA * i, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

function drawCircle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
}

function Coin() {
    this.x = 0;
    // This makes the spawning animation a bit nicer
    this.y = canvas.height / 2; 

    this.active = false;
    this.radius = canvas.height * (COIN_FRACTION * 0.5);

    this.calcPosition = (num_inactive, index) => {
        const total_coins_height = canvas.height * (COIN_FRACTION + COIN_GAP_FRACTION) * num_inactive;
        const middle = canvas.height * RESET_SPACE_FRACTION + canvas.height * TOTAL_COINS_FRACTION * 0.5;
        const coins_top = middle - total_coins_height * 0.5;
        const radius = canvas.height * (COIN_FRACTION * 0.5);

        const targetX = canvas.width * SIDEBAR_FRACTION * 0.5;
        const targetY = coins_top + canvas.height * (COIN_FRACTION + COIN_GAP_FRACTION) * index + radius;

        this.x = (targetX - this.x) * ANIM_SPEED + this.x;
        this.y = (targetY - this.y) * ANIM_SPEED + this.y;
    }

    // index is only for non-active coins
    this.update = (num_inactive, index, active) => {
        if (active) {
            this.x = mouseX;
            this.y = mouseY;

            if (!this.active) {
                this.active = true;
                this.activeTime = Date.now();
            }
        } else {
            this.active = false;
            this.calcPosition(num_inactive, index);
        }

        let targetRadius = canvas.height * (COIN_FRACTION * 0.5);

        if (circleCollidePoint(this.x, this.y, targetRadius, mouseX, mouseY)) {
            targetRadius *= 0.9;
        }

        this.radius = (targetRadius - this.radius) * ANIM_SPEED + this.radius;
    }

    // set ctx.fillStyle before calling
    this.draw = () => {
        ctx.drawImage(coinImg, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    }
}

const COIN_GRAVITY = 1500;
function CoinAnimation(x, y, radius, targetX, targetY, isDumpster, time=0.5) {
    this.x = x;
    this.y = y;

    this.velX = (targetX - x) / time;
    this.velY = (targetY - y - 0.5 * COIN_GRAVITY * time * time) / time;

    this.runningTime = 0;
    this.finished = false;

    this.update = (delta) => {
        const t = this.runningTime / time;

        this.velY += COIN_GRAVITY * delta;

        this.x += this.velX * delta;
        this.y += this.velY * delta;

        this.runningTime += delta;

        if (this.runningTime >= time) {
            this.finished = true;

            if (isDumpster) {
                numDumpsterCoins++;
                dumpsterTargetYOffset = canvas.height * DUMPSTER_COIN_GET_OFFSET;

                coinDropSound.play();
            } else {
                numPiggyBankCoins++;
                piggyBankTargetYOffset = canvas.height * PIGGY_BANK_COIN_GET_OFFSET;

                cashRegisterSound.play();
            }
        }
    }

    this.draw = () => {
        ctx.drawImage(coinImg, this.x - radius, this.y - radius, radius * 2, radius * 2);
    }
}

function start() {
    reset();
}

let totalTime = 0;
let prevTime = performance.now();
function loop(curTime) {
    const delta = (curTime - prevTime) / 1000;
    totalTime += delta;
    prevTime = curTime;

    const num_inactive = activeCoin == -1 ? coins.length : coins.length - 1;
    let index = 0;
    for (let i = 0; i < coins.length; i++) {
        if (activeCoin == i) {
            coins[i].update(num_inactive, -1, true);
        } else {
            coins[i].update(num_inactive, index, false);
            index++;
        }
    }

    for (let i = coinAnimations.length - 1; i >= 0; i--) {
        coinAnimations[i].update(delta);

        if (coinAnimations[i].finished) {
            coinAnimations.splice(i, 1);
        }
    }

    drawBackground();

    // Drawing dumpster and piggy bank
    const dumpsterRect = getDumpsterRect();
    const piggyBankRect = getPiggyBankRect();

    const dumpsterDrawWidth = dumpsterRect.h * (dumpsterImg.width / dumpsterImg.height);
    const curDumpsterImg = numDumpsterCoins > DUMPSTER_FIRE_THRESHOLD ? dumpsterImg : dumpsterNoFireImg;
    const dumpsterX = dumpsterRect.x + dumpsterRect.w * 0.5;
    const dumpsterY = dumpsterRect.y + dumpsterYOffset + dumpsterRect.h * 0.5 + Math.sin(DUMPSTER_BOUNCE_FREQ * totalTime) * canvas.height * DUMPSTER_BOUNCE_HEIGHT;

    dumpsterYOffset = (dumpsterTargetYOffset - dumpsterYOffset) * 0.1 + dumpsterYOffset;
    if (Math.abs(dumpsterYOffset - dumpsterTargetYOffset) < canvas.height * 0.001) {
        dumpsterTargetYOffset = 0;
    }

    ctx.translate(dumpsterX, dumpsterY);
    ctx.drawImage(curDumpsterImg, -dumpsterDrawWidth * 0.5, -dumpsterRect.h * 0.5, dumpsterDrawWidth, dumpsterRect.h);
    ctx.translate(-dumpsterX, -dumpsterY);

    const piggyBankDrawWidth = piggyBankRect.h * (piggyBankImg.width / piggyBankImg.height);
    const piggyBankX = piggyBankRect.x + piggyBankRect.w * 0.5;
    const piggyBankY = piggyBankRect.y + piggyBankYOffset + piggyBankRect.h * 0.5 + Math.sin(PIGGY_BANK_BOUNCE_FREQ * totalTime) * canvas.height * PIGGY_BANK_BOUNCE_HEIGHT;

    piggyBankYOffset = (piggyBankTargetYOffset - piggyBankYOffset) * 0.09 + piggyBankYOffset;
    if (Math.abs(piggyBankYOffset - piggyBankTargetYOffset) < canvas.height * 0.001) {
        piggyBankTargetYOffset = 0;
    }

    ctx.translate(piggyBankX, piggyBankY);
    ctx.drawImage(piggyBankImg, -piggyBankDrawWidth * 0.5, -piggyBankRect.h * 0.5, piggyBankDrawWidth, piggyBankRect.h);
    ctx.translate(-piggyBankX, -piggyBankY);

    const fontSize = canvas.height * TEXT_FRACTION;

    ctx.fillStyle = "#c5c9f5";
    drawCircle(dumpsterRect.x + dumpsterRect.w * DUMPSTER_TEXT_X_FRACTION, dumpsterRect.y + dumpsterRect.h * DUMPSTER_TEXT_Y_FRACTION, fontSize);
    drawCircle(piggyBankRect.x + piggyBankRect.w * PIGGY_BANK_TEXT_X_FRACTION, piggyBankRect.y + piggyBankRect.h * PIGGY_BANK_TEXT_Y_FRACTION, fontSize);

    // Drawing coin amounts
    ctx.fillStyle = "#08275e";
    ctx.font = `${fontSize}px sans serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    ctx.fillText(`${numDumpsterCoins}`, dumpsterRect.x + dumpsterRect.w * DUMPSTER_TEXT_X_FRACTION, dumpsterRect.y + dumpsterRect.h * DUMPSTER_TEXT_Y_FRACTION);
    ctx.fillText(`${numPiggyBankCoins}`, piggyBankRect.x + piggyBankRect.w * PIGGY_BANK_TEXT_X_FRACTION, piggyBankRect.y + piggyBankRect.h * PIGGY_BANK_TEXT_Y_FRACTION);

    const sidebarMid = canvas.width * (SIDEBAR_FRACTION * 0.5);

    // Reset button
    let targetRadius = canvas.height * (RESET_FRACTION * 0.5);

    if (clickingReset) {
        targetRadius *= 0.9;
    } else if (circleObjCollidePoint(getResetCircle(), mouseX, mouseY)) {
        targetRadius *= 0.95;
    }

    resetDrawRadius = (targetRadius - resetDrawRadius) * ANIM_SPEED + resetDrawRadius;
    const resetX = sidebarMid;
    const resetY = canvas.height * (RESET_SPACE_FRACTION * 0.5);

    ctx.translate(resetX, resetY);
    ctx.rotate(resetDrawAngle);
    ctx.drawImage(resetImg, -resetDrawRadius, -resetDrawRadius, resetDrawRadius * 2, resetDrawRadius * 2);
    ctx.rotate(-resetDrawAngle);
    ctx.translate(-resetX, -resetY);

    for (let i = 0; i < coinAnimations.length; i++) {
        coinAnimations[i].draw();
    }

    // Coins
    ctx.fillStyle = "yellow";
    for (let i = 0; i < coins.length; i++) {
        coins[i].draw();
    }

    // Logo
    ctx.drawImage(logoImg, canvas.width - canvas.height * (LOGO_FRACTION + LOGO_PADDING_FRACTION), canvas.height * LOGO_PADDING_FRACTION, canvas.height * LOGO_FRACTION, canvas.height * LOGO_FRACTION);

    window.requestAnimationFrame(loop);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resize();
window.onresize = resize;
window.requestAnimationFrame(loop);

start();
