import { 
    galleryData, pendingLimit, historyLimit, currentHistoryIndex, touchStartX, 
    setCurrentHistoryIndex, setHistoryLimit, setTouchStartX,
    gameStats, setGameStats, setCurrentTask, setPendingTaskState, setIgnoreBackendUpdates
} from './state.js';
import { getOptimizedUrl, cleanHTML, triggerSound } from './utils.js';

// --- HELPER: POINTS ---
function getPoints(item) {
    let val = item.points || item.score || item.value || item.amount || item.reward || 0;
    return Number(val);
}

// --- HELPER: SORTED ---
function getSortedGallery() {
    if (!galleryData) return [];
    return [...galleryData].sort((a, b) => new Date(b._createdDate) - new Date(a._createdDate));
}

// --- MAIN RENDERER ---
export function renderGallery() {
    if (!galleryData) return;

    // Get Containers
    const gridPerfect = document.getElementById('gridPerfect'); // Top (Noir)
    const gridFailed = document.getElementById('gridFailed');   // Middle (Vault)
    const gridOkay = document.getElementById('gridOkay');       // Bottom (Aperture)

    if (!gridPerfect || !gridFailed || !gridOkay) return;

    gridPerfect.innerHTML = "";
    gridFailed.innerHTML = "";
    gridOkay.innerHTML = "";

    const sortedData = getSortedGallery();

    sortedData.forEach((item, index) => {
        let url = item.proofUrl || item.media || item.file;
        if (!url) return;
        
        let thumb = getOptimizedUrl(url, 300);
        let pts = getPoints(item);
        let status = (item.status || "").toLowerCase();
        let isRejected = status.includes('rej') || status.includes('fail');
        let isPending = status.includes('pending');

        let html = "";
        let targetGrid = null;

        // 1. FAILED = MIDDLE (VAULT)
        if (isRejected) {
            targetGrid = gridFailed;
            html = `
                <div class="item-vault" onclick="window.openHistoryModal(${index})">
                    <div class="bolt b-tl"></div><div class="bolt b-tr"></div>
                    <div class="bolt b-bl"></div><div class="bolt b-br"></div>
                    <div class="vault-lock"><div class="vault-handle"></div></div>
                    <img src="${thumb}" class="vault-image">
                </div>`;
        }
        // 2. PERFECT = TOP (NOIR) -> Points > 145
        else if (pts > 145) {
            targetGrid = gridPerfect;
            html = `
                <div class="item-noir" onclick="window.openHistoryModal(${index})">
                    <img src="${thumb}">
                    <div class="noir-sig">Verified</div>
                </div>`;
        }
        // 3. OKAY / PENDING = BOTTOM (APERTURE)
        else {
            targetGrid = gridOkay;
            html = `
                <div class="item-aperture" onclick="window.openHistoryModal(${index})">
                    <div class="aperture-flare"></div>
                    <img src="${thumb}" class="aperture-img">
                    <!-- 6 Blades -->
                    <div class="blade b1"></div><div class="blade b2"></div>
                    <div class="blade b3"></div><div class="blade b4"></div>
                    <div class="blade b5"></div><div class="blade b6"></div>
                    
                    ${isPending ? '<div style="position:absolute; inset:0; z-index:20; display:flex; align-items:center; justify-content:center; color:cyan; font-family:Orbitron; font-size:0.6rem;">WAIT</div>' : ''}
                </div>`;
        }

        if (targetGrid) targetGrid.innerHTML += html;
    });
}

// --- CRITICAL FIX: EXPORT THIS EMPTY FUNCTION TO PREVENT CRASH ---
export function loadMoreHistory() {
    // Horizontal scrolls usually auto-load, but we keep this to satisfy main.js import
    console.log("History loaded via scroll");
}

export function openHistoryModal(index) {
    const items = getSortedGallery();
    const item = items[index];
    if (!item) return;
    
    // ... (Your existing Modal Logic works here, I can repost if needed) ...
    // For now, let's just make sure the profile loads first!
    if(window.openModalInternal) window.openModalInternal(item); 
    // ^ This assumes we attach the modal logic to window, see below
    
    // Temporary Direct Call to ensure it works immediately
    buildAndShowModal(item);
}

function buildAndShowModal(item) {
    // (Simplified Dossier Modal Builder for immediate function)
    const overlay = document.getElementById('modalGlassOverlay');
    if(!overlay) return;
    
    const pts = getPoints(item);
    overlay.innerHTML = `
        <div id="modalCloseX" onclick="window.closeModal(event)" style="position:absolute; top:20px; right:20px; font-size:2.5rem; cursor:pointer; color:white; z-index:110;">×</div>
        <div class="theater-content dossier-layout">
            <div class="dossier-sidebar">
                <div class="dossier-block"><div class="dossier-label">VALUE</div><div class="m-points-lg">+${pts}</div></div>
                <div class="dossier-block"><div class="dossier-label">DIRECTIVE</div><div class="theater-text-box">${item.text}</div></div>
            </div>
        </div>
        <div class="modal-footer-menu">
            <button onclick="window.closeModal(event)" class="history-action-btn btn-close-red" style="grid-column: span 2;">CLOSE</button>
        </div>
    `;
    document.getElementById('glassModal').classList.add('active');
}

// Standard Exports
export function toggleHistoryView() {}
export function closeModal(e) {
    document.getElementById('glassModal').classList.remove('active');
}
export function openModal() {} 
export function initModalSwipeDetection() {}

// FORCE WINDOW EXPORTS
window.renderGallery = renderGallery;
window.openHistoryModal = openHistoryModal;
window.closeModal = closeModal;
