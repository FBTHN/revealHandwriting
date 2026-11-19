/*****************************************************************
** Author: Felix Boy, felixboy.mail@gmail.com
**
** A plugin for reveal.js adding a handwriting canvas.
**
** Version: 1.6.2
**
** License: MIT license
**
** Copyright (c) 2026 Felix Boy
**
** Permission is hereby granted, free of charge, to any person obtaining a copy
** of this software and associated documentation files (the "Software"), to deal
** in the Software without restriction, including without limitation the rights
** to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
** copies of the Software, and to permit persons to whom the Software is
** furnished to do so, subject to the following conditions:

** The above copyright notice and this permission notice shall be included in all
** copies or substantial portions of the Software.

** THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
** IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
** FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
** AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
** LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
** OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
** SOFTWARE.

*******************************************************************/

window.revealHandwriting = window.revealHandwriting || {
    id: 'revealHandwriting',
    init: function (deck) {
        initHandwriting(deck);
    }
};

const initHandwriting = function (Reveal) {
    let svg;
    let isDrawing = false;
    let isErasing = false;
    let isLassoing = false;
    let isMovingSelection = false;
    let isDraggingSelection = false;
    let penStyleLock = false;
    let penSession = false;

    let currentStrokeGroup = null;
    let dynamicTailPath = null;
    let currentPoints = [];
    let pendingPoints = [];
    let lastProcessedIndex = 0;

    let currentSlideGroup = null;
    let lassoPoints = [];
    let selectedElements = [];
    let selectionBaseTransforms = new Map();
    let dragStartPos = { x: 0, y: 0 };
    let selectedImageGroup = null;
    let selectedImageControls = null;
    let imagePointerInteraction = null;
    let pastedImageCounter = 0;

    let currentTool = 'pen';
    let previousTool = 'pen';
    let currentPenColor = "#325B8B";
    let currentMarkerColor = "#F2AA84";
    let currentStrokeStyle = 'solid';

    const STROKE_STYLE_DASHARRAYS = {
        solid: null,
        dashed: '8 5',
        'dash-dot': '8 4 2 4'
    };

    let linePoints = [];
    let currentLineGroup = null;
    let tempLinePath = null;
    let lineCircles = [];
    let lastLineTouchTime = 0;

    let arrowStart = null;
    let currentArrowGroup = null;
    let arrowShaftPath = null;
    let arrowHeadPath = null;

    let circleCenter = null;
    let currentCircleGroup = null;
    let tempCirclePath = null;
    let centerCircle = null;
    let lastCircleTouchTime = 0;

    let rectangleStart = null;
    let currentRectangleGroup = null;
    let tempRectangle = null;

    let arcCenter = null;
    let arcStart = null;
    let currentArcGroup = null;
    let fillArcPath = null;
    let fixedArcPath = null;
    let tempArcPath = null;
    let arcCenterMarker = null;
    let arcStartMarker = null;

    let eraserCursor = null;
    let pendingFillGroup = null;

    let strokeWidths = {
        'pen': 1.5,
        'marker': 15,
        'line': 1.5,
        'arrow': 1.5,
        'rectangle': 1.5,
        'circle': 1.5,
        'arc': 1.5
    };

    let toolTipElement;
    let tooltipTimeout;

    const PEN_ICON_SVG = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
    const MARKER_ICON_SVG = `<svg fill="#000000" viewBox="0 0 512 512"><g><g><polygon points="57.832,391.052 0,448.885 85.151,504.67 128.3,461.521"/></g></g><g><g><path d="M497.972,113.851l-92.47-92.47c-9.06-9.061-21.107-14.051-33.921-14.051c-12.813,0-24.861,4.99-33.922,14.051 L141.153,217.886l160.314,160.313l196.507-196.505C516.676,162.989,516.676,132.554,497.972,113.851z"/></g></g><g><g><path d="M119.691,239.347L61.56,297.479l21.069,21.069l-25.993,25.993c-0.401,0.401-0.787,0.811-1.163,1.228l118.112,118.112 c0.418-0.376,0.828-0.764,1.228-1.163l25.993-25.992l21.068,21.068l58.132-58.132L119.691,239.347z"/></g></g></svg>`;
    const ERASER_ICON_SVG = `<svg fill="#000000" viewBox="0 0 512 512"><g><g><path d="M495.276,133.96L377.032,15.715c-19.605-19.608-51.34-19.609-70.946,0L40.37,281.428 c-19.557,19.56-19.557,51.386,0.001,70.946l61.153,61.153c9.475,9.476,22.074,14.693,35.473,14.693h114.188 c13.4,0,25.998-5.219,35.473-14.693l25.678-25.678v-0.001l182.941-182.942C514.837,185.347,514.837,153.52,495.276,133.96z M263.009,389.878c-3.158,3.158-7.358,4.897-11.824,4.897H136.997c-4.467,0-8.666-1.739-11.824-4.897l-61.152-61.152 c-6.521-6.521-6.521-17.129-0.001-23.65l70.948-70.948l141.895,141.895L263.009,389.878z M471.629,181.258l-32.113,32.113 L297.622,71.475l32.113-32.113c6.522-6.521,17.129-6.519,23.65,0l118.244,118.245 C478.148,164.128,478.148,174.737,471.629,181.258z"/></g></g><g><g><path d="M495.278,477.546H16.722C7.487,477.546,0,485.034,0,494.269s7.487,16.722,16.722,16.722h478.555 c9.235,0,16.722-7.487,16.722-16.722S504.513,477.546,495.278,477.546z"/></g></g></svg>`;
    const LASSO_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.00001 10C5.00001 8.75523 5.7133 7.52938 7.06628 6.57433C8.41665 5.62113 10.3346 5 12.5 5C14.6654 5 16.5834 5.62113 17.9337 6.57433C19.2867 7.52938 20 8.75523 20 10C20 11.2448 19.2867 12.4706 17.9337 13.4257C16.5834 14.3789 14.6654 15 12.5 15C11.9849 15 11.4828 14.9648 10.9982 14.898C10.934 13.1045 9.18159 12 7.50001 12C6.92753 12 6.37589 12.1176 5.88506 12.3351C5.30127 11.6111 5.00001 10.8126 5.00001 10ZM12.5 17C11.7421 17 11.0036 16.9352 10.2949 16.8124C10.2111 16.9074 10.1215 16.9971 10.027 17.0814C10.0324 17.1351 10.0364 17.1937 10.0381 17.2566C10.0459 17.5458 10.0053 17.9424 9.80913 18.3641C9.38923 19.2667 8.42683 19.9562 6.7537 20.2187C4.68005 20.544 4.14608 21.1521 4.01748 21.3745C3.95033 21.4906 3.94254 21.5823 3.94406 21.6357C3.94468 21.6576 3.94702 21.6739 3.94861 21.6827C3.96296 21.7256 3.97448 21.7699 3.98295 21.8152C4.03316 22.0804 3.97228 22.3491 3.826 22.5638C3.74444 22.6836 3.63632 22.7865 3.50609 22.8627C3.40769 22.9205 3.29851 22.962 3.1823 22.9834C3.06521 23.0053 2.94748 23.0055 2.83406 22.9863C2.687 22.9617 2.55081 22.9051 2.43293 22.8238C2.31589 22.7434 2.21506 22.6375 2.13982 22.5103C2.1012 22.4453 2.06973 22.3756 2.0465 22.3023C2.04333 22.2927 2.04 22.2823 2.03655 22.2711C2.02484 22.2331 2.01167 22.1856 1.99902 22.1296C1.97383 22.0181 1.94991 21.8695 1.94487 21.6927C1.93466 21.3347 2.00276 20.8633 2.28609 20.3733C2.85846 19.3834 4.12384 18.6068 6.4437 18.2429C6.8529 18.1787 7.15489 18.0908 7.37778 17.9981C5.70287 17.9451 4.00001 16.8095 4.00001 15C4.00001 14.4998 4.14018 14.0417 4.37329 13.6452C3.52173 12.6101 3.00001 11.3665 3.00001 10C3.00001 7.93106 4.18951 6.15691 5.91292 4.94039C7.63895 3.72202 9.97098 3 12.5 3C15.029 3 17.3611 3.72202 19.0871 4.94039C20.8105 6.15691 22 7.93106 22 10C22 12.0689 20.8105 13.8431 19.0871 15.0596C17.3611 16.278 15.029 17 12.5 17ZM6.34227 14.3786C6.60474 14.1624 7.01132 14 7.50001 14C8.5482 14 9.00001 14.6444 9.00001 15C9.00001 15.0929 8.97952 15.185 8.9364 15.2772C8.85616 15.4487 8.687 15.6381 8.41217 15.7841C8.16534 15.9153 7.85219 16 7.50001 16C6.45182 16 6.00001 15.3556 6.00001 15C6.00001 14.8092 6.09212 14.5846 6.34227 14.3786Z" fill="#000000"/></svg>`;
    const LINE_ICON_SVG = `<svg viewBox="0 0 24 24"><circle cx="5" cy="19" r="2" fill="none" stroke="#000000" stroke-width="2"/><circle cx="19" cy="5" r="2" fill="none" stroke="#000000" stroke-width="2"/><line x1="6.41" y1="17.59" x2="17.59" y2="6.41" stroke="#000000" stroke-width="2"/></svg>`;
    const ARROW_ICON_SVG = `<svg viewBox="0 0 24 24"><circle cx="5" cy="19" r="2" fill="none" stroke="#000000" stroke-width="2"/><path d="M7 17 17 7m-6 0h6v6" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const RECTANGLE_ICON_SVG = `<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" fill="none" stroke="#000000" stroke-width="2"/><circle cx="4" cy="6" r="1.5" fill="#000000"/><circle cx="20" cy="18" r="1.5" fill="#000000"/></svg>`;
    const CIRCLE_ICON_SVG = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="#000000" stroke-width="2"/><circle cx="12" cy="12" r="1.5" fill="#000000"/></svg>`;
    const ARC_ICON_SVG = `<svg viewBox="0 0 24 24"><path d="M20 12 A8 8 0 0 0 12 4" fill="none" stroke="#000000" stroke-width="2"/><circle cx="12" cy="12" r="1.5" fill="#000000"/></svg>`;
    const IMAGE_ICON_SVG = `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="#495057" stroke-width="1.8"/><circle cx="8.5" cy="9" r="1.5" fill="#495057"/><path d="m5 17 5-5 3 3 2-2 4 4" fill="none" stroke="#495057" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const SAVE_ICON = `<svg viewBox="0 0 24 24"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM15 9H5V5h10v4z"/></svg>`;
    const UNDO_ICON = `<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5v3h4a7 7 0 0 1 0 14h-1v-2h1a5 5 0 0 0 0-10H9v5z"/></svg>`;
    const SVG_NS = "http://www.w3.org/2000/svg";

    let saveTimeout;
    let undoStack = [];
    let lastKnownDrawingState = null;
    const MAX_UNDO_STEPS = 20;

    function getPersistentCanvasContent(slideSvg) {
        const clone = slideSvg.cloneNode(true);
        clone.querySelectorAll('.pasted-image-controls-layer').forEach(controls => controls.remove());
        return clone.innerHTML;
    }

    function captureDrawingState() {
        const state = {};
        document.querySelectorAll('.slide-notes-canvas').forEach(slideSvg => {
            let id = slideSvg.getAttribute('data-slide-id');
            if (!id) {
                const slide = slideSvg.closest('section');
                if (slide) {
                    const indices = Reveal.getIndices(slide);
                    id = `slide-${indices.h}-${indices.v}`;
                    slideSvg.setAttribute('data-slide-id', id);
                }
            }
            if (id) state[id] = getPersistentCanvasContent(slideSvg);
        });
        return JSON.stringify(state);
    }

    function updateUndoButton() {
        const button = document.getElementById('notes-undo-button');
        if (!button) return;
        button.disabled = undoStack.length === 0;
        button.title = undoStack.length > 0
            ? `Undo last action (${undoStack.length} available)`
            : 'Nothing to undo';
        button.setAttribute('aria-label', button.title);
    }

    function recordUndoStep() {
        const currentState = captureDrawingState();
        if (lastKnownDrawingState === null) {
            lastKnownDrawingState = currentState;
            return;
        }
        if (currentState === lastKnownDrawingState) return;

        undoStack.push(lastKnownDrawingState);
        if (undoStack.length > MAX_UNDO_STEPS) undoStack.shift();
        lastKnownDrawingState = currentState;
        updateUndoButton();
    }

    function undoLastAction() {
        if (undoStack.length === 0) return;

        const previousState = JSON.parse(undoStack.pop());
        Reveal.getSlides().forEach(slide => {
            const indices = Reveal.getIndices(slide);
            const id = `slide-${indices.h}-${indices.v}`;
            let slideSvg = slide.querySelector('.slide-notes-canvas');

            if (Object.prototype.hasOwnProperty.call(previousState, id)) {
                if (!slideSvg) slideSvg = createSlideCanvas(slide, id);
                slideSvg.innerHTML = previousState[id];
            } else if (slideSvg) {
                slideSvg.remove();
            }
        });

        updateActiveSlideGroup();
        lastKnownDrawingState = captureDrawingState();
        saveToSessionStorage();
        updateUndoButton();
    }

    function requestSave() {
        recordUndoStep();
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveToSessionStorage, 300);
    }

    function saveToSessionStorage() {
        try {
            const stored = sessionStorage.getItem('revealHandwritingData');
            const data = stored ? JSON.parse(stored) : {};

            const allCanvases = document.querySelectorAll('.slide-notes-canvas');
            const currentSlideIds = new Set();

            allCanvases.forEach(slideSvg => {
                let id = slideSvg.getAttribute('data-slide-id');

                if (!id) {
                    const slide = slideSvg.closest('section');
                    if (slide) {
                        const indices = Reveal.getIndices(slide);
                        id = `slide-${indices.h}-${indices.v}`;
                        slideSvg.setAttribute('data-slide-id', id);
                    }
                }

                if (id) {
                    data[id] = getPersistentCanvasContent(slideSvg);
                    currentSlideIds.add(id);
                }
            });

            Object.keys(data).forEach(id => {
                if (id.indexOf('slide-') === 0 && !currentSlideIds.has(id)) delete data[id];
            });

            sessionStorage.setItem('revealHandwritingData', JSON.stringify(data));
        } catch (e) {
            console.warn("Handwriting plugin: Failed to save to sessionStorage", e);
        }
    }

    function loadFromSessionStorage() {
        try {
            const stored = sessionStorage.getItem('revealHandwritingData');
            if (stored) {
                const data = JSON.parse(stored);
                const slides = Reveal.getSlides();
                slides.forEach(slide => {
                    const indices = Reveal.getIndices(slide);
                    const id = `slide-${indices.h}-${indices.v}`;

                    if (data[id]) {
                        let slideSvg = slide.querySelector('.slide-notes-canvas');
                        if (!slideSvg) {
                            slideSvg = document.createElementNS(SVG_NS, "svg");
                            slideSvg.setAttribute("class", "slide-notes-canvas");
                            slideSvg.style.position = "absolute";
                            slideSvg.style.top = "0";
                            slideSvg.style.left = "0";
                            slideSvg.style.width = "100%";
                            slideSvg.style.height = "100%";
                            slideSvg.style.zIndex = "100";
                            slideSvg.style.pointerEvents = "none";
                            slideSvg.style.overflow = "visible";
                            slide.appendChild(slideSvg);
                        }
                        slideSvg.setAttribute('data-slide-id', id);
                        slideSvg.innerHTML = data[id];
                    }
                });
            }
        } catch (e) {
            console.warn("Handwriting plugin: Failed to load from sessionStorage", e);
        }
    }

    function calculateWidth(pressure, tiltX, tiltY) {
        const baseWidth = strokeWidths[currentTool] || 2;
        if (currentTool === 'marker') {
            const tiltMag = Math.sqrt(tiltX * tiltX + tiltY * tiltY) / 90;
            return baseWidth * (0.4 + pressure * 0.4 + tiltMag * 0.6);
        } else {
            return baseWidth * (1.0 + pressure * 0.5);
        }
    }

    function createSegment(p0, p1, p2, isLine = false) {
        const midX = isLine ? p2.x : (p1.x + p2.x) / 2;
        const midY = isLine ? p2.y : (p1.y + p2.y) / 2;
        const midP = (p1.p + p2.p) / 2;
        const midTx = (p1.tx + p2.tx) / 2;
        const midTy = (p1.ty + p2.ty) / 2;

        let startX = p0.x, startY = p0.y;
        if (!isLine && p0 !== p1) {
            startX = (p0.x + p1.x) / 2;
            startY = (p0.y + p1.y) / 2;
        }

        const segment = document.createElementNS(SVG_NS, "path");
        const d = isLine
            ? `M ${startX.toFixed(2)} ${startY.toFixed(2)} L ${midX.toFixed(2)} ${midY.toFixed(2)}`
            : `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;

        segment.setAttribute("d", d);
        segment.setAttribute("stroke-width", calculateWidth(midP, midTx, midTy).toFixed(2));
        return { segment, midX, midY };
    }

    const drawLoop = () => {
        if (!isDrawing || !currentStrokeGroup) return;

        if (pendingPoints.length > 0) {
            for (let i = 0; i < pendingPoints.length; i++) {
                const p = pendingPoints[i];
                const lastPoint = currentPoints[currentPoints.length - 1];

                if (lastPoint) {
                    const dx = p.x - lastPoint.x;
                    const dy = p.y - lastPoint.y;
                    if (dx * dx + dy * dy > 2) {
                        currentPoints.push(p);
                    }
                } else {
                    currentPoints.push(p);
                }
            }
            pendingPoints = [];

            while (lastProcessedIndex < currentPoints.length - 2) {
                const p0 = currentPoints[lastProcessedIndex];
                const p1 = currentPoints[lastProcessedIndex + 1];
                const p2 = currentPoints[lastProcessedIndex + 2];

                const { segment } = createSegment(p0, p1, p2);
                currentStrokeGroup.insertBefore(segment, dynamicTailPath);

                lastProcessedIndex++;
            }

            const n = currentPoints.length;
            if (n > 1) {
                const pEnd = currentPoints[n - 1];
                const pPrev = currentPoints[Math.max(0, n - 2)];
                const startX = (pPrev.x + pEnd.x) / 2;
                const startY = (pPrev.y + pEnd.y) / 2;

                dynamicTailPath.setAttribute("d", `M ${startX.toFixed(2)} ${startY.toFixed(2)} L ${pEnd.x.toFixed(2)} ${pEnd.y.toFixed(2)}`);
                dynamicTailPath.setAttribute("stroke-width", calculateWidth(pEnd.p, pEnd.tx, pEnd.ty).toFixed(2));
            }
        }
        requestAnimationFrame(drawLoop);
    };

    function applyLightSmoothingToPoints(points, win = 3) {
        if (points.length <= 2) return points.slice();
        const half = Math.floor(win / 2);
        const out = [];
        for (let i = 0; i < points.length; i++) {
            let sx = 0, sy = 0, sp = 0, stx = 0, sty = 0, cnt = 0;
            for (let k = -half; k <= half; k++) {
                const idx = Math.min(points.length - 1, Math.max(0, i + k));
                sx += points[idx].x; sy += points[idx].y;
                sp += points[idx].p; stx += points[idx].tx; sty += points[idx].ty;
                cnt++;
            }
            out.push({ x: sx / cnt, y: sy / cnt, p: sp / cnt, tx: stx / cnt, ty: sty / cnt });
        }
        return out;
    }

    const getToolIcon = (tool) => {
        switch (tool) {
            case 'pen': return PEN_ICON_SVG;
            case 'marker': return MARKER_ICON_SVG;
            case 'eraser': return ERASER_ICON_SVG;
            case 'lasso': return LASSO_ICON_SVG;
            case 'line': return LINE_ICON_SVG;
            case 'arrow': return ARROW_ICON_SVG;
            case 'rectangle': return RECTANGLE_ICON_SVG;
            case 'circle': return CIRCLE_ICON_SVG;
            case 'arc': return ARC_ICON_SVG;
            default: return PEN_ICON_SVG;
        }
    };

    const getPointInSvg = (x, y) => {
        if (!svg) return { x, y };
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        try {
            const ctm = svg.getScreenCTM();
            if (ctm) {
                return point.matrixTransform(ctm.inverse());
            }
        } catch (e) { }
        return { x, y };
    };

    const getElementPointInSvg = (element, x, y) => {
        if (!svg) return null;

        const elementMatrix = element.getScreenCTM();
        const svgMatrix = svg.getScreenCTM();
        if (!elementMatrix || !svgMatrix) return null;

        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        return point.matrixTransform(elementMatrix).matrixTransform(svgMatrix.inverse());
    };

    const getPointData = (ev) => {
        const svgPoint = getPointInSvg(ev.clientX, ev.clientY);
        let p = ev.pressure !== undefined ? ev.pressure : 0.5;
        if (p === 0 && ev.pointerType !== 'pen') p = 0.5;

        return {
            x: svgPoint.x,
            y: svgPoint.y,
            p: p,
            tx: ev.tiltX || 0,
            ty: ev.tiltY || 0
        };
    };

    Reveal.on('ready', event => {
        loadFromSessionStorage();

        const revealContainer = document.querySelector('.reveal');
        if (revealContainer) {
            revealContainer.addEventListener('pointermove', (e) => {
                revealContainer.classList.toggle('pen-pointer-active', e.pointerType === 'pen');
                if (penStyleLock) return;

                if (e.pointerType === 'pen') {
                    setCursorNone();
                    penStyleLock = true;
                    setTimeout(() => { penStyleLock = false; }, 100);
                } else {
                    setCursorDefault();
                }
            });
        }

        const existingUI = document.querySelectorAll('#notes-tool-container, #notes-delete-button-container, #notes-tool-tip, #notes-tool-menu, #polygon-fill-palette');
        existingUI.forEach(el => el.remove());

        createNotesUI();
        createTooltipUI();
        setupPenEvents();



        window.addEventListener("pointermove", (e) => {
            if (
                e.target.closest('#notes-tool-container') ||
                e.target.closest('#notes-delete-button-container') ||
                e.target.closest('#notes-tool-menu') ||
                e.target.closest('#polygon-fill-palette') ||
                e.target.closest('z-controls')
            ) return;
        });

        Reveal.on('slidechanged', () => {
            updateActiveSlideGroup();
            lastKnownDrawingState = captureDrawingState();
        });
        updateActiveSlideGroup();
        lastKnownDrawingState = captureDrawingState();
        updateUndoButton();

    });

    function createSlideCanvas(slide, id) {
        const slideSvg = document.createElementNS(SVG_NS, "svg");
        slideSvg.setAttribute("class", "slide-notes-canvas");
        slideSvg.setAttribute('data-slide-id', id);
        slideSvg.style.position = "absolute";
        slideSvg.style.top = "0";
        slideSvg.style.left = "0";
        slideSvg.style.width = "100%";
        slideSvg.style.height = "100%";
        slideSvg.style.zIndex = "100";
        slideSvg.style.pointerEvents = "none";
        slideSvg.style.overflow = "visible";
        slide.appendChild(slideSvg);

        const pastedImages = document.createElementNS(SVG_NS, "g");
        pastedImages.setAttribute("class", "pasted-images");
        slideSvg.appendChild(pastedImages);

        const markerStrokes = document.createElementNS(SVG_NS, "g");
        markerStrokes.setAttribute("class", "marker-strokes");
        slideSvg.appendChild(markerStrokes);

        const penStrokes = document.createElementNS(SVG_NS, "g");
        penStrokes.setAttribute("class", "pen-strokes");
        slideSvg.appendChild(penStrokes);
        return slideSvg;
    }

    function updateActiveSlideGroup() {
        if (document.body.classList.contains('print-pdf') || document.body.classList.contains('reveal-print')) {
            return;
        }

        clearSelection();

        if (currentTool === 'line') {
            lineCircles.forEach(c => c.remove());
            if (tempLinePath) tempLinePath.remove();
            linePoints = [];
            currentLineGroup = null;
            tempLinePath = null;
            lineCircles = [];
        }

        if (currentTool === 'arrow') {
            if (currentArrowGroup) currentArrowGroup.remove();
            arrowStart = null;
            currentArrowGroup = null;
            arrowShaftPath = null;
            arrowHeadPath = null;
        }

        if (currentTool === 'circle') {
            if (centerCircle) centerCircle.remove();
            if (tempCirclePath) tempCirclePath.remove();
            circleCenter = null;
            currentCircleGroup = null;
            tempCirclePath = null;
            centerCircle = null;
        }

        if (currentTool === 'rectangle') {
            if (currentRectangleGroup) currentRectangleGroup.remove();
            rectangleStart = null;
            currentRectangleGroup = null;
            tempRectangle = null;
        }

        if (currentTool === 'arc') {
            if (arcCenterMarker) arcCenterMarker.remove();
            if (arcStartMarker) arcStartMarker.remove();
            if (currentArcGroup) currentArcGroup.remove();
            arcCenter = null;
            arcStart = null;
            currentArcGroup = null;
            fillArcPath = null;
            fixedArcPath = null;
            tempArcPath = null;
            arcCenterMarker = null;
            arcStartMarker = null;
        }

        const currentSlide = Reveal.getCurrentSlide();
        if (!currentSlide) return;

        let slideSvg = currentSlide.querySelector('.slide-notes-canvas');

        if (!slideSvg) {
            const indices = Reveal.getIndices(currentSlide);
            slideSvg = createSlideCanvas(currentSlide, `slide-${indices.h}-${indices.v}`);
        } else if (!slideSvg.hasAttribute('data-slide-id')) {
            const indices = Reveal.getIndices(currentSlide);
            slideSvg.setAttribute('data-slide-id', `slide-${indices.h}-${indices.v}`);
        }

        svg = slideSvg;
        currentSlideGroup = slideSvg;
    }

    function beginPenSession(e) {
        penSession = true;
        if (svg) svg.style.pointerEvents = "all";
        try { if (svg) svg.setPointerCapture(e.pointerId); } catch (err) { }
    }

    function endPenSession(e) {
        penSession = false;
        try { if (svg && svg.hasPointerCapture?.(e.pointerId)) svg.releasePointerCapture(e.pointerId); } catch (err) { }
        if (svg) svg.style.pointerEvents = "none";
    }


    function setCursorNone() {
        const reveal = document.querySelector(".reveal");
        if (reveal) reveal.style.cursor = "none";
        if (svg) svg.style.cursor = "none";
    }

    function setCursorDefault() {
        const reveal = document.querySelector(".reveal");
        if (reveal) reveal.style.cursor = "default";
        if (svg) svg.style.cursor = "default";
    }

    function setTool(toolName) {
        if (currentTool === 'line' && toolName !== 'line') {
            lineCircles.forEach(c => c.remove());
            if (tempLinePath) tempLinePath.remove();
            linePoints = [];
            currentLineGroup = null;
            tempLinePath = null;
            lineCircles = [];
            requestSave();
        }

        if (currentTool === 'arrow' && toolName !== 'arrow') {
            if (currentArrowGroup) currentArrowGroup.remove();
            arrowStart = null;
            currentArrowGroup = null;
            arrowShaftPath = null;
            arrowHeadPath = null;
            requestSave();
        }

        if (currentTool === 'circle' && toolName !== 'circle') {
            if (centerCircle) centerCircle.remove();
            if (tempCirclePath) tempCirclePath.remove();
            circleCenter = null;
            currentCircleGroup = null;
            tempCirclePath = null;
            centerCircle = null;
            requestSave();
        }

        if (currentTool === 'rectangle' && toolName !== 'rectangle') {
            if (currentRectangleGroup) currentRectangleGroup.remove();
            rectangleStart = null;
            currentRectangleGroup = null;
            tempRectangle = null;
            requestSave();
        }

        if (currentTool === 'arc' && toolName !== 'arc') {
            if (arcCenterMarker) arcCenterMarker.remove();
            if (arcStartMarker) arcStartMarker.remove();
            if (currentArcGroup) currentArcGroup.remove();
            arcCenter = null;
            arcStart = null;
            currentArcGroup = null;
            fillArcPath = null;
            fixedArcPath = null;
            tempArcPath = null;
            arcCenterMarker = null;
            arcStartMarker = null;
            requestSave();
        }

        currentTool = toolName;

        const lineStyleSection = document.getElementById('notes-line-style-section');
        if (lineStyleSection) {
            lineStyleSection.style.display = ['line', 'arrow', 'rectangle', 'circle', 'arc'].includes(toolName) ? 'block' : 'none';
        }

        const container = document.getElementById('notes-tool-container');
        if (container) {
            const buttons = container.querySelectorAll('.notes-tool-select-btn');
            buttons.forEach(btn => {
                if (btn.dataset.tool === toolName) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        }

        const currentBtn = document.getElementById('notes-current-tool-btn');
        if (currentBtn) {
            currentBtn.innerHTML = getToolIcon(toolName);
            currentBtn.title = `Current tool: ${toolName[0].toUpperCase() + toolName.slice(1)}`;
        }
    }

    function applyStrokeStyle(group) {
        const dashArray = STROKE_STYLE_DASHARRAYS[currentStrokeStyle];
        if (dashArray) {
            group.setAttribute('stroke-dasharray', dashArray);
        } else {
            group.removeAttribute('stroke-dasharray');
        }
    }

    function setRectangleBounds(rectangle, start, end) {
        rectangle.setAttribute('x', Math.min(start.x, end.x));
        rectangle.setAttribute('y', Math.min(start.y, end.y));
        rectangle.setAttribute('width', Math.abs(end.x - start.x));
        rectangle.setAttribute('height', Math.abs(end.y - start.y));
    }

    function setArrowGeometry(start, end, shaft, head, width) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        if (length === 0) {
            shaft.setAttribute('d', '');
            head.setAttribute('d', '');
            return;
        }

        const ux = dx / length;
        const uy = dy / length;
        const headLength = Math.min(Math.max(8, width * 5), length * 0.45);
        const halfHeadWidth = headLength * 0.45;
        const baseX = end.x - ux * headLength;
        const baseY = end.y - uy * headLength;
        const sideX = -uy * halfHeadWidth;
        const sideY = ux * halfHeadWidth;

        shaft.setAttribute('d', `M ${start.x} ${start.y} L ${baseX} ${baseY}`);
        head.setAttribute(
            'd',
            `M ${baseX + sideX} ${baseY + sideY} L ${end.x} ${end.y} L ${baseX - sideX} ${baseY - sideY} Z`
        );
    }

    function getArcPath(center, start, end, closeAtCenter = false) {
        const radius = Math.hypot(start.x - center.x, start.y - center.y);
        if (radius === 0) return null;

        const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
        const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
        const clockwiseAngle = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
        const sweepFlag = clockwiseAngle <= Math.PI ? 1 : 0;
        const endX = center.x + radius * Math.cos(endAngle);
        const endY = center.y + radius * Math.sin(endAngle);
        if (Math.hypot(endX - start.x, endY - start.y) < 0.001) return null;

        const arcCommand = `A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY}`;
        return closeAtCenter
            ? `M ${center.x} ${center.y} L ${start.x} ${start.y} ${arcCommand} Z`
            : `M ${start.x} ${start.y} ${arcCommand}`;
    }

    function isPointInPolygon(point, vs) {
        let x = point.x, y = point.y;
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            let xi = vs[i].x, yi = vs[i].y;
            let xj = vs[j].x, yj = vs[j].y;
            let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function showTooltipIcon(x, y, iconSvg, duration) {
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        toolTipElement.innerHTML = iconSvg;
        toolTipElement.style.left = x + 15 + 'px';
        toolTipElement.style.top = y - 15 + 'px';
        toolTipElement.style.display = 'flex';
        if (duration) {
            tooltipTimeout = setTimeout(() => {
                toolTipElement.style.display = 'none';
            }, duration);
        }
    }

    function hideTooltipIcon() {
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        toolTipElement.style.display = 'none';
    }

    function syncPaletteSelection() {
        const palette = document.getElementById('notes-color-palette');
        if (!palette) return;

        const currentSelected = palette.querySelector('.selected');
        if (currentSelected) currentSelected.classList.remove('selected');

        let color;
        if (currentTool === 'pen' || currentTool === 'line' || currentTool === 'arrow' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'arc') {
            color = currentPenColor;
        } else {
            color = currentMarkerColor;
        }
        const swatch = palette.querySelector(`.color-swatch[data-color="${color}"]`);
        if (swatch) swatch.classList.add('selected');
    }

    function eraseAt(x, y) {
        showTooltipIcon(x, y, ERASER_ICON_SVG, 200);
        const element = document.elementFromPoint(x, y);
        if (element) {
            const group = element.closest('g.stroke-group, circle.dot');
            if (group && group.closest('.slide-notes-canvas') === currentSlideGroup) {
                if (group.id === 'current-lasso') return;
                group.remove();
                requestSave();
            }
        }
    }

    function performLassoSelection() {
        if (lassoPoints.length < 3) return;

        selectedElements = [];
        const groups = Array.from(currentSlideGroup.querySelectorAll('g.stroke-group, circle.dot'));

        groups.forEach(group => {
            if (group.id === 'current-lasso') return;

            if (group.tagName === 'circle') {
                const cx = parseFloat(group.getAttribute('cx'));
                const cy = parseFloat(group.getAttribute('cy'));
                const point = getElementPointInSvg(group, cx, cy);
                if (point && isPointInPolygon(point, lassoPoints)) {
                    selectedElements.push(group);
                    group.classList.add('selected-stroke');
                    group.style.fill = "#ff0000";
                    group.style.opacity = "0.7";
                }
            } else {
                const paths = Array.from(group.querySelectorAll('path, circle'));
                if (paths.length === 0) return;

                let isInside = true;
                for (let i = 0; i < paths.length; i += Math.max(1, Math.floor(paths.length / 5))) {
                    try {
                        let localPoint;
                        if (paths[i].tagName === 'circle') {
                            localPoint = {
                                x: parseFloat(paths[i].getAttribute('cx')),
                                y: parseFloat(paths[i].getAttribute('cy'))
                            };
                        } else {
                            localPoint = paths[i].getPointAtLength(0);
                        }
                        const point = getElementPointInSvg(paths[i], localPoint.x, localPoint.y);
                        if (!point || !isPointInPolygon(point, lassoPoints)) {
                            isInside = false;
                            break;
                        }
                    } catch (e) { }
                }

                if (isInside) {
                    selectedElements.push(group);
                    group.classList.add('selected-stroke');
                    group.style.stroke = "#ff0000";
                    group.style.opacity = "0.7";
                }
            }
        });
    }

    function absorbPenEvents(evt) {
        if (evt.pointerType === 'pen') {
            evt.preventDefault();
            evt.stopPropagation();
            return true;
        }
        return false;
    }

    function clearSelection() {
        if (!svg) return;
        svg.style.pointerEvents = "none";

        if (isDraggingSelection) {
            try { svg.releasePointerCapture(); } catch (e) { }
        }

        selectedElements.forEach(el => {
            el.classList.remove('selected-stroke');

            if (el.tagName === 'circle') {
                el.style.fill = "";
            } else {
                el.style.stroke = "";
            }

            el.style.opacity = "";
            el.style.transform = "";
        });

        selectedElements = [];
        selectionBaseTransforms.clear();
        isMovingSelection = false;
        isDraggingSelection = false;

        const lassoEl = document.getElementById('current-lasso');
        if (lassoEl) lassoEl.remove();

        const deleteBtnContainer = document.getElementById('notes-delete-button-container');
        if (deleteBtnContainer) deleteBtnContainer.style.display = 'none';
        clearSelectedImage();
    }

    function moveSelectedElements(dx, dy) {
        selectedElements.forEach(el => {
            const baseTransform = selectionBaseTransforms.get(el) || '';
            if (dx === 0 && dy === 0) {
                if (baseTransform) el.setAttribute('transform', baseTransform);
                else el.removeAttribute('transform');
                return;
            }

            el.setAttribute('transform', `${baseTransform} translate(${dx}, ${dy})`.trim());
        });
    }

    function swallowUIEvents(el) {
        ['pointerdown', 'pointermove', 'pointerup', 'click'].forEach(type => {
            el.addEventListener(type, ev => {
                ev.stopPropagation();
            });
        });
    }

    function getPastedImageLayer(slideSvg) {
        let layer = Array.from(slideSvg.children).find(child => child.classList.contains('pasted-images'));
        if (!layer) {
            layer = document.createElementNS(SVG_NS, 'g');
            layer.setAttribute('class', 'pasted-images');
            slideSvg.insertBefore(layer, slideSvg.firstChild);
        }
        return layer;
    }

    function updatePastedImageTransform(group) {
        const centerX = parseFloat(group.getAttribute('data-center-x'));
        const centerY = parseFloat(group.getAttribute('data-center-y'));
        const rotation = parseFloat(group.getAttribute('data-rotation'));
        const transform = `translate(${centerX} ${centerY}) rotate(${rotation})`;
        group.setAttribute('transform', transform);
        if (selectedImageGroup === group && selectedImageControls) {
            selectedImageControls.setAttribute('transform', transform);
        }
    }

    function updatePastedImageControls(group) {
        const width = parseFloat(group.getAttribute('data-image-width'));
        const height = parseFloat(group.getAttribute('data-image-height'));
        const controls = document.createElementNS(SVG_NS, 'g');
        controls.setAttribute('class', 'pasted-image-controls');
        controls.setAttribute('data-image-id', group.getAttribute('data-image-id'));
        controls.setAttribute('transform', group.getAttribute('transform'));
        controls.setAttribute('pointer-events', 'none');

        const outline = document.createElementNS(SVG_NS, 'rect');
        outline.setAttribute('x', -width / 2);
        outline.setAttribute('y', -height / 2);
        outline.setAttribute('width', width);
        outline.setAttribute('height', height);
        outline.setAttribute('fill', 'none');
        outline.setAttribute('stroke', '#2563eb');
        outline.setAttribute('stroke-width', '2');
        outline.setAttribute('stroke-dasharray', '6 4');
        outline.setAttribute('pointer-events', 'none');
        controls.appendChild(outline);

        const rotateLine = document.createElementNS(SVG_NS, 'line');
        rotateLine.setAttribute('x1', '0');
        rotateLine.setAttribute('y1', -height / 2);
        rotateLine.setAttribute('x2', '0');
        rotateLine.setAttribute('y2', -height / 2 - 24);
        rotateLine.setAttribute('stroke', '#2563eb');
        rotateLine.setAttribute('stroke-width', '2');
        rotateLine.setAttribute('pointer-events', 'none');
        controls.appendChild(rotateLine);

        const rotateHandle = document.createElementNS(SVG_NS, 'circle');
        rotateHandle.setAttribute('cx', '0');
        rotateHandle.setAttribute('cy', -height / 2 - 24);
        rotateHandle.setAttribute('r', '11');
        rotateHandle.setAttribute('class', 'pasted-image-control-handle');
        rotateHandle.setAttribute('data-image-action', 'rotate');
        rotateHandle.setAttribute('fill', '#ffffff');
        rotateHandle.setAttribute('stroke', '#2563eb');
        rotateHandle.setAttribute('stroke-width', '2');
        rotateHandle.setAttribute('pointer-events', 'all');
        controls.appendChild(rotateHandle);

        const rotateSymbol = document.createElementNS(SVG_NS, 'g');
        rotateSymbol.setAttribute('transform', `translate(0 ${-height / 2 - 24})`);
        rotateSymbol.setAttribute('pointer-events', 'none');
        const rotateArrow = document.createElementNS(SVG_NS, 'path');
        rotateArrow.setAttribute('d', 'M 0 -5.5 A 5.5 5.5 0 1 1 -5.5 0');
        rotateArrow.setAttribute('fill', 'none');
        rotateArrow.setAttribute('stroke', '#2563eb');
        rotateArrow.setAttribute('stroke-width', '1.4');
        rotateArrow.setAttribute('stroke-linecap', 'round');
        rotateArrow.setAttribute('stroke-linejoin', 'round');
        rotateSymbol.appendChild(rotateArrow);

        const rotateArrowHead = document.createElementNS(SVG_NS, 'path');
        rotateArrowHead.setAttribute('d', 'M -5.5 -4.5 L -7.9 0 L -3.1 0 Z');
        rotateArrowHead.setAttribute('fill', '#2563eb');
        rotateSymbol.appendChild(rotateArrowHead);
        controls.appendChild(rotateSymbol);

        const resizeHandle = document.createElementNS(SVG_NS, 'circle');
        resizeHandle.setAttribute('cx', width / 2);
        resizeHandle.setAttribute('cy', height / 2);
        resizeHandle.setAttribute('r', '11');
        resizeHandle.setAttribute('class', 'pasted-image-control-handle');
        resizeHandle.setAttribute('data-image-action', 'resize');
        resizeHandle.setAttribute('fill', '#ffffff');
        resizeHandle.setAttribute('stroke', '#2563eb');
        resizeHandle.setAttribute('stroke-width', '2');
        resizeHandle.setAttribute('pointer-events', 'all');
        controls.appendChild(resizeHandle);

        const resizeArrow = document.createElementNS(SVG_NS, 'path');
        resizeArrow.setAttribute('d', `M ${width / 2 - 6} ${height / 2 - 6} L ${width / 2 + 6} ${height / 2 + 6} M ${width / 2 - 6} ${height / 2 - 6} L ${width / 2 - 2.5} ${height / 2 - 6} M ${width / 2 - 6} ${height / 2 - 6} L ${width / 2 - 6} ${height / 2 - 2.5} M ${width / 2 + 6} ${height / 2 + 6} L ${width / 2 + 2.5} ${height / 2 + 6} M ${width / 2 + 6} ${height / 2 + 6} L ${width / 2 + 6} ${height / 2 + 2.5}`);
        resizeArrow.setAttribute('fill', 'none');
        resizeArrow.setAttribute('stroke', '#2563eb');
        resizeArrow.setAttribute('stroke-width', '1.4');
        resizeArrow.setAttribute('stroke-linecap', 'round');
        resizeArrow.setAttribute('stroke-linejoin', 'round');
        resizeArrow.setAttribute('pointer-events', 'none');
        controls.appendChild(resizeArrow);

        const oldControls = selectedImageControls;
        if (oldControls) oldControls.remove();
        let controlsLayer = Array.from(svg.children).find(child =>
            child.classList.contains('pasted-image-controls-layer')
        );
        if (!controlsLayer) {
            controlsLayer = document.createElementNS(SVG_NS, 'g');
            controlsLayer.setAttribute('class', 'pasted-image-controls-layer');
            svg.appendChild(controlsLayer);
        }
        controlsLayer.appendChild(controls);
        selectedImageControls = controls;
    }

    function clearSelectedImage() {
        if (!selectedImageGroup) return;
        if (selectedImageControls) selectedImageControls.remove();
        selectedImageGroup = null;
        selectedImageControls = null;
        if (selectedElements.length === 0) {
            const deleteBtnContainer = document.getElementById('notes-delete-button-container');
            if (deleteBtnContainer) deleteBtnContainer.style.display = 'none';
        }
    }

    function selectPastedImage(group) {
        if (selectedImageGroup !== group) {
            clearSelection();
            selectedImageGroup = group;
        }
        updatePastedImageControls(group);
        const deleteBtnContainer = document.getElementById('notes-delete-button-container');
        if (deleteBtnContainer) deleteBtnContainer.style.display = 'flex';
    }

    function startPastedImageInteraction(event, group) {
        selectPastedImage(group);
        const point = getPointInSvg(event.clientX, event.clientY);
        const centerX = parseFloat(group.getAttribute('data-center-x'));
        const centerY = parseFloat(group.getAttribute('data-center-y'));
        const width = parseFloat(group.getAttribute('data-image-width'));
        const height = parseFloat(group.getAttribute('data-image-height'));
        const rotation = parseFloat(group.getAttribute('data-rotation'));
        const action = event.target.closest('[data-image-action]');

        imagePointerInteraction = {
            pointerId: event.pointerId,
            action: action ? action.getAttribute('data-image-action') : 'move',
            startX: point.x,
            startY: point.y,
            centerX,
            centerY,
            width,
            height,
            rotation,
            startAngle: Math.atan2(point.y - centerY, point.x - centerX),
            startDistance: Math.hypot(point.x - centerX, point.y - centerY),
            group
        };

        svg.style.pointerEvents = 'all';
    }

    function handlePastedImagePointerMove(event) {
        if (!imagePointerInteraction || imagePointerInteraction.pointerId !== event.pointerId) return false;

        const interaction = imagePointerInteraction;
        const point = getPointInSvg(event.clientX, event.clientY);
        const group = interaction.group;

        if (interaction.action === 'move') {
            group.setAttribute('data-center-x', interaction.centerX + point.x - interaction.startX);
            group.setAttribute('data-center-y', interaction.centerY + point.y - interaction.startY);
        } else if (interaction.action === 'resize') {
            const distance = Math.hypot(point.x - interaction.centerX, point.y - interaction.centerY);
            const scale = Math.max(24 / interaction.width, 24 / interaction.height, distance / interaction.startDistance);
            const maxScale = Math.max(1, Math.max(svg.clientWidth, svg.clientHeight) * 3 / Math.max(interaction.width, interaction.height));
            const boundedScale = Math.min(scale, maxScale);
            const width = interaction.width * boundedScale;
            const height = interaction.height * boundedScale;
            group.setAttribute('data-image-width', width);
            group.setAttribute('data-image-height', height);
            const image = group.querySelector('image');
            image.setAttribute('x', -width / 2);
            image.setAttribute('y', -height / 2);
            image.setAttribute('width', width);
            image.setAttribute('height', height);
            updatePastedImageControls(group);
        } else if (interaction.action === 'rotate') {
            const angle = Math.atan2(point.y - interaction.centerY, point.x - interaction.centerX);
            let angleDelta = angle - interaction.startAngle;
            if (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
            if (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
            const rotation = interaction.rotation + angleDelta * 180 / Math.PI;
            group.setAttribute('data-rotation', rotation);
        }

        updatePastedImageTransform(group);
        return true;
    }

    function finishPastedImageInteraction(event) {
        if (!imagePointerInteraction || imagePointerInteraction.pointerId !== event.pointerId) return false;
        imagePointerInteraction = null;
        if (svg) svg.style.pointerEvents = 'none';
        requestSave();
        return true;
    }

    function insertClipboardImageFile(file) {
        const reader = new FileReader();
        reader.onerror = () => window.alert('The image file could not be read.');
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                window.alert('The image file could not be read.');
                return;
            }

            const image = new Image();
            image.onerror = () => window.alert('The selected image could not be decoded.');
            image.onload = () => {
                updateActiveSlideGroup();
                if (!svg || !currentSlideGroup) return;
                if (!image.naturalWidth || !image.naturalHeight) {
                    window.alert('The clipboard image has invalid dimensions.');
                    return;
                }

                const maxWidth = svg.clientWidth * 0.6;
                const maxHeight = svg.clientHeight * 0.6;
                const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
                const width = image.naturalWidth * scale;
                const height = image.naturalHeight * scale;
                const group = document.createElementNS(SVG_NS, 'g');
                group.setAttribute('class', 'pasted-image');
                group.setAttribute('data-image-id', `pasted-image-${Date.now()}-${++pastedImageCounter}`);
                const screenCenter = getPointInSvg(window.innerWidth / 2, window.innerHeight / 2);
                group.setAttribute('data-center-x', screenCenter.x);
                group.setAttribute('data-center-y', screenCenter.y);
                group.setAttribute('data-image-width', width);
                group.setAttribute('data-image-height', height);
                group.setAttribute('data-rotation', '0');

                const svgImage = document.createElementNS(SVG_NS, 'image');
                svgImage.setAttribute('class', 'pasted-image-content');
                svgImage.setAttribute('x', -width / 2);
                svgImage.setAttribute('y', -height / 2);
                svgImage.setAttribute('width', width);
                svgImage.setAttribute('height', height);
                svgImage.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                svgImage.setAttribute('href', reader.result);
                svgImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', reader.result);
                svgImage.setAttribute('pointer-events', 'all');
                group.appendChild(svgImage);
                updatePastedImageTransform(group);

                getPastedImageLayer(currentSlideGroup).appendChild(group);
                selectPastedImage(group);
                requestSave();
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    }

    function pasteClipboardImage(event) {
        if (!event.clipboardData || !event.clipboardData.items) return;
        const target = event.target instanceof Element ? event.target : null;
        if (target && (target.closest('input, textarea, select') || target.isContentEditable)) return;

        const imageItem = Array.from(event.clipboardData.items).find(item =>
            item.type === 'image/png' || item.type === 'image/jpeg'
        );
        if (!imageItem) return;

        const file = imageItem.getAsFile();
        if (!file) return;
        event.preventDefault();
        insertClipboardImageFile(file);
    }

    function setupPenEvents() {
        window.addEventListener('pointerdown', event => {
            if (event.pointerType === 'pen') return;
            const target = event.target instanceof Element ? event.target : null;
            const imageControls = target ? target.closest('.pasted-image-controls') : null;
            const imageId = imageControls ? imageControls.getAttribute('data-image-id') : null;
            const imageGroup = target && target.closest('g.pasted-image')
                ? target.closest('g.pasted-image')
                : imageId && svg
                    ? Array.from(svg.querySelectorAll('g.pasted-image')).find(group =>
                        group.getAttribute('data-image-id') === imageId
                    )
                    : null;
            if (imageGroup && svg && svg.contains(imageGroup)) {
                event.preventDefault();
                event.stopPropagation();
                startPastedImageInteraction(event, imageGroup);
                return;
            }
            if (selectedImageGroup && !(target && target.closest(
                '#notes-tool-container, #notes-delete-button-container, #notes-tool-menu, #polygon-fill-palette'
            ))) {
                clearSelectedImage();
            }
        }, true);

        window.addEventListener('pointermove', event => {
            if (!imagePointerInteraction || imagePointerInteraction.pointerId !== event.pointerId) return;
            if (handlePastedImagePointerMove(event)) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);

        ['pointerup', 'pointercancel'].forEach(type => {
            window.addEventListener(type, event => {
                if (finishPastedImageInteraction(event)) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }, true);
        });

        document.addEventListener('paste', pasteClipboardImage);

        window.addEventListener('contextmenu', (e) => {
            if (e.pointerType === 'pen') e.preventDefault();
        });

        window.addEventListener('pointerdown', (e) => {
            if (svg && !document.body.contains(svg)) {
                updateActiveSlideGroup();
            }

            const menu = document.getElementById('notes-tool-menu');
            if (menu && menu.classList.contains('active')) {
                if (!e.target.closest('#notes-tool-menu') && !e.target.closest('#notes-tool-container')) {
                    menu.classList.remove('active');
                }
            }

            if (e.pointerType !== 'pen') {
                if (svg) svg.style.pointerEvents = "none";
                return;
            }

            if (!svg) return;

            beginPenSession(e);

            if (
                e.target.closest('#notes-tool-container') ||
                e.target.closest('#notes-delete-button-container') ||
                e.target.closest('#notes-tool-menu') ||
                e.target.closest('#polygon-fill-palette') ||
                e.target.closest('z-controls')
            ) return;

            absorbPenEvents(e);
            svg.style.pointerEvents = "all";

            const pData = getPointData(e);

            if (isMovingSelection) {
                isDraggingSelection = true;
                dragStartPos = { x: pData.x, y: pData.y };
                selectionBaseTransforms = new Map(
                    selectedElements.map(el => [el, el.getAttribute('transform') || ''])
                );
                svg.setPointerCapture(e.pointerId);
                return;
            }

            isDrawing = false;
            isErasing = false;
            isLassoing = false;

            const isEraserButton = (e.buttons & 32);
            const isLassoButton = (e.buttons & 2);

            if (currentTool === 'eraser' || isEraserButton) {
                isErasing = true;
                clearSelection();
                eraseAt(e.clientX, e.clientY);
            } else if (currentTool === 'lasso' || isLassoButton) {
                isLassoing = true;
                clearSelection();
                lassoPoints = [{ x: pData.x, y: pData.y }];
                showTooltipIcon(e.clientX, e.clientY, LASSO_ICON_SVG, 200);

                let currentLassoElement = document.createElementNS(SVG_NS, "path");
                currentLassoElement.setAttribute("id", "current-lasso");
                currentLassoElement.setAttribute("stroke", "#555");
                currentLassoElement.setAttribute("stroke-width", "2");
                currentLassoElement.setAttribute("stroke-dasharray", "5,5");
                currentLassoElement.setAttribute("fill", "rgba(0,0,0,0.05)");
                currentLassoElement.setAttribute("d", `M ${pData.x} ${pData.y}`);
                svg.appendChild(currentLassoElement);
            } else if (currentTool === 'line') {
                const now = Date.now();
                if (now - lastLineTouchTime < 400) {
                    lastLineTouchTime = 0;
                    setTool(previousTool || 'pen');
                    syncPaletteSelection();
                    const slider = document.getElementById('notes-stroke-width-slider');
                    const label = document.getElementById('stroke-width-value');
                    if (slider && label) {
                        slider.value = strokeWidths[currentTool];
                        label.textContent = strokeWidths[currentTool];
                    }
                    return;
                }
                lastLineTouchTime = now;

                clearSelection();
                const pt = { x: pData.x, y: pData.y };

                let snapIndex = -1;
                for (let i = 0; i < linePoints.length; i++) {
                    if (Math.hypot(pt.x - linePoints[i].x, pt.y - linePoints[i].y) < 15) {
                        snapIndex = i;
                        break;
                    }
                }

                if (snapIndex !== -1) {
                    const snapPt = linePoints[snapIndex];
                    const fixedPath = currentLineGroup.querySelector('.fixed-lines');
                    const d = fixedPath.getAttribute("d");
                    fixedPath.setAttribute("d", d + ` L ${snapPt.x} ${snapPt.y} Z`);

                    pendingFillGroup = currentLineGroup;
                    const fillPal = document.getElementById('polygon-fill-palette');
                    if (fillPal) {
                        fillPal.style.left = Math.min(e.clientX, window.innerWidth - 240) + 'px';
                        fillPal.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
                        fillPal.style.display = 'flex';
                    }

                    lineCircles.forEach(c => c.remove());
                    if (tempLinePath) tempLinePath.remove();
                    linePoints = [];
                    currentLineGroup = null;
                    tempLinePath = null;
                    lineCircles = [];
                    setTool(previousTool || 'pen');
                    syncPaletteSelection();
                    return;
                }

                if (linePoints.length === 0) {
                    currentLineGroup = document.createElementNS(SVG_NS, "g");
                    currentLineGroup.setAttribute("class", "stroke-group");
                    currentLineGroup.style.pointerEvents = "all";
                    currentLineGroup.setAttribute("stroke", currentPenColor);
                    currentLineGroup.setAttribute("fill", "none");
                    currentLineGroup.setAttribute("stroke-linecap", "round");
                    currentLineGroup.setAttribute("stroke-linejoin", "round");
                    applyStrokeStyle(currentLineGroup);

                    const fixedPath = document.createElementNS(SVG_NS, "path");
                    fixedPath.setAttribute("class", "fixed-lines");
                    fixedPath.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                    fixedPath.setAttribute("d", `M ${pt.x} ${pt.y}`);
                    currentLineGroup.appendChild(fixedPath);

                    tempLinePath = document.createElementNS(SVG_NS, "path");
                    tempLinePath.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                    currentLineGroup.appendChild(tempLinePath);

                    currentSlideGroup.querySelector('.pen-strokes').appendChild(currentLineGroup);
                } else {
                    const fixedPath = currentLineGroup.querySelector('.fixed-lines');
                    const d = fixedPath.getAttribute("d");
                    fixedPath.setAttribute("d", d + ` L ${pt.x} ${pt.y}`);
                }

                linePoints.push(pt);

                const circle = document.createElementNS(SVG_NS, "circle");
                circle.setAttribute("cx", pt.x);
                circle.setAttribute("cy", pt.y);
                circle.setAttribute("r", strokeWidths['pen'] * 2);
                circle.setAttribute("fill", "none");
                circle.setAttribute("stroke", currentPenColor);
                circle.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                currentSlideGroup.querySelector('.pen-strokes').appendChild(circle);
                lineCircles.push(circle);

                tempLinePath.setAttribute('d', `M ${pt.x} ${pt.y} L ${pt.x} ${pt.y}`);
                tempLinePath.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                tempLinePath.style.display = 'block';
            } else if (currentTool === 'arrow') {
                clearSelection();
                const pt = { x: pData.x, y: pData.y };

                if (!arrowStart) {
                    arrowStart = pt;
                    currentArrowGroup = document.createElementNS(SVG_NS, 'g');
                    currentArrowGroup.setAttribute('class', 'stroke-group');
                    currentArrowGroup.style.pointerEvents = 'all';
                    currentArrowGroup.setAttribute('stroke', currentPenColor);
                    currentArrowGroup.setAttribute('fill', 'none');
                    currentArrowGroup.setAttribute('stroke-linecap', 'round');
                    currentArrowGroup.setAttribute('stroke-linejoin', 'round');
                    applyStrokeStyle(currentArrowGroup);

                    arrowShaftPath = document.createElementNS(SVG_NS, 'path');
                    arrowShaftPath.setAttribute('class', 'arrow-shaft');
                    arrowShaftPath.setAttribute('stroke-width', strokeWidths['pen'].toFixed(2));
                    currentArrowGroup.appendChild(arrowShaftPath);

                    arrowHeadPath = document.createElementNS(SVG_NS, 'path');
                    arrowHeadPath.setAttribute('class', 'arrow-head');
                    arrowHeadPath.setAttribute('fill', currentPenColor);
                    arrowHeadPath.setAttribute('stroke', 'none');
                    currentArrowGroup.appendChild(arrowHeadPath);

                    currentSlideGroup.querySelector('.pen-strokes').appendChild(currentArrowGroup);
                } else {
                    if (Math.hypot(pt.x - arrowStart.x, pt.y - arrowStart.y) === 0) return;
                    setArrowGeometry(arrowStart, pt, arrowShaftPath, arrowHeadPath, strokeWidths['pen']);
                    arrowStart = null;
                    currentArrowGroup = null;
                    arrowShaftPath = null;
                    arrowHeadPath = null;
                    setTool(previousTool || 'pen');
                    syncPaletteSelection();
                    requestSave();
                }
            } else if (currentTool === 'arc') {
                clearSelection();
                const pt = { x: pData.x, y: pData.y };

                if (!arcCenter) {
                    arcCenter = pt;
                    arcCenterMarker = document.createElementNS(SVG_NS, "circle");
                    arcCenterMarker.setAttribute("cx", pt.x);
                    arcCenterMarker.setAttribute("cy", pt.y);
                    arcCenterMarker.setAttribute("r", strokeWidths['pen'] * 2);
                    arcCenterMarker.setAttribute("fill", "none");
                    arcCenterMarker.setAttribute("stroke", currentPenColor);
                    arcCenterMarker.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                    currentSlideGroup.querySelector('.pen-strokes').appendChild(arcCenterMarker);

                    currentArcGroup = document.createElementNS(SVG_NS, "g");
                    currentArcGroup.setAttribute("class", "stroke-group");
                    currentArcGroup.style.pointerEvents = "all";
                    currentArcGroup.setAttribute("stroke", currentPenColor);
                    currentArcGroup.setAttribute("fill", "none");
                    currentArcGroup.setAttribute("stroke-linecap", "round");
                    currentArcGroup.setAttribute("stroke-linejoin", "round");
                    applyStrokeStyle(currentArcGroup);

                    fillArcPath = document.createElementNS(SVG_NS, "path");
                    fillArcPath.setAttribute("class", "arc-sector-fill");
                    fillArcPath.setAttribute("stroke", "none");
                    currentArcGroup.appendChild(fillArcPath);

                    fixedArcPath = document.createElementNS(SVG_NS, "path");
                    fixedArcPath.setAttribute("class", "fixed-arc");
                    fixedArcPath.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                    currentArcGroup.appendChild(fixedArcPath);

                    tempArcPath = document.createElementNS(SVG_NS, "circle");
                    tempArcPath.setAttribute("cx", pt.x);
                    tempArcPath.setAttribute("cy", pt.y);
                    tempArcPath.setAttribute("r", "0");
                    tempArcPath.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                    tempArcPath.setAttribute("opacity", "0.2");
                    tempArcPath.style.display = 'none';
                    currentArcGroup.appendChild(tempArcPath);
                    currentSlideGroup.querySelector('.pen-strokes').appendChild(currentArcGroup);
                } else if (!arcStart) {
                    if (Math.hypot(pt.x - arcCenter.x, pt.y - arcCenter.y) === 0) return;
                    arcStart = pt;
                    if (tempArcPath) tempArcPath.remove();
                    tempArcPath = document.createElementNS(SVG_NS, "path");
                    tempArcPath.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                    tempArcPath.style.display = 'none';
                    currentArcGroup.appendChild(tempArcPath);

                    arcStartMarker = document.createElementNS(SVG_NS, "circle");
                    arcStartMarker.setAttribute("cx", pt.x);
                    arcStartMarker.setAttribute("cy", pt.y);
                    arcStartMarker.setAttribute("r", strokeWidths['pen'] * 2);
                    arcStartMarker.setAttribute("fill", "none");
                    arcStartMarker.setAttribute("stroke", currentPenColor);
                    arcStartMarker.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                    currentSlideGroup.querySelector('.pen-strokes').appendChild(arcStartMarker);
                } else {
                    const path = getArcPath(arcCenter, arcStart, pt);
                    if (!path) return;
                    fixedArcPath.setAttribute("d", path);
                    fillArcPath.setAttribute("d", getArcPath(arcCenter, arcStart, pt, true));
                    pendingFillGroup = fillArcPath;
                    const fillPal = document.getElementById('polygon-fill-palette');
                    if (fillPal) {
                        fillPal.style.left = Math.min(e.clientX, window.innerWidth - 240) + 'px';
                        fillPal.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
                        fillPal.style.display = 'flex';
                    }
                    if (tempArcPath) tempArcPath.remove();
                    if (arcCenterMarker) arcCenterMarker.remove();
                    if (arcStartMarker) arcStartMarker.remove();

                    arcCenter = null;
                    arcStart = null;
                    currentArcGroup = null;
                    fillArcPath = null;
                    fixedArcPath = null;
                    tempArcPath = null;
                    arcCenterMarker = null;
                    arcStartMarker = null;

                    setTool(previousTool || 'pen');
                    syncPaletteSelection();
                }
            } else if (currentTool === 'rectangle') {
                clearSelection();
                const pt = { x: pData.x, y: pData.y };

                if (!rectangleStart) {
                    rectangleStart = pt;
                    currentRectangleGroup = document.createElementNS(SVG_NS, 'g');
                    currentRectangleGroup.setAttribute('class', 'stroke-group');
                    currentRectangleGroup.style.pointerEvents = 'all';
                    currentRectangleGroup.setAttribute('stroke', currentPenColor);
                    currentRectangleGroup.setAttribute('fill', 'none');
                    currentRectangleGroup.setAttribute('stroke-linecap', 'round');
                    currentRectangleGroup.setAttribute('stroke-linejoin', 'round');
                    applyStrokeStyle(currentRectangleGroup);

                    const fixedRectangle = document.createElementNS(SVG_NS, 'rect');
                    fixedRectangle.setAttribute('class', 'fixed-rectangle');
                    fixedRectangle.setAttribute('x', pt.x);
                    fixedRectangle.setAttribute('y', pt.y);
                    fixedRectangle.setAttribute('width', '0');
                    fixedRectangle.setAttribute('height', '0');
                    fixedRectangle.setAttribute('stroke-width', strokeWidths['pen'].toFixed(2));
                    currentRectangleGroup.appendChild(fixedRectangle);

                    tempRectangle = document.createElementNS(SVG_NS, 'rect');
                    tempRectangle.setAttribute('fill', 'none');
                    tempRectangle.setAttribute('stroke-width', strokeWidths['pen'].toFixed(2));
                    tempRectangle.style.display = 'none';
                    currentRectangleGroup.appendChild(tempRectangle);
                    currentSlideGroup.querySelector('.pen-strokes').appendChild(currentRectangleGroup);
                } else {
                    setRectangleBounds(currentRectangleGroup.querySelector('.fixed-rectangle'), rectangleStart, pt);
                    if (tempRectangle) tempRectangle.remove();

                    pendingFillGroup = currentRectangleGroup;
                    const fillPal = document.getElementById('polygon-fill-palette');
                    if (fillPal) {
                        fillPal.style.left = Math.min(e.clientX, window.innerWidth - 240) + 'px';
                        fillPal.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
                        fillPal.style.display = 'flex';
                    }

                    rectangleStart = null;
                    currentRectangleGroup = null;
                    tempRectangle = null;
                    setTool(previousTool || 'pen');
                    syncPaletteSelection();
                }
            } else if (currentTool === 'circle') {
                const now = Date.now();
                if (now - lastCircleTouchTime < 400) {
                    lastCircleTouchTime = 0;
                    setTool(previousTool || 'pen');
                    syncPaletteSelection();
                    const slider = document.getElementById('notes-stroke-width-slider');
                    const label = document.getElementById('stroke-width-value');
                    if (slider && label) {
                        slider.value = strokeWidths[currentTool];
                        label.textContent = strokeWidths[currentTool];
                    }
                    return;
                }
                lastCircleTouchTime = now;

                clearSelection();
                const pt = { x: pData.x, y: pData.y };

                if (!circleCenter) {
                    circleCenter = pt;

                    currentCircleGroup = document.createElementNS(SVG_NS, "g");
                    currentCircleGroup.setAttribute("class", "stroke-group");
                    currentCircleGroup.style.pointerEvents = "all";
                    currentCircleGroup.setAttribute("stroke", currentPenColor);
                    currentCircleGroup.setAttribute("fill", "none");
                    currentCircleGroup.setAttribute("stroke-linecap", "round");
                    currentCircleGroup.setAttribute("stroke-linejoin", "round");
                    applyStrokeStyle(currentCircleGroup);

                    const fixedCircle = document.createElementNS(SVG_NS, "circle");
                    fixedCircle.setAttribute("class", "fixed-circle");
                    fixedCircle.setAttribute("cx", pt.x);
                    fixedCircle.setAttribute("cy", pt.y);
                    fixedCircle.setAttribute("r", "0");
                    fixedCircle.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                    currentCircleGroup.appendChild(fixedCircle);

                    tempCirclePath = document.createElementNS(SVG_NS, "circle");
                    tempCirclePath.setAttribute("cx", pt.x);
                    tempCirclePath.setAttribute("cy", pt.y);
                    tempCirclePath.setAttribute("r", "0");
                    tempCirclePath.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                    tempCirclePath.setAttribute("fill", "none");
                    tempCirclePath.setAttribute("stroke", currentPenColor);
                    tempCirclePath.style.display = 'none';
                    currentCircleGroup.appendChild(tempCirclePath);

                    currentSlideGroup.querySelector('.pen-strokes').appendChild(currentCircleGroup);

                    centerCircle = document.createElementNS(SVG_NS, "circle");
                    centerCircle.setAttribute("cx", pt.x);
                    centerCircle.setAttribute("cy", pt.y);
                    centerCircle.setAttribute("r", strokeWidths['pen'] * 2);
                    centerCircle.setAttribute("fill", "none");
                    centerCircle.setAttribute("stroke", currentPenColor);
                    centerCircle.setAttribute("stroke-width", strokeWidths['pen'].toFixed(2));
                    currentSlideGroup.querySelector('.pen-strokes').appendChild(centerCircle);
                } else {
                    const r = Math.hypot(pt.x - circleCenter.x, pt.y - circleCenter.y);
                    const fixedCircle = currentCircleGroup.querySelector('.fixed-circle');
                    fixedCircle.setAttribute("r", r);

                    pendingFillGroup = currentCircleGroup;
                    const fillPal = document.getElementById('polygon-fill-palette');
                    if (fillPal) {
                        fillPal.style.left = Math.min(e.clientX, window.innerWidth - 240) + 'px';
                        fillPal.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
                        fillPal.style.display = 'flex';
                    }

                    if (centerCircle) centerCircle.remove();
                    if (tempCirclePath) tempCirclePath.remove();
                    circleCenter = null;
                    currentCircleGroup = null;
                    tempCirclePath = null;
                    centerCircle = null;

                    setTool(previousTool || 'pen');
                    syncPaletteSelection();
                }
            } else {
                clearSelection();
                isDrawing = true;

                currentPoints = [pData];
                pendingPoints = [];
                lastProcessedIndex = 0;

                currentStrokeGroup = document.createElementNS(SVG_NS, "g");
                currentStrokeGroup.setAttribute("class", "stroke-group");
                currentStrokeGroup.style.pointerEvents = "all";
                if (currentTool === 'pen') {
                    currentStrokeGroup.setAttribute("stroke", currentPenColor);
                } else {
                    currentStrokeGroup.setAttribute("stroke", currentMarkerColor);
                }
                currentStrokeGroup.setAttribute("fill", "none");
                currentStrokeGroup.setAttribute("stroke-linecap", "round");
                currentStrokeGroup.setAttribute("stroke-linejoin", "round");

                if (currentTool === 'marker') {
                    currentStrokeGroup.setAttribute("opacity", "0.6");
                    currentStrokeGroup.style.mixBlendMode = "multiply";
                }

                dynamicTailPath = document.createElementNS(SVG_NS, "path");
                currentStrokeGroup.appendChild(dynamicTailPath);

                const targetGroup = currentTool === 'marker' ?
                    currentSlideGroup.querySelector('.marker-strokes') :
                    currentSlideGroup.querySelector('.pen-strokes');
                targetGroup.appendChild(currentStrokeGroup);

                requestAnimationFrame(drawLoop);
            }
        }, { passive: false });

        document.addEventListener('pointerdown', (e) => {
            const fillPal = document.getElementById('polygon-fill-palette');
            if (fillPal && fillPal.style.display !== 'none' && !e.target.closest('#polygon-fill-palette')) {
                fillPal.style.display = 'none';
                pendingFillGroup = null;
            }

            if (e.pointerType !== 'touch') {
                return;
            }

            const menu = document.getElementById('notes-tool-menu');
            const container = document.getElementById('notes-tool-container');

            if (menu && menu.classList.contains('active')) {
                if (!menu.contains(e.target) && !container.contains(e.target)) {
                    menu.classList.remove('active');
                }
            }
        }, true);

        window.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'pen') return;

            if (currentTool === 'line' || currentTool === 'arrow' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'arc') {
                if (e.target.closest('#notes-tool-container, #notes-delete-button-container, #notes-tool-menu, #polygon-fill-palette')) {
                    if (currentTool === 'line' && tempLinePath) tempLinePath.style.display = 'none';
                    if (currentTool === 'arrow' && currentArrowGroup) currentArrowGroup.style.display = 'none';
                    if (currentTool === 'rectangle' && tempRectangle) tempRectangle.style.display = 'none';
                    if (currentTool === 'circle' && tempCirclePath) tempCirclePath.style.display = 'none';
                    if (currentTool === 'arc' && tempArcPath) tempArcPath.style.display = 'none';
                    return;
                }
                if (currentTool === 'line') {
                    if (linePoints.length > 0 && tempLinePath) {
                        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
                        const lastEvent = events[events.length - 1];
                        let pt = getPointInSvg(lastEvent.clientX, lastEvent.clientY);

                        for (let i = 0; i < linePoints.length; i++) {
                            const lp = linePoints[i];
                            if (Math.hypot(pt.x - lp.x, pt.y - lp.y) < 15) {
                                lineCircles[i].setAttribute("fill", currentPenColor);
                                pt = { x: lp.x, y: lp.y };
                            } else {
                                lineCircles[i].setAttribute("fill", "none");
                            }
                        }

                        tempLinePath.style.display = 'block';
                        const lastPt = linePoints[linePoints.length - 1];
                        tempLinePath.setAttribute('d', `M ${lastPt.x} ${lastPt.y} L ${pt.x} ${pt.y}`);
                    }
                } else if (currentTool === 'arrow') {
                    if (arrowStart && currentArrowGroup) {
                        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
                        const lastEvent = events[events.length - 1] || e;
                        const point = getPointInSvg(lastEvent.clientX, lastEvent.clientY);
                        currentArrowGroup.style.display = 'block';
                        setArrowGeometry(arrowStart, point, arrowShaftPath, arrowHeadPath, strokeWidths['pen']);
                    }
                } else if (currentTool === 'circle') {
                    if (circleCenter && tempCirclePath) {
                        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
                        const lastEvent = events[events.length - 1];
                        let pt = getPointInSvg(lastEvent.clientX, lastEvent.clientY);
                        const r = Math.hypot(pt.x - circleCenter.x, pt.y - circleCenter.y);

                        tempCirclePath.style.display = 'block';
                        tempCirclePath.setAttribute('r', r);
                    }
                } else if (currentTool === 'rectangle') {
                    if (rectangleStart && tempRectangle) {
                        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
                        const lastEvent = events[events.length - 1] || e;
                        const point = getPointInSvg(lastEvent.clientX, lastEvent.clientY);
                        setRectangleBounds(tempRectangle, rectangleStart, point);
                        tempRectangle.style.display = 'block';
                    }
                } else if (currentTool === 'arc') {
                    if (arcCenter && tempArcPath) {
                        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
                        const lastEvent = events[events.length - 1];
                        const pt = getPointInSvg(lastEvent.clientX, lastEvent.clientY);
                        if (!arcStart) {
                            const radius = Math.hypot(pt.x - arcCenter.x, pt.y - arcCenter.y);
                            tempArcPath.setAttribute('r', radius);
                            tempArcPath.style.display = 'block';
                        } else {
                            const path = getArcPath(arcCenter, arcStart, pt);
                            if (path) {
                                tempArcPath.setAttribute('d', path);
                                tempArcPath.style.display = 'block';
                            } else {
                                tempArcPath.style.display = 'none';
                            }
                        }
                    }
                }
                if (!penSession || (e.buttons === 0 && !e.altKey)) return;
            } else {
                if (!penSession || (e.buttons === 0 && !e.altKey)) return;
                if (e.target.closest('#notes-tool-container, #notes-delete-button-container, #notes-tool-menu, #polygon-fill-palette')) return;
            }

            absorbPenEvents(e);
            const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
            const lastEvent = events[events.length - 1];

            if (isDraggingSelection) {
                const pt = getPointInSvg(lastEvent.clientX, lastEvent.clientY);
                const dx = pt.x - dragStartPos.x;
                const dy = pt.y - dragStartPos.y;
                moveSelectedElements(dx, dy);
                return;
            }

            if (isErasing) {
                events.forEach(ev => eraseAt(ev.clientX, ev.clientY));
                if (!eraserCursor) {
                    eraserCursor = document.createElementNS(SVG_NS, "circle");
                    eraserCursor.setAttribute("r", "2");
                    eraserCursor.setAttribute("stroke", "#333");
                    eraserCursor.setAttribute("stroke-width", "1");
                    eraserCursor.setAttribute("fill", "none");
                    eraserCursor.style.pointerEvents = "none";
                    if (svg) svg.appendChild(eraserCursor);
                }
                if (eraserCursor && svg) {
                    const pt = getPointInSvg(lastEvent.clientX, lastEvent.clientY);
                    eraserCursor.setAttribute("cx", pt.x);
                    eraserCursor.setAttribute("cy", pt.y);
                }
                return;
            }

            if (isLassoing) {
                const pt = getPointInSvg(lastEvent.clientX, lastEvent.clientY);
                lassoPoints.push(pt);
                const lassoEl = document.getElementById('current-lasso');
                if (lassoEl) {
                    const d = lassoEl.getAttribute("d");
                    lassoEl.setAttribute("d", d + ` L ${pt.x} ${pt.y}`);
                }
                return;
            }

            if (isDrawing) {
                events.forEach(ev => {
                    pendingPoints.push(getPointData(ev));
                });
            }
        }, { passive: false });

        window.addEventListener('pointerup', (e) => {
            if (e.pointerType !== 'pen') return;
            endPenSession(e);

            if (e.target.closest('#notes-tool-container, #notes-delete-button-container, #notes-tool-menu, #polygon-fill-palette')) return;
            absorbPenEvents(e);

            if (svg && svg.hasPointerCapture(e.pointerId)) {
                svg.releasePointerCapture(e.pointerId);
            }

            if (isDraggingSelection) {
                const pt = getPointInSvg(e.clientX, e.clientY);
                moveSelectedElements(pt.x - dragStartPos.x, pt.y - dragStartPos.y);
                isDraggingSelection = false;
                clearSelection();
                setTool('pen');
                requestSave();
                return;
            }

            if (isLassoing) {
                isLassoing = false;
                const lassoEl = document.getElementById('current-lasso');
                if (lassoEl) {
                    lassoEl.setAttribute("d", lassoEl.getAttribute("d") + " Z");
                }
                performLassoSelection();
                if (selectedElements.length > 0) {
                    isMovingSelection = true;
                    if (svg) svg.style.pointerEvents = "all";
                    document.getElementById('notes-delete-button-container').style.display = 'flex';
                } else {
                    if (lassoEl) lassoEl.remove();
                }
                return;
            }

            endStroke();
        });

        window.addEventListener('pointercancel', (e) => {
            if (e.pointerType !== 'pen') return;
            endPenSession(e);
            endStroke();
        });

        window.addEventListener('pointerleave', (e) => {
            if (e.pointerType === 'pen' && currentTool === 'line' && tempLinePath) {
                tempLinePath.style.display = 'none';
            }
            if (e.pointerType === 'pen' && currentTool === 'arrow' && currentArrowGroup) {
                currentArrowGroup.style.display = 'none';
            }
            if (e.pointerType === 'pen' && currentTool === 'rectangle' && tempRectangle) {
                tempRectangle.style.display = 'none';
            }
            if (e.pointerType === 'pen' && currentTool === 'circle' && tempCirclePath) {
                tempCirclePath.style.display = 'none';
            }
            if (e.pointerType === 'pen' && currentTool === 'arc' && tempArcPath) {
                tempArcPath.style.display = 'none';
            }
        });

        function endStroke() {
            if (eraserCursor) {
                eraserCursor.remove();
                eraserCursor = null;
            }
            if (isDrawing) {
                isDrawing = false;

                if (currentStrokeGroup && currentPoints.length === 1 && pendingPoints.length === 0) {
                    const p = currentPoints[0];
                    const width = calculateWidth(p.p, p.tx, p.ty);
                    currentStrokeGroup.remove();

                    const dot = document.createElementNS(SVG_NS, "circle");
                    dot.setAttribute("class", "dot");
                    dot.setAttribute("cx", p.x);
                    dot.setAttribute("cy", p.y);
                    dot.setAttribute("r", width);
                    if (currentTool === 'pen') {
                        dot.setAttribute("fill", currentPenColor);
                    } else {
                        dot.setAttribute("fill", currentMarkerColor);
                    }
                    dot.style.pointerEvents = "all";

                    if (currentTool === 'marker') {
                        dot.setAttribute("fill-opacity", "0.6");
                        dot.style.mixBlendMode = "multiply";
                        currentSlideGroup.querySelector('.marker-strokes').appendChild(dot);
                    } else {
                        currentSlideGroup.querySelector('.pen-strokes').appendChild(dot);
                    }
                }
                else if (currentStrokeGroup) {
                    if (pendingPoints.length > 0) {
                        for (let i = 0; i < pendingPoints.length; i++) currentPoints.push(pendingPoints[i]);
                    }

                    const smoothedPoints = applyLightSmoothingToPoints(currentPoints, 2);
                    currentStrokeGroup.innerHTML = '';

                    let drawIdx = 0;
                    while (drawIdx < smoothedPoints.length - 2) {
                        const p0 = smoothedPoints[drawIdx];
                        const p1 = smoothedPoints[drawIdx + 1];
                        const p2 = smoothedPoints[drawIdx + 2];
                        const { segment } = createSegment(p0, p1, p2);
                        currentStrokeGroup.appendChild(segment);
                        drawIdx++;
                    }

                    const n = smoothedPoints.length;
                    if (n > 1) {
                        const pEnd = smoothedPoints[n - 1];
                        const pPrev = smoothedPoints[Math.max(0, n - 2)];
                        const { segment } = createSegment(pPrev, pPrev, pEnd, true);
                        currentStrokeGroup.appendChild(segment);
                    }

                    currentStrokeGroup.setAttribute('shape-rendering', 'geometricPrecision');
                }

                pendingPoints = [];
                currentPoints = [];
                lastProcessedIndex = 0;
                currentStrokeGroup = null;
                dynamicTailPath = null;

                requestSave();
            }
            isErasing = false;
        }
    }

    function createTooltipUI() {
        toolTipElement = document.createElement('div');
        toolTipElement.id = 'notes-tool-tip';
        document.body.appendChild(toolTipElement);
    }

    function saveSlidesAsHTML() {
        const saveButton = document.querySelector('.notes-ui-button[title="Save Slides with Notes"]');
        const originalButtonContent = saveButton.innerHTML;
        saveButton.innerHTML = '...';
        saveButton.disabled = true;

        try {
            if (currentTool === 'line' || currentTool === 'arrow' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'arc') setTool('pen');
            clearSelection();
            requestSave();

            const menu = document.getElementById('notes-tool-menu');
            if (menu) menu.classList.remove('active');

            const docClone = document.documentElement.cloneNode(true);

            const cleanElements = docClone.querySelectorAll('.reveal, .reveal .slides, .reveal .slides section');
            cleanElements.forEach(el => {
                el.style.removeProperty('transform');
                el.style.removeProperty('width');
                el.style.removeProperty('height');
                el.style.removeProperty('zoom');
                el.style.removeProperty('display');
                el.style.removeProperty('top');
                el.style.removeProperty('left');
                el.classList.remove('present', 'past', 'future');
            });

            const generatedBackgrounds = docClone.querySelectorAll('.backgrounds, .slide-backgrounds, .speaker-notes, .pause-overlay, .progress, .controls, .slide-logo, .slide-footer');
            generatedBackgrounds.forEach(el => el.remove());

            const allDrawingsInClone = docClone.querySelectorAll('.slide-notes-canvas');
            allDrawingsInClone.forEach(g => g.style.display = 'block');

            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            const metaTag = document.querySelector('meta[name="lecture-title"]');
            const filePrefix = metaTag ? metaTag.getAttribute('content') : 'presentation';
            const finalFilename = `${filePrefix}_${dateStr}.html`;

            const html = '<!DOCTYPE html>\n' + docClone.outerHTML;
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);

        } catch (error) {
            console.error("Failed to save:", error);
            alert("Error saving presentation.");
        } finally {
            if (saveButton) {
                saveButton.innerHTML = originalButtonContent;
                saveButton.disabled = false;
            }
        }
    }

    function createNotesUI() {
        const container = document.createElement('div');
        container.id = 'notes-tool-container';

        const menu = document.createElement('div');
        menu.id = 'notes-tool-menu';

        const colorSection = document.createElement('div');
        colorSection.className = 'notes-tool-section';
        colorSection.innerHTML = `<h4>Color</h4>`;
        const colorPalette = document.createElement('div');
        colorPalette.id = 'notes-color-palette';
        const colors = [
            '#ffffff', '#F7D0D1', '#E0E9F4', '#E6EEDD', '#FBE3D6', '#B1D7EC', '#DFD4EA',
            '#F2F2F2', '#E67375', '#B1C8E3', '#B5CD98', '#F2AA84', '#7ABBDE', '#A07FC0',
            '#BFBFBF', '#C72426', '#6290C6', '#83AC54', '#E97132', '#2D87B9', '#6a4590',
            '#7F7F7F', '#951B1D', '#325B8B', '#62813F', '#C04F15', '#16445C', '#563973',
            '#000000', '#631213', '#213D5C', '#42562A', '#80350E', '#091B25', '#3D2852'
        ];
        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            if (color === currentPenColor) swatch.classList.add('selected');
            colorPalette.appendChild(swatch);
        });

        colorSection.appendChild(colorPalette);

        menu.addEventListener('click', (e) => {
            const swatch = e.target.closest('.color-swatch');
            if (swatch) {
                if (currentTool === 'pen' || currentTool === 'line' || currentTool === 'arrow' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'arc') {
                    currentPenColor = swatch.dataset.color;
                } else {
                    currentMarkerColor = swatch.dataset.color;
                }

                if (currentTool !== 'pen' && currentTool !== 'marker' && currentTool !== 'line' && currentTool !== 'arrow' && currentTool !== 'rectangle' && currentTool !== 'circle') {
                    setTool('pen');
                    menu.classList.add('active');
                } else {
                    setTool(currentTool);
                }
                clearSelection();

                const palette = swatch.closest('#notes-color-palette');
                if (palette) {
                    const currentSelected = palette.querySelector('.selected');
                    if (currentSelected) currentSelected.classList.remove('selected');
                }
                swatch.classList.add('selected');
                menu.classList.remove('active');
            }
        });

        const widthSection = document.createElement('div');
        widthSection.className = 'notes-tool-section';
        widthSection.innerHTML = `<h4>Width (<span id="stroke-width-value">${strokeWidths[currentTool]}</span>px)</h4>`;

        const widthSlider = document.createElement('input');
        widthSlider.type = 'range';
        widthSlider.id = 'notes-stroke-width-slider';
        widthSlider.min = 1;
        widthSlider.max = 10;
        widthSlider.step = 0.5;
        widthSlider.value = strokeWidths[currentTool];

        widthSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (currentTool === 'line' || currentTool === 'pen' || currentTool === 'arrow' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'arc') {
                strokeWidths['pen'] = val;
                strokeWidths['line'] = val;
                strokeWidths['arrow'] = val;
                strokeWidths['rectangle'] = val;
                strokeWidths['circle'] = val;
                strokeWidths['arc'] = val;
            } else {
                strokeWidths[currentTool] = val;
            }
            document.getElementById('stroke-width-value').textContent = val;
        });
        widthSection.appendChild(widthSlider);

        const lineStyleSection = document.createElement('div');
        lineStyleSection.id = 'notes-line-style-section';
        lineStyleSection.className = 'notes-tool-section';
        lineStyleSection.style.display = 'none';
        lineStyleSection.innerHTML = '<h4>Line style</h4>';

        const lineStyleButtons = document.createElement('div');
        lineStyleButtons.id = 'notes-line-style-buttons';
        lineStyleButtons.setAttribute('role', 'group');
        lineStyleButtons.setAttribute('aria-label', 'Line style');
        [
            ['solid', 'Solid line'],
            ['dashed', 'Dashed line'],
            ['dash-dot', 'Dash-dot line']
        ].forEach(([value, label]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'line-style-button';
            button.title = label;
            button.setAttribute('aria-label', label);
            button.setAttribute('aria-pressed', String(value === currentStrokeStyle));
            if (value === currentStrokeStyle) button.classList.add('active');

            const icon = document.createElementNS(SVG_NS, 'svg');
            icon.setAttribute('viewBox', '0 0 32 12');
            icon.setAttribute('aria-hidden', 'true');
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', '2');
            line.setAttribute('y1', '6');
            line.setAttribute('x2', '30');
            line.setAttribute('y2', '6');
            line.setAttribute('stroke', 'currentColor');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-linecap', 'round');
            const dashArray = STROKE_STYLE_DASHARRAYS[value];
            if (dashArray) line.setAttribute('stroke-dasharray', dashArray);
            icon.appendChild(line);
            button.appendChild(icon);

            button.addEventListener('click', () => {
                currentStrokeStyle = value;
                if (currentLineGroup) applyStrokeStyle(currentLineGroup);
                if (currentArrowGroup) applyStrokeStyle(currentArrowGroup);
                if (currentRectangleGroup) applyStrokeStyle(currentRectangleGroup);
                if (currentCircleGroup) applyStrokeStyle(currentCircleGroup);
                lineStyleButtons.querySelectorAll('.line-style-button').forEach(styleButton => {
                    const isActive = styleButton === button;
                    styleButton.classList.toggle('active', isActive);
                    styleButton.setAttribute('aria-pressed', String(isActive));
                });
                requestSave();
            });
            lineStyleButtons.appendChild(button);
        });
        lineStyleSection.appendChild(lineStyleButtons);

        menu.appendChild(colorSection);
        menu.appendChild(widthSection);
        menu.appendChild(lineStyleSection);
        document.body.appendChild(menu);

        const fillPalette = document.createElement('div');
        fillPalette.id = 'polygon-fill-palette';
        fillPalette.style.cssText = 'position: fixed; z-index: 10000; display: none; background: white; border: 1px solid #ccc; padding: 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 220px; flex-wrap: wrap; gap: 6px;';

        const fillTitle = document.createElement('h4');
        fillTitle.textContent = 'Fill Color';
        fillTitle.style.width = '100%';
        fillPalette.appendChild(fillTitle);

        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.style.width = '24px';
            swatch.style.height = '24px';
            swatch.style.cursor = 'pointer';
            swatch.style.borderRadius = '50%';
            swatch.style.border = '1px solid #ddd';
            fillPalette.appendChild(swatch);
        });

        fillPalette.addEventListener('click', (e) => {
            const swatch = e.target.closest('.color-swatch');
            if (swatch && pendingFillGroup) {
                pendingFillGroup.setAttribute('fill', swatch.dataset.color);
                pendingFillGroup.setAttribute('fill-opacity', '0.6');
                fillPalette.style.display = 'none';
                pendingFillGroup = null;
                requestSave();
            }
        });
        document.body.appendChild(fillPalette);

        const createToolBtn = (id, icon, title) => {
            const btn = document.createElement('div');
            btn.className = 'notes-ui-button notes-tool-select-btn';
            if (currentTool === id) btn.classList.add('active');
            btn.dataset.tool = id;
            btn.title = title;
            btn.innerHTML = icon;
            btn.onclick = () => {
                hideTooltipIcon();
                if (id !== 'lasso') clearSelection();

                if (currentTool === id) {
                    if (id === 'pen' || id === 'marker') {
                        menu.classList.toggle('active');
                    } else if (id === 'line' || id === 'arrow' || id === 'rectangle' || id === 'circle' || id === 'arc') {
                        menu.classList.toggle('active');
                    }
                } else {
                    menu.classList.remove('active');
                    if (currentTool !== 'line' && currentTool !== 'arrow' && currentTool !== 'rectangle' && currentTool !== 'circle' && currentTool !== 'arc') previousTool = currentTool;
                    setTool(id);
                }

                if (id === 'pen' || id === 'marker' || id === 'line' || id === 'arrow' || id === 'rectangle' || id === 'circle' || id === 'arc') {
                    syncPaletteSelection();
                }

                const slider = document.getElementById('notes-stroke-width-slider');
                const label = document.getElementById('stroke-width-value');
                if (slider && label && (id === 'pen' || id === 'marker' || id === 'line' || id === 'arrow' || id === 'rectangle' || id === 'circle' || id === 'arc')) {
                    slider.value = strokeWidths[id === 'line' || id === 'arrow' || id === 'rectangle' || id === 'circle' || id === 'arc' ? 'pen' : id];
                    label.textContent = strokeWidths[id === 'line' || id === 'arrow' || id === 'rectangle' || id === 'circle' || id === 'arc' ? 'pen' : id];
                }
            };
            return btn;
        };

        container.appendChild(createToolBtn('pen', PEN_ICON_SVG, 'Pen'));
        container.appendChild(createToolBtn('marker', MARKER_ICON_SVG, 'Marker'));
        container.appendChild(createToolBtn('eraser', ERASER_ICON_SVG, 'Eraser'));
        container.appendChild(createToolBtn('lasso', LASSO_ICON_SVG, 'Lasso Select'));
        container.appendChild(createToolBtn('line', LINE_ICON_SVG, 'Straight Line'));
        container.appendChild(createToolBtn('arrow', ARROW_ICON_SVG, 'Arrow'));
        container.appendChild(createToolBtn('rectangle', RECTANGLE_ICON_SVG, 'Rectangle'));
        container.appendChild(createToolBtn('circle', CIRCLE_ICON_SVG, 'Circle'));
        container.appendChild(createToolBtn('arc', ARC_ICON_SVG, 'Arc'));

        const undoButton = document.createElement('button');
        undoButton.type = 'button';
        undoButton.id = 'notes-undo-button';
        undoButton.className = 'notes-ui-button';
        undoButton.title = 'Nothing to undo';
        undoButton.setAttribute('aria-label', undoButton.title);
        undoButton.innerHTML = UNDO_ICON;
        undoButton.disabled = true;
        undoButton.addEventListener('click', undoLastAction);
        container.appendChild(undoButton);

        const imageFileInput = document.createElement('input');
        imageFileInput.type = 'file';
        imageFileInput.accept = 'image/*';
        imageFileInput.setAttribute('aria-label', 'Choose image from storage');
        imageFileInput.style.display = 'none';
        imageFileInput.addEventListener('change', () => {
            const file = imageFileInput.files && imageFileInput.files[0];
            if (file) insertClipboardImageFile(file);
            imageFileInput.value = '';
        });
        document.body.appendChild(imageFileInput);

        const addImageButton = document.createElement('button');
        addImageButton.type = 'button';
        addImageButton.id = 'notes-add-image-button';
        addImageButton.className = 'notes-ui-button';
        addImageButton.title = 'Add image from storage';
        addImageButton.setAttribute('aria-label', addImageButton.title);
        addImageButton.innerHTML = IMAGE_ICON_SVG;
        addImageButton.addEventListener('click', () => imageFileInput.click());
        container.appendChild(addImageButton);

        const saveButton = document.createElement('div');
        saveButton.className = 'notes-ui-button';
        saveButton.title = 'Save Slides with Notes';
        saveButton.innerHTML = SAVE_ICON;
        saveButton.onclick = saveSlidesAsHTML;
        container.appendChild(saveButton);

        document.body.appendChild(container);

        const deleteBtnContainer = document.createElement('div');
        deleteBtnContainer.id = 'notes-delete-button-container';
        const deleteBtn = document.createElement('div');
        deleteBtn.id = 'notes-delete-button';
        deleteBtn.title = 'Delete Selection';
        deleteBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
        deleteBtn.onclick = () => {
            selectedElements.forEach(el => el.remove());
            if (selectedImageGroup) selectedImageGroup.remove();
            const lassoEl = document.getElementById('current-lasso');
            if (lassoEl) lassoEl.remove();
            clearSelection();
            setTool('pen');
            requestSave();
        };
        deleteBtnContainer.appendChild(deleteBtn);
        document.body.appendChild(deleteBtnContainer);

        swallowUIEvents(menu);
        swallowUIEvents(container);
        swallowUIEvents(deleteBtnContainer);
        swallowUIEvents(fillPalette);
    }
};