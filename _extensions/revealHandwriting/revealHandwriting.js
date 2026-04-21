/*****************************************************************
** Author: Felix Boy, felixboy.mail@gmail.com
**
** A plugin for reveal.js adding a handwriting canvas.
**
** Version: 1.3.5
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
    let hideNotes = true;
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
    let selectionTransform = { x: 0, y: 0 };
    let dragStartPos = { x: 0, y: 0 };

    let currentTool = 'pen';
    let currentPenColor = "#325B8B";
    let currentMarkerColor = "#F2AA84";

    let strokeWidths = {
        'pen': 1.5,
        'marker': 15
    };

    let toolTipElement;
    let tooltipTimeout;

    const PEN_ICON_SVG = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
    const MARKER_ICON_SVG = `<svg fill="#000000" viewBox="0 0 512 512"><g><g><polygon points="57.832,391.052 0,448.885 85.151,504.67 128.3,461.521"/></g></g><g><g><path d="M497.972,113.851l-92.47-92.47c-9.06-9.061-21.107-14.051-33.921-14.051c-12.813,0-24.861,4.99-33.922,14.051 L141.153,217.886l160.314,160.313l196.507-196.505C516.676,162.989,516.676,132.554,497.972,113.851z"/></g></g><g><g><path d="M119.691,239.347L61.56,297.479l21.069,21.069l-25.993,25.993c-0.401,0.401-0.787,0.811-1.163,1.228l118.112,118.112 c0.418-0.376,0.828-0.764,1.228-1.163l25.993-25.992l21.068,21.068l58.132-58.132L119.691,239.347z"/></g></g></svg>`;
    const ERASER_ICON_SVG = `<svg fill="#000000" viewBox="0 0 512 512"><g><g><path d="M495.276,133.96L377.032,15.715c-19.605-19.608-51.34-19.609-70.946,0L40.37,281.428 c-19.557,19.56-19.557,51.386,0.001,70.946l61.153,61.153c9.475,9.476,22.074,14.693,35.473,14.693h114.188 c13.4,0,25.998-5.219,35.473-14.693l25.678-25.678v-0.001l182.941-182.942C514.837,185.347,514.837,153.52,495.276,133.96z M263.009,389.878c-3.158,3.158-7.358,4.897-11.824,4.897H136.997c-4.467,0-8.666-1.739-11.824-4.897l-61.152-61.152 c-6.521-6.521-6.521-17.129-0.001-23.65l70.948-70.948l141.895,141.895L263.009,389.878z M471.629,181.258l-32.113,32.113 L297.622,71.475l32.113-32.113c6.522-6.521,17.129-6.519,23.65,0l118.244,118.245 C478.148,164.128,478.148,174.737,471.629,181.258z"/></g></g><g><g><path d="M495.278,477.546H16.722C7.487,477.546,0,485.034,0,494.269s7.487,16.722,16.722,16.722h478.555 c9.235,0,16.722-7.487,16.722-16.722S504.513,477.546,495.278,477.546z"/></g></g></svg>`;
    const LASSO_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.00001 10C5.00001 8.75523 5.7133 7.52938 7.06628 6.57433C8.41665 5.62113 10.3346 5 12.5 5C14.6654 5 16.5834 5.62113 17.9337 6.57433C19.2867 7.52938 20 8.75523 20 10C20 11.2448 19.2867 12.4706 17.9337 13.4257C16.5834 14.3789 14.6654 15 12.5 15C11.9849 15 11.4828 14.9648 10.9982 14.898C10.934 13.1045 9.18159 12 7.50001 12C6.92753 12 6.37589 12.1176 5.88506 12.3351C5.30127 11.6111 5.00001 10.8126 5.00001 10ZM12.5 17C11.7421 17 11.0036 16.9352 10.2949 16.8124C10.2111 16.9074 10.1215 16.9971 10.027 17.0814C10.0324 17.1351 10.0364 17.1937 10.0381 17.2566C10.0459 17.5458 10.0053 17.9424 9.80913 18.3641C9.38923 19.2667 8.42683 19.9562 6.7537 20.2187C4.68005 20.544 4.14608 21.1521 4.01748 21.3745C3.95033 21.4906 3.94254 21.5823 3.94406 21.6357C3.94468 21.6576 3.94702 21.6739 3.94861 21.6827C3.96296 21.7256 3.97448 21.7699 3.98295 21.8152C4.03316 22.0804 3.97228 22.3491 3.826 22.5638C3.74444 22.6836 3.63632 22.7865 3.50609 22.8627C3.40769 22.9205 3.29851 22.962 3.1823 22.9834C3.06521 23.0053 2.94748 23.0055 2.83406 22.9863C2.687 22.9617 2.55081 22.9051 2.43293 22.8238C2.31589 22.7434 2.21506 22.6375 2.13982 22.5103C2.1012 22.4453 2.06973 22.3756 2.0465 22.3023C2.04333 22.2927 2.04 22.2823 2.03655 22.2711C2.02484 22.2331 2.01167 22.1856 1.99902 22.1296C1.97383 22.0181 1.94991 21.8695 1.94487 21.6927C1.93466 21.3347 2.00276 20.8633 2.28609 20.3733C2.85846 19.3834 4.12384 18.6068 6.4437 18.2429C6.8529 18.1787 7.15489 18.0908 7.37778 17.9981C5.70287 17.9451 4.00001 16.8095 4.00001 15C4.00001 14.4998 4.14018 14.0417 4.37329 13.6452C3.52173 12.6101 3.00001 11.3665 3.00001 10C3.00001 7.93106 4.18951 6.15691 5.91292 4.94039C7.63895 3.72202 9.97098 3 12.5 3C15.029 3 17.3611 3.72202 19.0871 4.94039C20.8105 6.15691 22 7.93106 22 10C22 12.0689 20.8105 13.8431 19.0871 15.0596C17.3611 16.278 15.029 17 12.5 17ZM6.34227 14.3786C6.60474 14.1624 7.01132 14 7.50001 14C8.5482 14 9.00001 14.6444 9.00001 15C9.00001 15.0929 8.97952 15.185 8.9364 15.2772C8.85616 15.4487 8.687 15.6381 8.41217 15.7841C8.16534 15.9153 7.85219 16 7.50001 16C6.45182 16 6.00001 15.3556 6.00001 15C6.00001 14.8092 6.09212 14.5846 6.34227 14.3786Z" fill="#000000"/></svg>`;
    const FULLSCREEN_ICON = `<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
    const SAVE_ICON = `<svg viewBox="0 0 24 24"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM15 9H5V5h10v4z"/></svg>`;
    const NOTES_TOGGLE_ICON = `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 14H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
    const SVG_NS = "http://www.w3.org/2000/svg";

    // Read meta tag to conditionally disable Notes feature UI completely
    const metaDisable = document.querySelector('meta[name="disable-notes"]');
    const isNotesDisabled = metaDisable && metaDisable.getAttribute('content') === 'true';

    let saveTimeout;
    function requestSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveToSessionStorage, 300);
    }

    function saveToSessionStorage() {
        try {
            const stored = sessionStorage.getItem('revealHandwritingData');
            const data = stored ? JSON.parse(stored) : {};

            const allCanvases = document.querySelectorAll('.slide-notes-canvas');

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
                    data[id] = slideSvg.innerHTML;
                }
            });

            data.hideNotes = hideNotes;

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
                            slideSvg.setAttribute("class", "slide-notes-canvas full-slide-svg");
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
                hideNotes = data.hideNotes;
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

    function toggleNotes(hideNotes) {
        if (isNotesDisabled) return;

        document.querySelectorAll(".full-slide-svg").forEach(el => {
            if (el.style.display === 'none' && !el.classList.contains('hide-notes')) {
                el.style.display = 'block';
            }
            el.classList.toggle("hide-notes", hideNotes);
        });
    };



    Reveal.on('ready', event => {
        loadFromSessionStorage();

        const revealContainer = document.querySelector('.reveal');
        if (revealContainer) {
            revealContainer.addEventListener('pointermove', (e) => {
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

        const existingUI = document.querySelectorAll('#notes-tool-container, #notes-delete-button-container, #notes-tool-tip, #notes-tool-menu');
        existingUI.forEach(el => el.remove());

        toggleNotes(hideNotes);

        createNotesUI();
        createTooltipUI();
        setupPenEvents();

        window.addEventListener("pointermove", (e) => {
            if (
                e.target.closest('#notes-tool-container') ||
                e.target.closest('#notes-delete-button-container') ||
                e.target.closest('#notes-tool-menu') ||
                e.target.closest('z-controls')
            ) return;
        });

        Reveal.on('slidechanged', updateActiveSlideGroup);
        updateActiveSlideGroup();

        // Exit export mode button
        const exitBtn = document.createElement('div');
        exitBtn.id = 'exit-export-mode-btn';
        exitBtn.title = "Return to Presentation Mode";
        exitBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';

        exitBtn.addEventListener('click', () => {
            const eKey = new KeyboardEvent('keydown', { key: 'e', keyCode: 69, bubbles: true });
            document.dispatchEvent(eKey);
        });

        document.body.appendChild(exitBtn);
    });

    function updateActiveSlideGroup() {
        // Prevent accidental re-assignment or bad tags while Reveal.js is reconstructing the DOM for printing
        if (document.body.classList.contains('print-pdf') || document.body.classList.contains('reveal-print')) {
            return;
        }

        clearSelection();

        const currentSlide = Reveal.getCurrentSlide();
        if (!currentSlide) return;

        let slideSvg = currentSlide.querySelector('.slide-notes-canvas');

        if (!slideSvg) {
            slideSvg = document.createElementNS(SVG_NS, "svg");
            slideSvg.setAttribute("class", "slide-notes-canvas full-slide-svg");
            slideSvg.style.position = "absolute";
            slideSvg.style.top = "0";
            slideSvg.style.left = "0";
            slideSvg.style.width = "100%";
            slideSvg.style.height = "100%";
            slideSvg.style.zIndex = "100";
            slideSvg.style.pointerEvents = "none";
            slideSvg.style.overflow = "visible";

            const indices = Reveal.getIndices(currentSlide);
            slideSvg.setAttribute('data-slide-id', `slide-${indices.h}-${indices.v}`);

            currentSlide.appendChild(slideSvg);

            let markerStrokes = document.createElementNS(SVG_NS, "g");
            markerStrokes.setAttribute("class", "marker-strokes");
            slideSvg.appendChild(markerStrokes);

            let penStrokes = document.createElementNS(SVG_NS, "g");
            penStrokes.setAttribute("class", "pen-strokes");
            slideSvg.appendChild(penStrokes);
        } else if (!slideSvg.hasAttribute('data-slide-id')) {
            // Failsafe for older initialized SVGs missing the tag
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

    async function fetchAsDataURL(url) {
        const response = await fetch(url);
        const blob = await response.blob();

        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
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
        currentTool = toolName;

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
        if (currentTool === 'pen') {
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
                if (isPointInPolygon({ x: cx, y: cy }, lassoPoints)) {
                    selectedElements.push(group);
                    group.classList.add('selected-stroke');
                    group.style.fill = "#ff0000";
                    group.style.opacity = "0.7";
                }
            } else {
                const paths = Array.from(group.querySelectorAll('path'));
                if (paths.length === 0) return;

                let isInside = true;
                for (let i = 0; i < paths.length; i += Math.max(1, Math.floor(paths.length / 5))) {
                    try {
                        const pt = paths[i].getPointAtLength(0);
                        if (!isPointInPolygon(pt, lassoPoints)) {
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

            if (selectionTransform.x !== 0 || selectionTransform.y !== 0) {
                const currentTrans = el.getAttribute('transform') || "";
                el.setAttribute('transform', `${currentTrans} translate(${selectionTransform.x}, ${selectionTransform.y})`);
            }
        });

        selectedElements = [];
        selectionTransform = { x: 0, y: 0 };
        isMovingSelection = false;
        isDraggingSelection = false;

        const lassoEl = document.getElementById('current-lasso');
        if (lassoEl) lassoEl.remove();

        const deleteBtnContainer = document.getElementById('notes-delete-button-container');
        if (deleteBtnContainer) deleteBtnContainer.style.display = 'none';
    }

    function moveSelectedElements(dx, dy) {
        selectedElements.forEach(el => {
            el.style.transform = `translate(${selectionTransform.x + dx}px, ${selectionTransform.y + dy}px)`;
        });
    }

    function swallowUIEvents(el) {
        ['pointerdown', 'pointermove', 'pointerup', 'click'].forEach(type => {
            el.addEventListener(type, ev => {
                ev.stopPropagation();
            });
        });
    }

    function setupPenEvents() {
        window.addEventListener('contextmenu', (e) => {
            if (e.pointerType === 'pen') e.preventDefault();
        });

        window.addEventListener('pointerdown', (e) => {
            // Handle detached SVG from DOM changes (like closing out of export mode)
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
                e.target.closest('z-controls')
            ) return;

            absorbPenEvents(e);
            svg.style.pointerEvents = "all";

            const pData = getPointData(e);

            if (isMovingSelection) {
                isDraggingSelection = true;
                dragStartPos = { x: pData.x, y: pData.y };
                svg.setPointerCapture(e.pointerId);
                return;
            }

            isDrawing = false;
            isErasing = false;
            isLassoing = false;

            const isEraserButton = (e.buttons & 32);
            const isLassoButton = e.altKey;

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
            // Event listener to close notes-ui when touching screen somewhere
            if (e.pointerType !== 'touch') {
                return;
            }

            const menu = document.getElementById('notes-tool-menu');
            const container = document.getElementById('notes-tool-container');

            // Only run if the menu actually exists and is currently open
            if (menu && menu.classList.contains('active')) {

                // Check if the touched element is outside the menu and outside the main toolbar
                if (!menu.contains(e.target) && !container.contains(e.target)) {
                    menu.classList.remove('active');
                }
            }
        });

        window.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'pen' || !penSession || e.buttons === 0 && !e.altKey) return;
            if (e.target.closest('#notes-tool-container, #notes-delete-button-container, #notes-tool-menu')) return;

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

            if (e.target.closest('#notes-tool-container, #notes-delete-button-container, #notes-tool-menu')) return;
            absorbPenEvents(e);

            if (svg && svg.hasPointerCapture(e.pointerId)) {
                svg.releasePointerCapture(e.pointerId);
            }

            if (isDraggingSelection) {
                const pt = getPointInSvg(e.clientX, e.clientY);
                isDraggingSelection = false;
                selectionTransform.x += (pt.x - dragStartPos.x);
                selectionTransform.y += (pt.y - dragStartPos.y);
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

        function endStroke() {
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

                    const smoothedPoints = applyLightSmoothingToPoints(currentPoints, 3);
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

    async function saveSlidesAsHTML() {
        const saveButton = document.querySelector('.notes-ui-button[title="Save Slides with Notes"]');
        const originalButtonContent = saveButton.innerHTML;
        saveButton.innerHTML = '...';
        saveButton.disabled = true;

        try {
            clearSelection();
            requestSave();

            const menu = document.getElementById('notes-tool-menu');
            if (menu) menu.classList.remove('active');

            const uiElements = [
                document.getElementById('notes-tool-container'),
                document.getElementById('notes-delete-button-container'),
                document.getElementById('notes-tool-tip'),
                document.getElementById('notes-tool-menu')
            ];
            uiElements.forEach(el => el && (el.style.display = 'none'));

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

            const generatedBackgrounds = docClone.querySelectorAll('.backgrounds, .slide-backgrounds, .speaker-notes, .pause-overlay, .progress, .controls');
            generatedBackgrounds.forEach(el => el.remove());

            const allDrawingsInClone = docClone.querySelectorAll('.slide-notes-canvas');
            allDrawingsInClone.forEach(g => g.style.display = 'block');

            const imgElements = docClone.querySelectorAll('img');
            for (const img of imgElements) {
                if (!img.src.startsWith('data:')) {
                    const abs = new URL(img.src, document.baseURI).href;
                    try {
                        img.src = await fetchAsDataURL(abs);
                    } catch (err) {
                        console.warn("Could not embed image:", abs);
                    }
                }
            }

            const linkElements = docClone.querySelectorAll('link[rel="stylesheet"]');
            for (const link of linkElements) {
                const href = new URL(link.href, document.baseURI).href;
                try {
                    const response = await fetch(href);
                    if (response.ok) {
                        const cssText = await response.text();
                        const styleElement = document.createElement('style');

                        styleElement.textContent = cssText;
                        styleElement.dataset.sourceHref = href;

                        link.parentNode.replaceChild(styleElement, link);
                    }
                } catch (e) {
                    console.warn(e);
                }
            }

            const styleElements = docClone.querySelectorAll('style');
            for (const style of styleElements) {
                let css = style.textContent;
                const baseHref = style.dataset.sourceHref || document.baseURI;

                const urlRegex = /url\(["']?([^"')]+)["']?\)/g;
                const matches = [...css.matchAll(urlRegex)];

                for (const match of matches) {
                    const originalUrl = match[1];

                    if (!originalUrl.startsWith('data:')) {
                        try {
                            const abs = new URL(originalUrl, baseHref).href;
                            const dataUrl = await fetchAsDataURL(abs);
                            css = css.replaceAll(originalUrl, dataUrl);
                        } catch (err) {
                            console.warn("Could not embed css background:", originalUrl);
                        }
                    }
                }

                style.textContent = css;
            }

            const scriptElements = docClone.querySelectorAll('script[src]');
            for (const script of scriptElements) {
                const src = new URL(script.src, document.baseURI).href;
                try {
                    const response = await fetch(src);
                    if (response.ok) {
                        const jsText = await response.text();
                        const newScript = document.createElement('script');
                        newScript.textContent = jsText;
                        if (script.type) newScript.type = script.type;
                        script.parentNode.replaceChild(newScript, script);
                    }
                } catch (e) { console.warn(e); }
            }

            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);

            const metaTag = document.querySelector('meta[name="lecture-title"]');
            const filePrefix = metaTag ? metaTag.getAttribute('content') : 'presentation';

            const finalFilename = `${filePrefix}_${dateStr}.html`;

            const html = '<!DOCTYPE html>\n' + docClone.outerHTML;
            const blob = new Blob([html], { type: 'text/html' });
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
            const uiElements = [
                document.getElementById('notes-tool-container'),
                document.getElementById('notes-delete-button-container'),
                document.getElementById('notes-tool-tip'),
                document.getElementById('notes-tool-menu')
            ];
            uiElements.forEach(el => el && (el.style.display = ''));
            updateActiveSlideGroup();
            saveButton.innerHTML = originalButtonContent;
            saveButton.disabled = false;
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
                if (currentTool === 'pen') {
                    currentPenColor = swatch.dataset.color;
                } else {
                    currentMarkerColor = swatch.dataset.color;
                }

                if (currentTool !== 'pen' && currentTool !== 'marker') {
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
        widthSlider.max = 20;
        widthSlider.step = 0.5;
        widthSlider.value = strokeWidths[currentTool];

        widthSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            strokeWidths[currentTool] = val;
            document.getElementById('stroke-width-value').textContent = val;
        });
        widthSection.appendChild(widthSlider);

        menu.appendChild(colorSection);
        menu.appendChild(widthSection);
        document.body.appendChild(menu);

        const currentToolBtn = document.createElement('div');
        currentToolBtn.id = 'notes-current-tool-btn';
        currentToolBtn.className = 'notes-ui-button';
        currentToolBtn.title = `Current tool: ${currentTool[0].toUpperCase() + currentTool.slice(1)}`;
        currentToolBtn.innerHTML = getToolIcon(currentTool);
        currentToolBtn.onclick = () => {
            hideTooltipIcon();
            const menuEl = document.getElementById('notes-tool-menu');
            menuEl.classList.toggle('active');
        };
        container.appendChild(currentToolBtn);

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
                    }
                } else {
                    menu.classList.remove('active');
                    setTool(id);
                }

                if (id === 'pen' || id === 'marker') {
                    syncPaletteSelection();
                }

                const slider = document.getElementById('notes-stroke-width-slider');
                const label = document.getElementById('stroke-width-value');
                if (slider && label && (id === 'pen' || id === 'marker')) {
                    slider.value = strokeWidths[id];
                    label.textContent = strokeWidths[id];
                }
            };
            return btn;
        };

        container.appendChild(createToolBtn('pen', PEN_ICON_SVG, 'Pen'));
        container.appendChild(createToolBtn('marker', MARKER_ICON_SVG, 'Marker'));
        container.appendChild(createToolBtn('eraser', ERASER_ICON_SVG, 'Eraser'));
        container.appendChild(createToolBtn('lasso', LASSO_ICON_SVG, 'Lasso Select'));

        const divider = document.createElement('div');
        divider.className = 'notes-toolbar-divider';
        container.appendChild(divider);

        const fullscreenButton = document.createElement('div');
        fullscreenButton.className = 'notes-ui-button';
        fullscreenButton.title = 'Toggle Fullscreen';
        fullscreenButton.innerHTML = FULLSCREEN_ICON;
        fullscreenButton.onclick = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    alert(`Error: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        };
        container.appendChild(fullscreenButton);

        if (!isNotesDisabled) {
            const togglenotesButton = document.createElement('div');
            togglenotesButton.className = 'notes-ui-button notes-ui-toggle-btn';
            togglenotesButton.title = 'Toggle Notes';
            togglenotesButton.innerHTML = NOTES_TOGGLE_ICON;
            togglenotesButton.onclick = () => {
                togglenotesButton.classList.toggle('active', hideNotes);
                hideNotes = !hideNotes;
                toggleNotes(hideNotes);
                saveToSessionStorage();
            };
            container.appendChild(togglenotesButton);
        }

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
    }
};