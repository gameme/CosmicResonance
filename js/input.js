window.App = window.App || {};

App.Input = {
    pointers: new Map(),
    _hasTouch: false,

    update(id, clientX, clientY) {
        const DPR = App.DPR;
        const p = this.pointers.get(id);
        if (p) {
            p.prevX = p.x;
            p.prevY = p.y;
            p.x = clientX * DPR;
            p.y = clientY * DPR;
            p.fresh = true;
        } else {
            const x = clientX * DPR;
            const y = clientY * DPR;
            this.pointers.set(id, { id, x, y, prevX: x, prevY: y, fresh: true });
        }
    },

    // Only zero out deltas for pointers that weren't updated this frame
    syncPrev() {
        for (const p of this.pointers.values()) {
            if (p.fresh) {
                p.fresh = false;
            } else {
                p.prevX = p.x;
                p.prevY = p.y;
            }
        }
    },

    remove(id) {
        this.pointers.delete(id);
        App.Strings.clearLocksForPointer(id);
    },

    clear() {
        this.pointers.clear();
        App.Strings.locks.clear();
    },

    bindEvents(canvas) {
        // Block iOS swipe-back/forward gesture when touching near screen edges
        const EDGE_ZONE = 35;
        document.addEventListener('touchstart', (e) => {
            const x = e.touches[0].clientX;
            if (x < EDGE_ZONE || x > window.innerWidth - EDGE_ZONE) {
                e.preventDefault();
            }
        }, { passive: false });

        // On touch devices, ignore synthetic mouse events to prevent ghost pointers
        canvas.addEventListener('touchstart', (e) => {
            this._hasTouch = true;
            for (const touch of e.changedTouches) {
                this.update(touch.identifier, touch.clientX, touch.clientY);
            }
        });
        canvas.addEventListener('touchmove', (e) => {
            for (const touch of e.changedTouches) {
                this.update(touch.identifier, touch.clientX, touch.clientY);
            }
        });
        canvas.addEventListener('touchend', (e) => {
            for (const touch of e.changedTouches) {
                this.remove(touch.identifier);
            }
        });
        canvas.addEventListener('touchcancel', () => this.clear());

        canvas.addEventListener('mousemove', (e) => {
            if (this._hasTouch) return;
            this.update('mouse', e.clientX, e.clientY);
        });
        canvas.addEventListener('mouseleave', () => {
            if (this._hasTouch) return;
            this.remove('mouse');
        });
    }
};
