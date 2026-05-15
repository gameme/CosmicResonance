// Disable pinch-to-zoom and double-tap-to-zoom across all browsers.
// This is a fullscreen canvas experience with no small text — zoom only breaks it.
(function() {
    // Safari (WebKit gesture events)
    document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
    document.addEventListener('gesturechange', function(e) { e.preventDefault(); });
    document.addEventListener('gestureend', function(e) { e.preventDefault(); });

    // Mobile (multi-touch pinch)
    document.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
})();
