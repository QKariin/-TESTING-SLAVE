// js/reward.js - THE REVEAL ENGINE
import { activeRevealMap, currentLibraryMedia, libraryProgressIndex } from './state.js';
import { getOptimizedUrl, triggerSound } from './utils.js';

export function renderRewardGrid() {
    const gridContainer = document.getElementById('revealGridContainer');
    if (!gridContainer || !currentLibraryMedia) return;

    // 1. SET THE TARGET MEDIA
    const isVideo = currentLibraryMedia.match(/\.(mp4|mov|webm)/i);
    const mediaHtml = isVideo 
        ? `<video src="${currentLibraryMedia}" autoplay loop muted playsinline class="reveal-bg-media"></video>`
        : `<img src="${getOptimizedUrl(currentLibraryMedia, 800)}" class="reveal-bg-media">`;

    // 2. BUILD THE 3x3 FROSTED OVERLAY
    let gridHtml = '<div class="reveal-grid-overlay">';
    for (let i = 1; i <= 9; i++) {
        const isUnblurred = activeRevealMap.includes(i);
        gridHtml += `
            <div class="reveal-square ${isUnblurred ? 'clear' : 'frosted'}" id="sq-${i}">
                ${!isUnblurred ? `<span class="sq-num">${i}</span>` : ''}
            </div>`;
    }
    gridHtml += '</div>';

    gridContainer.innerHTML = mediaHtml + gridHtml;
    
    // Update label to show which Level/Day they are on
    const label = document.getElementById('revealLevelLabel');
    if (label) label.innerText = `LEVEL ${libraryProgressIndex} CONTENT`;
}

export function handleRevealFragment() {
    // 1. Tell Wix to pick a random square
    window.parent.postMessage({ type: "REVEAL_FRAGMENT" }, "*");
    
    // 2. Close the choice menu (so they see the grid)
    const rewardMenu = document.getElementById('kneelRewardOverlay');
    if (rewardMenu) rewardMenu.classList.add('hidden');
    
    // 3. Switch to the Serving tab so they see the grid unblurring
    if (window.switchTab) window.switchTab('serve');

    triggerSound('coinSound');
}

// Global binding
window.handleRevealFragment = handleRevealFragment;


// --- IPHONE SLIDER ENGINE ---

let isDragging = false;
let currentSlider = null;
let startX = 0;
let currentChoice = ''; // 'points' or 'coins'

export function initSlider(e, choice) {
    isDragging = true;
    currentSlider = e.currentTarget;
    currentChoice = choice;
    
    // Get starting X position (Mouse or Touch)
    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    
    // Add temporary move/end listeners
    document.addEventListener('mousemove', handleSlide);
    document.addEventListener('touchmove', handleSlide, { passive: false });
    document.addEventListener('mouseup', stopSlide);
    document.addEventListener('touchend', stopSlide);
}

function handleSlide(e) {
    if (!isDragging || !currentSlider) return;
    
    // Prevent scrolling while sliding on mobile
    if (e.cancelable) e.preventDefault();

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const track = currentSlider;
    const knob = track.querySelector('.slider-knob');
    const fill = track.querySelector('.slider-fill');
    
    const trackWidth = track.offsetWidth - knob.offsetWidth - 10;
    let moveX = clientX - startX;

    // Constrain the move within the track (0 to 100%)
    moveX = Math.max(0, Math.min(moveX, trackWidth));
    const percent = (moveX / trackWidth) * 100;

    // Visual Updates
    knob.style.transform = `translateX(${moveX}px)`;
    fill.style.width = `${percent}%`;

    // Visual Tension: Fades the text as they slide
    const text = track.querySelector('.slider-track-text');
    if (text) text.style.opacity = 1 - (percent / 100);
}

function stopSlide() {
    if (!isDragging) return;
    isDragging = false;

    const track = currentSlider;
    const knob = track.querySelector('.slider-knob');
    const fill = track.querySelector('.slider-fill');
    const text = track.querySelector('.slider-track-text');

    const trackWidth = track.offsetWidth - knob.offsetWidth - 10;
    const currentX = new WebKitCSSMatrix(window.getComputedStyle(knob).transform).m41;

    // CHECK FOR SUCCESS: Must be 90% of the way or more
    if (currentX > (trackWidth * 0.9)) {
        // --- SUCCESS ---
        knob.style.transform = `translateX(${trackWidth}px)`;
        fill.style.width = "100%";
        
        // Call the kneeling reward function from kneeling.js
        import('./kneeling.js').then(({ claimKneelReward }) => {
            claimKneelReward(currentChoice);
        });

    } else {
        // --- SNAP BACK (Failed slide) ---
        knob.style.transition = "transform 0.3s ease";
        fill.style.transition = "width 0.3s ease";
        knob.style.transform = "translateX(0)";
        fill.style.width = "0%";
        if (text) text.style.opacity = "1";
        
        // Remove transition after it's done
        setTimeout(() => {
            knob.style.transition = "none";
            fill.style.transition = "none";
        }, 300);
    }

    // Cleanup listeners
    document.removeEventListener('mousemove', handleSlide);
    document.removeEventListener('touchmove', handleSlide);
    document.removeEventListener('mouseup', stopSlide);
    document.removeEventListener('touchend', stopSlide);
    currentSlider = null;
}

// Global binding
window.initSlider = initSlider;
