/**
 * ==========================================================================
 * SOCIAL MEDIA HASHTAG EXTRACTION - NAIVE STRING MATCHING VISUALIZER
 * File: script.js
 * Purpose: Interactive engine and visualization logic for DAA project.
 * Commented extensively for students to easily explain during presentation.
 * ==========================================================================
 */

// Global state variables to manage visualizer execution
let tweetText = "";
let patternText = "";
let stepsHistory = [];       // Stores all execution states (micro-steps) of the algorithm
let currentStepIdx = 0;      // Tracks where we are in the visualizer playback
let playbackInterval = null; // Stores reference to setInterval for Play/Pause loop
let isPlaying = false;       // Playback state toggle
let chartInstance = null;    // Chart.js object reference

// DOM Elements cache for speed and cleaner code
const tweetInput = document.getElementById("tweet-input");
const patternInput = document.getElementById("pattern-input");
const btnStart = document.getElementById("btn-start");
const btnReset = document.getElementById("btn-reset");
const btnPrevStep = document.getElementById("btn-prev-step");
const btnPlayPause = document.getElementById("btn-play-pause");
const btnNextStep = document.getElementById("btn-next-step");
const playPauseIcon = document.getElementById("play-pause-icon");
const speedSlider = document.getElementById("speed-slider");
const speedValue = document.getElementById("speed-value");

// Stats & Details elements
const statComparisons = document.getElementById("stat-comparisons");
const statMatches = document.getElementById("stat-matches");
const statMismatches = document.getElementById("stat-mismatches");
const detailPositions = document.getElementById("detail-positions");
const detailExtractedTags = document.getElementById("detail-extracted-tags");
const tweetHighlightedView = document.getElementById("tweet-highlighted-view");
const resultsBanner = document.getElementById("results-banner");
const bannerText = document.getElementById("banner-text");

// Visualizer UI elements
const idxIVal = document.getElementById("idx-i-val");
const idxJVal = document.getElementById("idx-j-val");
const tweetTilesContainer = document.getElementById("tweet-tiles-container");
const patternTilesContainer = document.getElementById("pattern-tiles-container");
const canvasIndicesRow = document.getElementById("canvas-indices-row");
const currentStepExplanation = document.getElementById("current-step-explanation");
const consoleLogs = document.getElementById("console-logs");

// Export actions
const btnCopy = document.getElementById("btn-copy");
const btnDownload = document.getElementById("btn-download");

/* ==========================================================================
   TYPEWRITER ANIMATION FOR THE MAIN TITLE
   ========================================================================== */
function runTypewriterEffect() {
    const titleEl = document.getElementById("typewriter-title");
    const fullText = "Social Media Hashtag Extraction";
    titleEl.textContent = ""; // Clear initial text
    let index = 0;
    
    function type() {
        if (index < fullText.length) {
            titleEl.textContent += fullText.charAt(index);
            index++;
            setTimeout(type, 80); // Speed of typing in ms
        }
    }
    type();
}

/* ==========================================================================
   NAIVE STRING MATCHING STEP GENERATOR ENGINE
   This function pre-computes the entire path of execution so we can easily 
   step forward and backward through history.
   ========================================================================== */
function generateSearchSteps(text, pattern) {
    let steps = [];
    let n = text.length;
    let m = pattern.length;
    let matchesSoFar = [];
    let comparisonsCount = 0;
    let matchesCount = 0;
    let mismatchesCount = 0;
    let comparisonsPerIndex = Array(n).fill(0); // Tracks comparisons at each text index

    // Step 0: Initial state (Setup/Start)
    steps.push({
        i: 0,
        j: 0,
        actionType: 'init',
        consoleMessage: `Initial state: Text length (n) = ${n}, Pattern length (m) = ${m}.`,
        explanation: `Setting up Naive Search parameters. Text length (n) = <strong>${n}</strong>, Pattern length (m) = <strong>${m}</strong>. We will slide the pattern from index 0 to ${n - m}.`,
        codeLine: 2, // Lines are mapped to the code walkthrough section
        matchesSoFar: [],
        comparisonsCount: 0,
        matchesCount: 0,
        mismatchesCount: 0,
        comparisonsPerIndex: [...comparisonsPerIndex]
    });

    // Handle edge cases
    if (m === 0 || n === 0 || m > n) {
        steps.push({
            i: 0,
            j: 0,
            actionType: 'finished',
            consoleMessage: "Search cancelled. Invalid bounds (Pattern longer than Text or empty inputs).",
            explanation: "<strong>Invalid Input Bounds:</strong> The pattern cannot be empty and must be smaller than or equal to the tweet length.",
            codeLine: 16,
            matchesSoFar: [],
            comparisonsCount: 0,
            matchesCount: 0,
            mismatchesCount: 0,
            comparisonsPerIndex: [...comparisonsPerIndex]
        });
        return steps;
    }

    // Outer loop: Slides the pattern across the tweet characters one by one
    for (let i = 0; i <= n - m; i++) {
        // Step: Alignment start at index i
        steps.push({
            i: i,
            j: 0,
            actionType: 'shift',
            consoleMessage: `Shift i = ${i}: Aligning pattern with tweet index ${i}.`,
            explanation: `Outer loop shift index <strong>i = ${i}</strong>. Aligning pattern starting tile under index ${i} of the tweet. Set inner index <strong>j = 0</strong> to compare.`,
            codeLine: 5,
            matchesSoFar: [...matchesSoFar],
            comparisonsCount: comparisonsCount,
            matchesCount: matchesCount,
            mismatchesCount: mismatchesCount,
            comparisonsPerIndex: [...comparisonsPerIndex]
        });

        let j;
        // Inner loop: Compares characters of pattern and text at current shift
        for (j = 0; j < m; j++) {
            comparisonsCount++;
            comparisonsPerIndex[i]++;

            // Step: Compare T[i+j] with P[j]
            steps.push({
                i: i,
                j: j,
                actionType: 'compare',
                textChar: text[i + j],
                patternChar: pattern[j],
                consoleMessage: `Compare: T[${i + j}] ('${text[i + j]}') vs P[${j}] ('${pattern[j]}')`,
                explanation: `Comparing character at tweet position <strong>${i + j}</strong> ('${text[i + j]}') with pattern position <strong>${j}</strong> ('${pattern[j]}').`,
                codeLine: 7,
                matchesSoFar: [...matchesSoFar],
                comparisonsCount: comparisonsCount,
                matchesCount: matchesCount,
                mismatchesCount: mismatchesCount,
                comparisonsPerIndex: [...comparisonsPerIndex]
            });

            // If characters match, we proceed, else we break immediately
            if (text[i + j] !== pattern[j]) {
                mismatchesCount++;
                
                // Step: Character mismatch (terminates comparison at this shift)
                steps.push({
                    i: i,
                    j: j,
                    actionType: 'character-mismatch',
                    textChar: text[i + j],
                    patternChar: pattern[j],
                    consoleMessage: `Mismatch: T[${i + j}] != P[${j}]. Breaking inner loop.`,
                    explanation: `Mismatch found! '${text[i + j]}' does not match '${pattern[j]}' at pattern index ${j}. Terminating inner loop (break statement) and preparing to shift.`,
                    codeLine: 9,
                    matchesSoFar: [...matchesSoFar],
                    comparisonsCount: comparisonsCount,
                    matchesCount: matchesCount,
                    mismatchesCount: mismatchesCount,
                    comparisonsPerIndex: [...comparisonsPerIndex]
                });
                break;
            } else {
                // Step: Character match (proceed to next index)
                steps.push({
                    i: i,
                    j: j,
                    actionType: 'character-match',
                    textChar: text[i + j],
                    patternChar: pattern[j],
                    consoleMessage: `Match: T[${i + j}] == P[${j}]. Continuing check...`,
                    explanation: `Character matched! '${text[i + j]}' equals '${pattern[j]}'. Incrementing inner index <strong>j</strong> to check next character.`,
                    codeLine: 7,
                    matchesSoFar: [...matchesSoFar],
                    comparisonsCount: comparisonsCount,
                    matchesCount: matchesCount,
                    mismatchesCount: mismatchesCount,
                    comparisonsPerIndex: [...comparisonsPerIndex]
                });
            }
        }

        // If inner loop completes successfully (j reached pattern length m)
        if (j === m) {
            matchesCount++;
            matchesSoFar.push(i);
            
            // Step: Full Pattern Match Found
            steps.push({
                i: i,
                j: j,
                actionType: 'pattern-found',
                consoleMessage: `SUCCESS: Pattern found at tweet index ${i}!`,
                explanation: `Success! All <strong>${m}</strong> characters of pattern matched starting at alignment index <strong>${i}</strong>. Match recorded!`,
                codeLine: 13,
                matchesSoFar: [...matchesSoFar],
                comparisonsCount: comparisonsCount,
                matchesCount: matchesCount,
                mismatchesCount: mismatchesCount,
                comparisonsPerIndex: [...comparisonsPerIndex]
            });
        }
    }

    // Final Step: Algorithm Completed
    steps.push({
        i: n - m,
        j: m,
        actionType: 'finished',
        consoleMessage: `Execution finished. Found ${matchesCount} occurrence(s).`,
        explanation: `Algorithm execution completed. Investigated all shifts from index 0 to ${n - m}. Total comparisons made: <strong>${comparisonsCount}</strong>.`,
        codeLine: 16,
        matchesSoFar: [...matchesSoFar],
        comparisonsCount: comparisonsCount,
        matchesCount: matchesCount,
        mismatchesCount: mismatchesCount,
        comparisonsPerIndex: [...comparisonsPerIndex]
    });

    return steps;
}

/* ==========================================================================
   INITIAL RENDER OF STATIC GRID CONTAINERS
   Generates grid slots for tweet characters and labels.
   ========================================================================== */
function initializeVisualizerCanvas() {
    tweetTilesContainer.innerHTML = "";
    patternTilesContainer.innerHTML = "";
    canvasIndicesRow.innerHTML = "";

    const n = tweetText.length;
    
    if (n === 0) {
        tweetTilesContainer.innerHTML = `<div class="placeholder-text-msg">Enter tweet and click Start.</div>`;
        return;
    }

    // 1. Generate index numbers helper row above tweet
    for (let i = 0; i < n; i++) {
        const idxLabel = document.createElement("div");
        idxLabel.className = "index-label";
        idxLabel.textContent = i;
        canvasIndicesRow.appendChild(idxLabel);
    }

    // 2. Generate Tweet (T) character tiles
    for (let i = 0; i < n; i++) {
        const tile = document.createElement("div");
        tile.className = "char-tile";
        tile.id = `tweet-tile-${i}`;
        // Treat space character specially to display visually
        tile.textContent = tweetText[i] === " " ? "␣" : tweetText[i];
        if (tweetText[i] === " ") {
            tile.style.color = "var(--text-muted)";
            tile.style.fontSize = "0.8rem";
        }
        tweetTilesContainer.appendChild(tile);
    }
}

/* ==========================================================================
   RENDER SPECIFIC STEP STATE
   Updates colors, alignments, consoles, code tracer, and counters.
   ========================================================================== */
function renderStep(stepIdx) {
    if (stepsHistory.length === 0) return;
    const step = stepsHistory[stepIdx];

    // Update index labels in status panel
    idxIVal.textContent = step.i;
    idxJVal.textContent = step.actionType === 'init' || step.actionType === 'shift' ? '-' : step.j;

    // Reset styles on all tweet tiles
    const n = tweetText.length;
    for (let k = 0; k < n; k++) {
        const tile = document.getElementById(`tweet-tile-${k}`);
        if (tile) {
            tile.className = "char-tile";
        }
    }

    // Highlight final matches found up to the current step (persistent styling)
    step.matchesSoFar.forEach(matchIdx => {
        for (let k = 0; k < patternText.length; k++) {
            const tile = document.getElementById(`tweet-tile-${matchIdx + k}`);
            if (tile) tile.classList.add("matched-final");
        }
    });

    // Generate/render pattern row tiles with dynamic spacer prepended
    patternTilesContainer.innerHTML = "";
    
    // Add empty spacers before pattern to slide it visually under correct index i
    for (let s = 0; s < step.i; s++) {
        const spacer = document.createElement("div");
        spacer.className = "char-tile empty-align";
        spacer.textContent = "";
        patternTilesContainer.appendChild(spacer);
    }

    // Add pattern characters
    const m = patternText.length;
    for (let pIdx = 0; pIdx < m; pIdx++) {
        const patTile = document.createElement("div");
        patTile.className = "char-tile";
        patTile.id = `pat-tile-${pIdx}`;
        patTile.textContent = patternText[pIdx] === " " ? "␣" : patternText[pIdx];
        patternTilesContainer.appendChild(patTile);
    }

    // Apply active highlights for compared character pairs
    if (step.actionType === 'compare' || step.actionType === 'character-match' || step.actionType === 'character-mismatch') {
        const activeTextIndex = step.i + step.j;
        const tweetActiveTile = document.getElementById(`tweet-tile-${activeTextIndex}`);
        const patternActiveTile = document.getElementById(`pat-tile-${step.j}`);

        let stateClass = "";
        if (step.actionType === 'compare') stateClass = "scanning";
        else if (step.actionType === 'character-match') stateClass = "match";
        else if (step.actionType === 'character-mismatch') stateClass = "mismatch";

        if (tweetActiveTile) tweetActiveTile.classList.add(stateClass);
        if (patternActiveTile) patternActiveTile.classList.add(stateClass);
    } 
    // If entire pattern matches successfully at current shift
    else if (step.actionType === 'pattern-found') {
        for (let k = 0; k < m; k++) {
            const tweetTile = document.getElementById(`tweet-tile-${step.i + k}`);
            const patternTile = document.getElementById(`pat-tile-${k}`);
            if (tweetTile) {
                tweetTile.classList.remove("matched-final");
                tweetTile.classList.add("match");
            }
            if (patternTile) patternTile.classList.add("match");
        }
    }

    // Update step explanation panel
    currentStepExplanation.innerHTML = step.explanation;

    // Update Console execution log (adds new lines dynamically)
    appendConsoleLog(step.consoleMessage, step.actionType);

    // Sync Live Code Walkthrough highlight
    updateCodeWalkthroughTracer(step.codeLine);

    // Update Live Statistics counters (with animations)
    animateCounterUpdate(statComparisons, step.comparisonsCount);
    animateCounterUpdate(statMatches, step.matchesCount);
    animateCounterUpdate(statMismatches, step.mismatchesCount);

    // Update Results Details
    updateResultsDetails(step);

    // Manage button states based on current step index bounds
    btnPrevStep.disabled = stepIdx === 0;
    btnNextStep.disabled = stepIdx === stepsHistory.length - 1;
}

/* ==========================================================================
   CONSOLE LOG DISPLAY UTILITIES
   ========================================================================== */
function appendConsoleLog(message, actionType) {
    // Determine CSS class based on action type
    let logClass = "";
    if (actionType === 'character-mismatch') logClass = "mismatch-log";
    else if (actionType === 'shift' || actionType === 'init') logClass = "shift-log";
    else if (actionType === 'pattern-found') logClass = "match-log";
    
    const line = document.createElement("div");
    line.className = `console-line ${logClass}`;
    line.textContent = `> ${message}`;
    
    consoleLogs.appendChild(line);
    // Auto-scroll console to bottom
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

function clearConsoleLogs() {
    consoleLogs.innerHTML = `<div class="console-line system-msg">Console cleared. Search active...</div>`;
}

/* ==========================================================================
   LIVE CODE TRACER SYNC
   ========================================================================== */
function updateCodeWalkthroughTracer(lineNumber) {
    // Remove active styling from all code lines
    const allLines = document.querySelectorAll(".code-line-tracer");
    allLines.forEach(line => line.classList.remove("active"));

    // Add active styling to current line
    const activeLine = document.getElementById(`code-line-${lineNumber}`);
    if (activeLine) {
        activeLine.classList.add("active");
        
        // Only scroll the code parent container if it overflows, without scrolling the main browser window.
        const codeContainer = document.querySelector(".code-body");
        if (codeContainer && codeContainer.scrollHeight > codeContainer.clientHeight) {
            const lineOffset = activeLine.offsetTop;
            const containerHalfHeight = codeContainer.clientHeight / 2;
            codeContainer.scrollTo({
                top: lineOffset - containerHalfHeight,
                behavior: 'smooth'
            });
        }
    }
}

/* ==========================================================================
   STATISTICS COUNTERS COUNT-UP ANIMATION
   ========================================================================== */
function animateCounterUpdate(element, targetVal) {
    const currentVal = parseInt(element.textContent) || 0;
    if (currentVal === targetVal) return;
    
    // Quick number transition count-up
    element.textContent = targetVal;
    element.classList.add("pulse-icon");
    setTimeout(() => {
        element.classList.remove("pulse-icon");
    }, 200);
}

/* ==========================================================================
   RESULTS ANALYSIS UPDATER
   Highlights extracted hashtags and builds dynamic outputs.
   ========================================================================== */
function updateResultsDetails(step) {
    // 1. Update positions label
    if (step.matchesSoFar.length === 0) {
        detailPositions.textContent = "None";
    } else {
        detailPositions.textContent = step.matchesSoFar.join(", ");
    }

    // 2. Render extracted tags in details panel
    detailExtractedTags.innerHTML = "";
    if (step.matchesSoFar.length === 0) {
        detailExtractedTags.innerHTML = `<span class="no-tags">No matching tags extracted yet</span>`;
    } else {
        step.matchesSoFar.forEach(() => {
            const tagBadge = document.createElement("span");
            tagBadge.className = "extracted-tag-badge";
            tagBadge.innerHTML = `<i data-lucide="hash" class="icon-sm"></i> ${patternText.replace('#','')}`;
            detailExtractedTags.appendChild(tagBadge);
        });
        lucide.createIcons(); // Initialize badge icons
    }

    // 3. Highlight matched hashtags inside Tweet text box
    if (tweetText.length > 0) {
        let highlightedHtml = "";
        let index = 0;
        
        // Build html segments highlighting matches
        while (index < tweetText.length) {
            if (step.matchesSoFar.includes(index)) {
                highlightedHtml += `<span class="highlight-tag">${tweetText.substring(index, index + patternText.length)}</span>`;
                index += patternText.length;
            } else {
                highlightedHtml += tweetText[index];
                index++;
            }
        }
        tweetHighlightedView.innerHTML = highlightedHtml;
    } else {
        tweetHighlightedView.textContent = "Tweet text container empty.";
    }

    // 4. Update Success/Action banner
    if (step.actionType === 'finished') {
        resultsBanner.className = "results-banner success";
        if (step.matchesSoFar.length > 0) {
            bannerText.innerHTML = `<strong>Success!</strong> Extraction complete. Found <strong>${step.matchesSoFar.length}</strong> occurrence(s) of hashtag pattern "${patternText}".`;
        } else {
            resultsBanner.className = "results-banner"; // Reset
            resultsBanner.style.background = "rgba(245, 158, 11, 0.08)";
            resultsBanner.style.borderColor = "rgba(245, 158, 11, 0.2)";
            resultsBanner.style.color = "#fef3c7";
            bannerText.innerHTML = `<strong>Info:</strong> Search finished. No matching occurrences of "${patternText}" found in the text.`;
        }
        // Build/Refresh charts when algorithm finishes
        buildAnalyticsChart(step);
    } else {
        resultsBanner.className = "results-banner";
        resultsBanner.style.background = "rgba(99, 102, 241, 0.06)";
        resultsBanner.style.borderColor = "rgba(99, 102, 241, 0.2)";
        resultsBanner.style.color = "#e0e7ff";
        bannerText.innerHTML = `<strong>Processing:</strong> Matching string characters step-by-step... (Step ${currentStepIdx + 1}/${stepsHistory.length})`;
    }

    // 5. Update output display panel
    updateOutputDisplay(step);
}

/* ==========================================================================
   OUTPUT DISPLAY UPDATER
   ========================================================================== */
function updateOutputDisplay(step) {
    // Update status header
    const statusIcon = document.getElementById("output-status-icon");
    const statusTitle = document.getElementById("output-status-title");
    const statusDesc = document.getElementById("output-status-desc");

    if (step.actionType === 'finished') {
        if (step.matchesSoFar.length > 0) {
            statusIcon.setAttribute("data-lucide", "check-circle");
            statusIcon.style.color = "var(--color-success)";
            statusTitle.textContent = `✓ Extraction Complete`;
            statusDesc.textContent = `Found ${step.matchesSoFar.length} match(es) of "${patternText}"`;
        } else {
            statusIcon.setAttribute("data-lucide", "info");
            statusIcon.style.color = "#fbbf24";
            statusTitle.textContent = `ℹ No Matches Found`;
            statusDesc.textContent = `Pattern "${patternText}" not found in the text`;
        }
        lucide.createIcons();
    }

    // Update search summary
    document.getElementById("output-text-searched").textContent = tweetText.length > 0 ? `"${tweetText.substring(0, 50)}${tweetText.length > 50 ? '...' : ''}"` : "-";
    document.getElementById("output-pattern").textContent = patternText || "-";
    document.getElementById("output-match-count").textContent = step.matchesSoFar.length;

    // Update match positions
    const positionsEl = document.getElementById("output-positions");
    if (step.matchesSoFar.length === 0) {
        positionsEl.innerHTML = '<span class="no-data">No matches found</span>';
    } else {
        positionsEl.innerHTML = step.matchesSoFar.map((pos, idx) => 
            `<span class="position-badge"><i data-lucide="map-pin"></i> Position ${pos}</span>`
        ).join('');
        lucide.createIcons();
    }

    // Update extracted hashtags
    const hashtagsEl = document.getElementById("output-hashtags");
    if (step.matchesSoFar.length === 0) {
        hashtagsEl.innerHTML = '<span class="no-data">No hashtags extracted</span>';
    } else {
        hashtagsEl.innerHTML = step.matchesSoFar.map(() => 
            `<span class="hashtag-badge"><i data-lucide="tag"></i> ${patternText}</span>`
        ).join('');
        lucide.createIcons();
    }

    // Update performance metrics
    document.getElementById("output-comparisons").textContent = step.comparisonsCount;
    document.getElementById("output-matches").textContent = step.comparisonsCount - step.mismatchesCount;
    document.getElementById("output-mismatches").textContent = step.mismatchesCount;

    // Update JSON output
    const jsonOutput = {
        found: step.matchesSoFar.length > 0,
        text: tweetText,
        pattern: patternText,
        matchCount: step.matchesSoFar.length,
        positions: step.matchesSoFar,
        comparisons: step.comparisonsCount,
        matches: step.comparisonsCount - step.mismatchesCount,
        mismatches: step.mismatchesCount
    };

    const jsonBlock = document.getElementById("output-json-block");
    jsonBlock.innerHTML = `<code>${JSON.stringify(jsonOutput, null, 2)}</code>`;
}

/* ==========================================================================
   CHART.JS ANALYTICS ENGINE
   ========================================================================== */
function buildAnalyticsChart(finalStep) {
    const ctx = document.getElementById("analytics-chart").getContext("2d");
    
    // Destroy previous chart to avoid overlay issues on refresh
    if (chartInstance) {
        chartInstance.destroy();
    }

    const comparisons = finalStep.comparisonsCount;
    const mismatches = finalStep.mismatchesCount;
    // Successful character matches equals total comparisons minus mismatches
    const matches = comparisons - mismatches;

    // Chart design: Harmonious palette matching our Glassmorphic theme
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Mismatches', 'Character Matches'],
            datasets: [{
                data: [mismatches, matches],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.65)',  // Neon Red Glow
                    'rgba(16, 185, 129, 0.65)'  // Neon Green Glow
                ],
                borderColor: [
                    '#ef4444',
                    '#10b981'
                ],
                borderWidth: 1.5,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9ca3af',
                        font: {
                            family: 'Plus Jakarta Sans',
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw} counts`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

/* ==========================================================================
   PLAYBACK CONTROL LOOPS
   ========================================================================== */
function playStepByStep() {
    playbackInterval = setInterval(() => {
        if (currentStepIdx < stepsHistory.length - 1) {
            currentStepIdx++;
            renderStep(currentStepIdx);
        } else {
            pausePlayback(); // Stop at final step
        }
    }, parseInt(speedSlider.value));
}

function pausePlayback() {
    clearInterval(playbackInterval);
    isPlaying = false;
    btnPlayPause.classList.remove("play-btn");
    playPauseIcon.setAttribute("data-lucide", "play");
    lucide.createIcons(); // Toggle icon
}

function startPlayback() {
    isPlaying = true;
    btnPlayPause.classList.add("play-btn");
    playPauseIcon.setAttribute("data-lucide", "pause");
    lucide.createIcons();
    playStepByStep();
}

/* ==========================================================================
   INTERACTIVE BUTTON CONTROLS AND ACTION HANDLERS
   ========================================================================== */
function handleStartExtraction() {
    // Pause any active playback
    pausePlayback();

    // Grab values from inputs
    tweetText = tweetInput.value;
    patternText = patternInput.value;

    // Check parameters validity
    if (!tweetText.trim() || !patternText.trim()) {
        alert("Please enter values in both the Tweet and Hashtag fields!");
        return;
    }

    if (patternText.length > tweetText.length) {
        alert("The search pattern cannot be longer than the tweet itself!");
        return;
    }

    // Generate full history tree
    stepsHistory = generateSearchSteps(tweetText, patternText);
    currentStepIdx = 0;

    // Setup GUI elements
    initializeVisualizerCanvas();
    clearConsoleLogs();

    // Enable interactive controls
    btnPrevStep.disabled = true;
    btnPlayPause.disabled = false;
    btnNextStep.disabled = stepsHistory.length <= 1;

    // Render initial step
    renderStep(currentStepIdx);
}

function handleReset() {
    pausePlayback();
    
    // Reset visualizer structures
    stepsHistory = [];
    currentStepIdx = 0;
    
    // Reset input fields to defaults
    tweetInput.value = "Loving the weather today! #sunny #vacation #sunny";
    patternInput.value = "#sunny";
    
    // Reset GUI counters
    statComparisons.textContent = "0";
    statMatches.textContent = "0";
    statMismatches.textContent = "0";
    detailPositions.textContent = "-";
    detailExtractedTags.innerHTML = `<span class="no-tags">-</span>`;
    tweetHighlightedView.textContent = "Tweet input text will be highlighted here after matching...";
    
    resultsBanner.className = "results-banner";
    resultsBanner.style.background = "";
    resultsBanner.style.borderColor = "";
    resultsBanner.style.color = "";
    bannerText.textContent = 'Run the extractor above to display results here!';

    idxIVal.textContent = "0";
    idxJVal.textContent = "0";

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    // Clear grid and consoles
    tweetTilesContainer.innerHTML = `<div class="placeholder-text-msg">Enter input above and click "Start Extraction" to visualize!</div>`;
    patternTilesContainer.innerHTML = "";
    canvasIndicesRow.innerHTML = "";
    currentStepExplanation.textContent = 'Click "Start Extraction" to begin the step-by-step Naive String Matching visualization.';
    consoleLogs.innerHTML = `<div class="console-line system-msg">Console ready. Awaiting search start...</div>`;

    // Disable playback controls
    btnPrevStep.disabled = true;
    btnPlayPause.disabled = true;
    btnNextStep.disabled = true;

    // Reset code trace highlight
    const allLines = document.querySelectorAll(".code-line-tracer");
    allLines.forEach(line => line.classList.remove("active"));
}

/* ==========================================================================
   COPY AND DOWNLOAD REPORTS UTILITIES
   ========================================================================== */
function handleCopyResults() {
    if (stepsHistory.length === 0) {
        alert("Please run string search before copying results!");
        return;
    }
    const finalStep = stepsHistory[stepsHistory.length - 1];
    
    const reportText = `SOCIAL MEDIA HASHTAG EXTRACTION REPORT
=========================================
Algorithm: Naive String Matching Algorithm
Tweet Text: "${tweetText}"
Search Pattern: "${patternText}"
Matches Found: ${finalStep.matchesCount}
Match Indices: ${finalStep.matchesSoFar.length > 0 ? finalStep.matchesSoFar.join(", ") : "None"}
Comparisons Made: ${finalStep.comparisonsCount}
Mismatches Found: ${finalStep.mismatchesCount}
Report Generated: ${new Date().toLocaleString()}
=========================================`;

    navigator.clipboard.writeText(reportText)
        .then(() => alert("Results report copied to clipboard successfully!"))
        .catch(err => console.error("Could not copy report text: ", err));
}

function handleDownloadReport() {
    if (stepsHistory.length === 0) {
        alert("Please run string search before downloading report!");
        return;
    }
    const finalStep = stepsHistory[stepsHistory.length - 1];
    
    const reportText = `SOCIAL MEDIA HASHTAG EXTRACTION REPORT
=========================================
Algorithm: Naive String Matching Algorithm
Tweet Text: "${tweetText}"
Search Pattern: "${patternText}"
Matches Found: ${finalStep.matchesCount}
Match Indices: ${finalStep.matchesSoFar.length > 0 ? finalStep.matchesSoFar.join(", ") : "None"}
Comparisons Made: ${finalStep.comparisonsCount}
Mismatches Found: ${finalStep.mismatchesCount}
Report Generated: ${new Date().toLocaleString()}
=========================================`;

    // Create blobs & download trigger
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = `Hashtag_Extraction_Report_${patternText}.txt`;
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    
    // Clean up
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);
}

/* ==========================================================================
   INITIALIZATION / REGISTRATION OF EVENTS ON DOM LOAD
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Run title animation
    runTypewriterEffect();
    
    // 2. Initialize Lucide Icon vectors
    lucide.createIcons();

    // 3. Register inputs/buttons event listeners
    btnStart.addEventListener("click", handleStartExtraction);
    btnReset.addEventListener("click", handleReset);
    btnCopy.addEventListener("click", handleCopyResults);
    btnDownload.addEventListener("click", handleDownloadReport);

    // Playback loop controller actions
    btnPlayPause.addEventListener("click", () => {
        if (isPlaying) pausePlayback();
        else startPlayback();
    });

    btnNextStep.addEventListener("click", () => {
        pausePlayback();
        if (currentStepIdx < stepsHistory.length - 1) {
            currentStepIdx++;
            renderStep(currentStepIdx);
        }
    });

    btnPrevStep.addEventListener("click", () => {
        pausePlayback();
        if (currentStepIdx > 0) {
            currentStepIdx--;
            renderStep(currentStepIdx);
        }
    });

    // Speed slider listeners
    speedSlider.addEventListener("input", (e) => {
        const speed = e.target.value;
        speedValue.textContent = `${speed}ms`;
        if (isPlaying) {
            pausePlayback();
            startPlayback();
        }
    });

});
