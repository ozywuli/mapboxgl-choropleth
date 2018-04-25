export default {
    isIOS: function() {
        return !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
    },
    isAndroid: function() {

    },
    isTouch: function() {
            return (('ontouchstart' in window)
                || (navigator.MaxTouchPoints > 0)
                || (navigator.msMaxTouchPoints > 0));
    }
}