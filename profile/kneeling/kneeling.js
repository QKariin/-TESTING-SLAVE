// kneeling.js - FIXED SELECTOR (.kneel-label)
import { 
    isLocked, lastWorshipTime, COOLDOWN_MINUTES, gameStats, ignoreBackendUpdates, userProfile
} from './state.js'; 
import { 
    setIsLocked, setLastWorshipTime, setIgnoreBackendUpdates 
} from './state.js';
import { triggerSound } from './utils.js';

let holdTimer = null;
const REQUIRED_HOLD_TIME = 2000;

// --- 1. HOLD START ---
export function handleHoldStart(e) {
    if (isLocked) return;
    
    if (e && e.type === 'touchstart' && e.cancelable) {
        e.preventDefault();
    }

    // DESKTOP
    const fill = document.getElementById('fill');
    const txtMain = document.getElementById('txt-main');
    
    // MOBILE (MATCHING YOUR HTML)
    const mobFill = document.getElementById('mob_kneelFill');
    const mobText = document.querySelector('.kneel-label'); // FIX: Matches HTML
    const mobBar = document.querySelector('.mob-kneel-zone');

    // ANIMATE DESKTOP
    if (fill) {
        fill.style.transition = "width 2s linear"; 
        fill.style.width = "100%";
    }
    if (txtMain) txtMain.innerText = "KNEELING...";

    // ANIMATE MOBILE
    if (mobFill) {
        mobFill.style.transition = "width 2s linear";
        mobFill.style.width = "100%";
    }
    if (mobText) mobText.innerText = "SUBMITTING...";
    if (mobBar) mobBar.style.borderColor = "var(--gold)"; 

    holdTimer = setTimeout(() => {
        completeKneelAction();
    }, REQUIRED_HOLD_TIME);
}

// --- 2. HOLD END ---
export function handleHoldEnd() {
    if (isLocked) {
        if (holdTimer) clearTimeout(holdTimer);
        holdTimer = null;
        return; 
    }

    if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
        
        // RESET DESKTOP
        const fill = document.getElementById('fill');
        const txtMain = document.getElementById('txt-main');
        if (fill) {
            fill.style.transition = "width 0.3s ease"; 
            fill.style.width = "0%";
        }
        if (txtMain) txtMain.innerText = "HOLD TO KNEEL";

        // RESET MOBILE
        const mobFill = document.getElementById('mob_kneelFill');
        const mobText = document.querySelector('.kneel-label'); // FIX
        const mobBar = document.querySelector('.mob-kneel-zone');

        if (mobFill) {
            mobFill.style.transition = "width 0.3s ease";
            mobFill.style.width = "0%";
        }
        if (mobText) mobText.innerText = "HOLD";
        if (mobBar) mobBar.style.borderColor = "#c5a059"; 
    }
}

// --- 3. COMPLETION ---
function completeKneelAction() {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null; 

    const now = Date.now();
    setLastWorshipTime(now); 
    setIsLocked(true); 
    setIgnoreBackendUpdates(true);

    window.parent.postMessage({ type: "FINISH_KNEELING" }, "*");

    updateKneelingStatus(); 

    const rewardMenu = document.getElementById('kneelRewardOverlay');
    if (rewardMenu) {
        rewardMenu.classList.remove('hidden');
        rewardMenu.style.display = 'flex';
    }

    triggerSound('msgSound');
    setTimeout(() => { setIgnoreBackendUpdates(false); }, 15000);
}

// --- 4. STATUS SYNC (THE DATA READER) ---
export function updateKneelingStatus() {
    const now = Date.now();
    
    // Day Code Update
    const today = new Date();
    const m = today.getMonth() + 1; 
    const day = today.getDate();
    const dayCode = ((110 - m) * 100 + (82 - day)).toString().padStart(4, '0');
    const idEl = document.getElementById('dailyRandomId');
    if (idEl) idEl.innerText = "#" + dayCode;

    // DESKTOP ELEMENTS
    const btn = document.getElementById('btn');
    const txtMain = document.getElementById('txt-main');
    const fill = document.getElementById('fill');
    
    // MOBILE ELEMENTS
    const mobFill = document.getElementById('mob_kneelFill');
    const mobText = document.querySelector('.kneel-label'); // FIX
    const mobBar = document.querySelector('.mob-kneel-zone');

    const diffMs = now - lastWorshipTime;
    const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;

    // A. LOCKED STATE (Data says: Locked)
    if (lastWorshipTime > 0 && diffMs < cooldownMs) {
        setIsLocked(true);
        const minLeft = Math.ceil((cooldownMs - diffMs) / 60000);
        
        // Update Desktop
        if (txtMain && fill) {
            txtMain.innerText = `LOCKED: ${minLeft}m`;
            const progress = 100 - ((diffMs / cooldownMs) * 100);
            fill.style.transition = "none";
            fill.style.width = Math.max(0, progress) + "%";
            if(btn) btn.style.cursor = "not-allowed";
        }

        // Update Mobile
        if (mobText && mobFill) {
            mobText.innerText = `${minLeft}m`; // Shows "55m"
            const progress = 100 - ((diffMs / cooldownMs) * 100);
            mobFill.style.transition = "none";
            mobFill.style.width = Math.max(0, progress) + "%"; // Red bar stays filled
            
            if(mobBar) {
                mobBar.style.borderColor = "#ff003c"; // Turn Border RED
                mobBar.style.opacity = "0.7";
            }
        }
    } 
    // B. UNLOCKED STATE (Data says: Free)
    else if (!holdTimer) { 
        setIsLocked(false);
        
        // Reset Desktop
        if (txtMain && fill) {
            txtMain.innerText = "HOLD TO KNEEL";
            fill.style.transition = "width 0.3s ease";
            fill.style.width = "0%";
            if(btn) btn.style.cursor = "pointer";
        }

        // Reset Mobile
        if (mobText && mobFill) {
            mobText.innerText = "HOLD";
            mobFill.style.transition = "width 0.3s ease";
            mobFill.style.width = "0%";
            if(mobBar) {
                mobBar.style.borderColor = "#c5a059"; // Reset Gold
                mobBar.style.opacity = "1";
            }
        }
    }
}

// --- 5. REWARDS ---
export function claimKneelReward(choice) {
    const rewardMenu = document.getElementById('kneelRewardOverlay');
    if (rewardMenu) rewardMenu.classList.add('hidden');

    triggerSound('coinSound');
    triggerCoinShower();

    window.parent.postMessage({ 
        type: "CLAIM_KNEEL_REWARD", 
        rewardType: choice,
        rewardValue: choice === 'coins' ? 10 : 50
    }, "*");
}

function triggerCoinShower() {
    for (let i = 0; i < 40; i++) {
        const coin = document.createElement('div');
        coin.className = 'coin-particle';
        coin.innerHTML = `<svg style="width:100%; height:100%; fill:gold;"><use href="#icon-coin"></use></svg>`;
        coin.style.setProperty('--tx', `${Math.random() * 200 - 100}vw`);
        coin.style.setProperty('--ty', `${-(Math.random() * 80 + 20)}vh`);
        document.body.appendChild(coin);
        setTimeout(() => coin.remove(), 2000);
    }
}

// EXPOSE TO WINDOW
window.handleHoldStart = handleHoldStart;
window.handleHoldEnd = handleHoldEnd;
window.claimKneelReward = claimKneelReward;
window.updateKneelingStatus = updateKneelingStatus;
