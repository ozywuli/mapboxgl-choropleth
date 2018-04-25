export default {
    isIOS: function() {
        return !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
    },
    isAndroid: function() {

    }
}