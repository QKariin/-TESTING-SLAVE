// tasks.js - WITH PUNISHMENT OVERLAY & TRASH TALK

import { 
    currentTask, pendingTaskState, taskDatabase, taskQueue, gameStats, 
    resetUiTimer, cooldownInterval, taskJustFinished, ignoreBackendUpdates,
    setCurrentTask, setPendingTaskState, setGameStats, 
    setIgnoreBackendUpdates, setTaskJustFinished, setResetUiTimer, setCooldownInterval
} from './state.js';
import { triggerSound } from './utils.js';

// Fallback Trash Talk (If CMS is empty)
const DEFAULT_TRASH = [
    "Pathetic. Pay the price.",
    "Disappointing as always.",
    "Your failure feeds me.",
    "Try harder next time, worm.",
    "Obedience is not optional."
];

export function getRandomTask() {
    if (gameStats.coins < 300) {
        triggerSound('sfx-deny');
        alert("You are too poor to serve. Earn 300 coins first.");
        return;
    }

    setIgnoreBackendUpdates(true);
    if (resetUiTimer) { clearTimeout(resetUiTimer); setResetUiTimer(null); }
    
    let taskText = "AWAITING DIRECTIVE..."; 
    if (taskQueue && taskQueue.length > 0) taskText = taskQueue[0];
    else if (taskDatabase && taskDatabase.length > 0) taskText = taskDatabase[Math.floor(Math.random() * taskDatabase.length)];
    
    const newTask = { text: taskText, category: 'general', timestamp: Date.now() };
    setCurrentTask(newTask);
    
    const endTimeVal = Date.now() + 86400000; 
    const newPendingState = { task: newTask, endTime: endTimeVal, status: "PENDING" };
    setPendingTaskState(newPendingState);
    
    restorePendingUI();
    if(window.updateTaskUIState) window.updateTaskUIState(true);
    if(window.toggleTaskDetails) window.toggleTaskDetails(true);
    
    window.parent.postMessage({ type: "savePendingState", pendingState: newPendingState, consumeQueue: true }, "*");
    setTimeout(() => { setIgnoreBackendUpdates(false); }, 5000);
}

export function restorePendingUI() {
    if (resetUiTimer) { clearTimeout(resetUiTimer); setResetUiTimer(null); }
    if (cooldownInterval) clearInterval(cooldownInterval);
    
    document.getElementById('mainButtonsArea').classList.add('hidden');
    const uploadBtn = document.getElementById('uploadBtnContainer');
    if(uploadBtn) uploadBtn.classList.remove('hidden');
    const timerRow = document.getElementById('activeTimerRow');
    if(timerRow) timerRow.classList.remove('hidden');
    const idleMsg = document.getElementById('idleMessage');
    if(idleMsg) idleMsg.classList.add('hidden');

    const taskEl = document.getElementById('readyText');
    if (taskEl && currentTask) {
        taskEl.innerHTML = currentTask.text;
    }
    
    const targetTime = parseInt(pendingTaskState?.endTime);
    if (!targetTime) return;

    const newInterval = setInterval(() => {
        const diff = targetTime - Date.now();
        if (diff <= 0) {
            clearInterval(newInterval);
            setCooldownInterval(null);
            const td = document.getElementById('timerDisplay');
            if(td) td.textContent = "00:00:00";
            applyPenaltyFail("TIMEOUT");
            return;
        }
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        
        const td = document.getElementById('timerDisplay');
        if(td) td.textContent = `${h}:${m}:${s}`;
    }, 1000);
    
    setCooldownInterval(newInterval);
}

function applyPenaltyFail(reason) {
    triggerSound('sfx-deny');
    const newBalance = Math.max(0, gameStats.coins - 300);
    setGameStats({ coins: newBalance });
    const coinsEl = document.getElementById('coins');
    if (coinsEl) coinsEl.textContent = newBalance;

    window.parent.postMessage({ 
        type: "taskSkipped", 
        taskTitle: currentTask ? currentTask.text : "Unknown Task",
        reason: reason
    }, "*");

    finishTask(false);
}

// --- UPDATED FINISH TASK (HANDLES OVERLAY) ---
export function finishTask(success) {
    if (cooldownInterval) clearInterval(cooldownInterval);
    setTaskJustFinished(true);
    setPendingTaskState(null);
    setCooldownInterval(null);
    
    // 1. Get the Overlay
    const overlay = document.getElementById('celebrationOverlay');
    const card = overlay.querySelector('.glass-card');
    
    if (overlay && card) {
        if (success) {
            // SUCCESS STATE (Green)
            card.classList.remove('punishment');
            card.style.borderColor = "var(--neon-green)";
            card.innerHTML = `
                <div style="font-size:1.8rem;font-weight:900;color:var(--neon-green);text-shadow:0 0 20px var(--neon-green); font-family: 'Orbitron';">
                    TASK<br>SUBMITTED
                </div>`;
        } else {
            // FAILURE STATE (Red + Trash Talk)
            card.classList.add('punishment'); // Adds red styling from CSS
            
            // Get Trash Talk from Window/CMS or Default
            const trashList = (window.CMS_HIERARCHY && window.CMS_HIERARCHY.trash) 
                              ? window.CMS_HIERARCHY.trash 
                              : DEFAULT_TRASH;
            
            const randomInsult = trashList[Math.floor(Math.random() * trashList.length)];

            card.innerHTML = `
                <div class="punish-title">FAILURE RECORDED</div>
                <div class="punish-cost">-300 🪙</div>
                <div class="punish-trash">"${randomInsult}"</div>
            `;
        }

        // Show Overlay
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 3500); // 3.5s display
    }
    
    resetTaskDisplay(success);
    setTimeout(() => { setTaskJustFinished(false); setIgnoreBackendUpdates(false); }, 5000);
}

export function cancelPendingTask() {
    if (!currentTask) return;
    if (gameStats.coins < 300) {
        triggerSound('sfx-deny');
        alert("You cannot afford the 300 coin skip fee.");
        return;
    }
    applyPenaltyFail("MANUAL_SKIP");
}

export function resetTaskDisplay(success) {
    if(window.updateTaskUIState) window.updateTaskUIState(false);
    
    const tc = document.getElementById('readyText');
    if(tc) {
        const color = success ? '#c5a059' : '#8b0000';
        const text = success ? 'DIRECTIVE COMPLETE' : 'FAILURE RECORDED (-300 🪙)';
        tc.innerHTML = `<span style="color:${color}">${text}</span>`;
    }
    
    setCurrentTask(null);
    
    const timer = setTimeout(() => {
        if(tc) tc.innerText = "AWAITING ORDERS";
        setResetUiTimer(null);
    }, 4000);
    
    setResetUiTimer(timer);
}
