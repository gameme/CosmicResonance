window.App = window.App || {};

App.Footer = (function() {
    const STATE = {
        HIDDEN: 0,
        REVEALING_PRIMARY: 1,
        PRIMARY_VISIBLE: 2,
        SHIFTING: 3,
        COMPLETE: 4,
    };

    const TIMING = {
        primaryDelay: 2.0,
        primaryFadeDuration: 1.0,
        shiftDelay: 3.5,
        shiftDuration: 1.5,
        revealDuration: 1.0,
    };

    const SEGMENTS = {
        made: 'Made ',
        withText: 'with ',
        heart: '❣️',
        space: ' ',
        main: 'in California by Shruti ',
        vinod: '& Vinod',
    };

    // Glow accumulators are the only stateful pieces left. They tick from the
    // moment `settled` becomes true. The state machine itself is fully derived
    // from `elapsed` (footer-clock time, anchored at burst + photo fade), so
    // scroll-up never freezes or rewinds it — `_lastElapsed` is just a cache
    // for query APIs (isPrimaryDone, etc.) consumed by DualCore between ticks.
    let _lastElapsed = -1;
    let shrutiGlowP = 0;
    let vinodGlowP = 0;

    let widths = null;
    let heartCanvas = null;

    // Pure function: state at a given elapsed time. No mutation, no recursion.
    function deriveProgress(elapsed) {
        if (elapsed < 0) {
            return { state: STATE.HIDDEN, primaryP: 0, shiftP: 0, revealP: 0, shrutiP: 0, vinodP: 0, settled: false };
        }

        if (elapsed < TIMING.primaryDelay) {
            return { state: STATE.HIDDEN, primaryP: 0, shiftP: 0, revealP: 0, shrutiP: 0, vinodP: 0, settled: false };
        }

        let t = elapsed - TIMING.primaryDelay;
        if (t < TIMING.primaryFadeDuration) {
            const primaryP = App.easeOutQuint(t / TIMING.primaryFadeDuration);
            const shrutiP = primaryP > 0.7 ? Math.min(1, (primaryP - 0.7) / 0.3) : 0;
            return { state: STATE.REVEALING_PRIMARY, primaryP, shiftP: 0, revealP: 0, shrutiP, vinodP: 0, settled: false };
        }

        t -= TIMING.primaryFadeDuration;
        if (t < TIMING.shiftDelay) {
            return { state: STATE.PRIMARY_VISIBLE, primaryP: 1, shiftP: 0, revealP: 0, shrutiP: 1, vinodP: 0, settled: false };
        }

        t -= TIMING.shiftDelay;
        const shiftEnd = Math.max(TIMING.shiftDuration, TIMING.revealDuration);
        if (t < shiftEnd) {
            const shiftP = App.easeOutQuint(Math.min(1, t / TIMING.shiftDuration));
            const revealRaw = Math.min(1, t / TIMING.revealDuration);
            const revealP = revealRaw * revealRaw * (3 - 2 * revealRaw);
            const DESCENT = 0.4;
            const EMANATION = 1.0;
            const vinodP = Math.min(1, Math.max(0, (t - DESCENT) / EMANATION));
            return { state: STATE.SHIFTING, primaryP: 1, shiftP, revealP, shrutiP: 1, vinodP, settled: false };
        }

        return { state: STATE.COMPLETE, primaryP: 1, shiftP: 1, revealP: 1, shrutiP: 1, vinodP: 1, settled: true };
    }

    // Called every frame post-burst from the main loop. Refreshes the cache
    // for query APIs and advances the persistent glow once settled. Must run
    // before DualCore.draw, which queries isPrimaryDone()/isSecondaryStarted().
    function tick(elapsed, dt) {
        _lastElapsed = elapsed;
        if (elapsed < 0) return;
        const s = deriveProgress(elapsed);
        if (s.settled) {
            if (shrutiGlowP < 1) shrutiGlowP = Math.min(1, shrutiGlowP + dt * 0.12);
            if (vinodGlowP < 1) vinodGlowP = Math.min(1, vinodGlowP + dt * 0.12);
        }
    }

    function measureWidths(ctx, font) {
        if (widths) return widths;
        ctx.font = font;
        heartCanvas = App.Cache.text(font, SEGMENTS.heart);
        widths = {
            made: ctx.measureText(SEGMENTS.made).width,
            withText: ctx.measureText(SEGMENTS.withText).width,
            heart: heartCanvas.width,
            space: ctx.measureText(SEGMENTS.space).width,
            main: ctx.measureText(SEGMENTS.main).width,
            vinod: ctx.measureText(SEGMENTS.vinod).width,
        };
        widths.withHeart = widths.withText + widths.heart + widths.space;

        // Per-character data for emanation
        widths._prefix = ctx.measureText('in California by ').width;
        const shrutiChars = 'Shruti'.split('');
        const vinodChars = '& Vinod'.split('');
        widths._shrutiChars = shrutiChars.map(c => ({ char: c, w: ctx.measureText(c).width }));
        widths._vinodChars = vinodChars.map(c => ({ char: c, w: ctx.measureText(c).width }));
        // 'i' index within each name
        widths._shrutiIIndex = 5;
        widths._vinodIIndex = 3;

        return widths;
    }

    // Renders characters emanating from the 'i' position
    function drawEmanating(ctx, chars, iIndex, startX, y, progress, baseAlpha) {
        if (progress <= 0) return;
        // Compute char centers relative to start
        let offsets = [];
        let xOff = 0;
        for (let i = 0; i < chars.length; i++) {
            offsets.push(xOff + chars[i].w / 2);
            xOff += chars[i].w;
        }
        const iCenter = offsets[iIndex];
        const maxDist = Math.max(iCenter, xOff - iCenter);

        xOff = 0;
        for (let i = 0; i < chars.length; i++) {
            const charCenter = xOff + chars[i].w / 2;
            const dist = Math.abs(charCenter - iCenter);
            const charDelay = maxDist > 0 ? (dist / maxDist) * 0.7 : 0;
            const charAlpha = Math.min(1, Math.max(0, (progress - charDelay) / (1 - charDelay)));
            if (charAlpha > 0) {
                ctx.globalAlpha = charAlpha * baseAlpha;
                ctx.fillText(chars[i].char, startX + xOff, y);
            }
            xOff += chars[i].w;
        }
    }

    function invalidate() {
        widths = null;
        heartCanvas = null;
    }

    window.addEventListener('resize', invalidate);

    function draw(ctx, time, intensity, fontSize, cx, H) {
        if (_lastElapsed < 0) return;
        const { primaryP, shiftP, revealP, shrutiP, vinodP, settled } = deriveProgress(_lastElapsed);
        if (primaryP <= 0) return;

        const DPR = App.DPR;
        const footerSize = fontSize * App.Config.FONT_CAPTION;
        const footerY = H - fontSize * 0.6;
        const font = `200 ${footerSize}px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif`;
        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const w = measureWidths(ctx, font);

        const totalW = w.made + w.withHeart * shiftP + w.main + w.vinod * shiftP;
        let xPos = Math.round(cx - totalW / 2);

        // "Made"
        ctx.globalAlpha = primaryP * intensity * 0.6;
        ctx.fillStyle = 'rgba(255, 240, 210, 1)';
        ctx.fillText(SEGMENTS.made, xPos, footerY);
        xPos += w.made;

        // "with ❣️ "
        if (revealP > 0) {
            ctx.globalAlpha = revealP * primaryP * intensity * 0.6;
            ctx.fillStyle = 'rgba(255, 220, 200, 1)';
            ctx.fillText(SEGMENTS.withText, xPos, footerY);

            const heartX = xPos + w.withText;
            const heartRaw = settled ? Math.abs(Math.sin(time * 2.5)) * 0.3 : 0;
            const heartbeat = heartRaw * Math.min(1, shrutiGlowP * 5);
            const hScale = 1 + heartbeat * 0.4;
            const hW = w.heart * hScale;
            const hH = heartCanvas.height * hScale;
            const hCenterX = heartX + w.heart / 2;
            ctx.globalAlpha = revealP * primaryP * intensity * (0.6 + heartbeat);
            ctx.shadowColor = `rgba(255, 100, 100, ${0.6 + heartbeat})`;
            ctx.shadowBlur = (8 + heartbeat * 12) * DPR;
            ctx.drawImage(heartCanvas, hCenterX - hW / 2, footerY - hH / 2, hW, hH);
            ctx.shadowBlur = 0;
        }
        xPos += w.withHeart * shiftP;

        // "in California by " (uniform fade) + "Shruti" (emanating from 'i')
        ctx.fillStyle = 'rgba(255, 240, 210, 1)';
        ctx.globalAlpha = primaryP * intensity * 0.6;
        ctx.fillText('in California by ', xPos, footerY);
        const shrutiStartX = xPos + w._prefix;

        if (shrutiP > 0) {
            const eased = shrutiGlowP * shrutiGlowP;
            if (eased > 0) {
                ctx.shadowColor = `rgba(255, 180, 80, ${eased * intensity * 0.7})`;
                ctx.shadowBlur = footerSize * 0.8 * eased;
            }
            ctx.fillStyle = 'rgba(255, 240, 210, 1)';
            drawEmanating(ctx, w._shrutiChars, w._shrutiIIndex, shrutiStartX, footerY, shrutiP, intensity * 0.6);
            ctx.shadowBlur = 0;
        }
        xPos += w.main;

        // "& Vinod" (emanating from 'i')
        if (vinodP > 0) {
            const eased = vinodGlowP * vinodGlowP;
            if (eased > 0) {
                ctx.shadowColor = `rgba(150, 180, 255, ${eased * intensity * 0.7})`;
                ctx.shadowBlur = footerSize * 0.8 * eased;
            }
            ctx.fillStyle = 'rgba(255, 220, 200, 1)';
            drawEmanating(ctx, w._vinodChars, w._vinodIIndex, xPos, footerY, vinodP, primaryP * intensity * 0.6);
            ctx.shadowBlur = 0;
        }

        ctx.globalAlpha = 1;
    }

    function getTargets(fontSize, cx, H) {
        const footerSize = fontSize * App.Config.FONT_CAPTION;
        const footerY = H - fontSize * 0.6;
        const font = `200 ${footerSize}px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif`;
        if (!widths) {
            const tmpCtx = document.getElementById('tanpura').getContext('2d');
            measureWidths(tmpCtx, font);
        }
        const w = widths;
        if (!w._shrutiWidth) {
            const tmpCtx = document.getElementById('tanpura').getContext('2d');
            tmpCtx.font = font;
            w._prefixWidth = tmpCtx.measureText('in California by ').width;
            w._shrutiWidth = tmpCtx.measureText('Shruti').width;
            // 'i' dot positions within each name
            w._shrutiIOffset = tmpCtx.measureText('Shrut').width + tmpCtx.measureText('i').width / 2;
            w._vinodIOffset = tmpCtx.measureText('& V').width + tmpCtx.measureText('i').width / 2;
        }
        const totalW = w.made + w.withHeart + w.main + w.vinod;
        const baseX = cx - totalW / 2;

        // Flight targets (above name)
        const shrutiNameX = baseX + w.made + w.withHeart + w._prefixWidth + w._shrutiWidth / 2;
        const vinodNameX = baseX + w.made + w.withHeart + w.main + w.vinod / 2;
        const coreOffsetY = footerSize * 1.5;

        // 'i' dot targets (at the dot position of the letter 'i')
        const shrutiDotX = baseX + w.made + w.withHeart + w._prefixWidth + w._shrutiIOffset;
        const vinodDotX = baseX + w.made + w.withHeart + w.main + w._vinodIOffset;
        const dotY = footerY - footerSize * 0.35;

        return {
            shruti: { x: shrutiNameX, y: footerY - coreOffsetY },
            vinod: { x: vinodNameX, y: footerY - coreOffsetY },
            shrutiDot: { x: shrutiDotX, y: dotY },
            vinodDot: { x: vinodDotX, y: dotY },
        };
    }

    function isPrimaryStarting() {
        if (_lastElapsed < 0) return false;
        const s = deriveProgress(_lastElapsed);
        // Half-way through primary fade or later — kept compatible with the
        // previous semantic (state >= REVEALING_PRIMARY && stateTimer > half).
        return s.state >= STATE.REVEALING_PRIMARY && s.primaryP > 0.5;
    }
    function isPrimaryDone() {
        if (_lastElapsed < 0) return false;
        return deriveProgress(_lastElapsed).state >= STATE.PRIMARY_VISIBLE;
    }
    function isSecondaryStarted() {
        if (_lastElapsed < 0) return false;
        return deriveProgress(_lastElapsed).state >= STATE.SHIFTING;
    }
    function isComplete() {
        if (_lastElapsed < 0) return false;
        return deriveProgress(_lastElapsed).state >= STATE.COMPLETE;
    }

    return { tick, draw, getTargets, isPrimaryStarting, isPrimaryDone, isSecondaryStarted, isComplete, TIMING };
})();
