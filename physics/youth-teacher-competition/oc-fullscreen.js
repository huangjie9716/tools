/**
 * 统一全屏控制（平台首页 + 各个子功能页共用）
 *
 * 规则：
 *  - 页面被平台内嵌（iframe）时，控制「外层页面」的全屏，内外状态一致
 *  - 独立打开时，控制自身
 *  - 已经在全屏 → 再点就退出（子功能里也能退出全屏）
 *
 * 用法：
 *   <script src="oc-fullscreen.js"></script>
 *   btn.addEventListener('click', OCFullscreen.toggle);
 *   OCFullscreen.onChange(function (on) {
 *       label.textContent = on ? '退出全屏' : '全屏';
 *   });
 */
window.OCFullscreen = (function () {
    'use strict';

    function hostWin() {
        try {
            if (window.parent && window.parent !== window && window.parent.document) {
                return window.parent;
            }
        } catch (err) { /* 跨域时退回自身 */ }
        return window;
    }

    function currentElement() {
        var doc = hostWin().document;
        return doc.fullscreenElement || doc.webkitFullscreenElement || null;
    }

    function isOn() {
        return !!currentElement();
    }

    function toggle() {
        var host = hostWin();
        var doc = host.document;
        var root = doc.documentElement;
        try {
            if (currentElement()) {
                if (doc.exitFullscreen) doc.exitFullscreen();
                else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
                return;
            }
            var promise = null;
            if (root.requestFullscreen) promise = root.requestFullscreen();
            else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
            if (promise && promise.catch) promise.catch(function () { /* 被浏览器拒绝时忽略 */ });
        } catch (err) { /* 忽略 */ }
    }

    var listeners = [];

    function fire() {
        var on = isOn();
        for (var i = 0; i < listeners.length; i += 1) {
            try { listeners[i](on); } catch (err) { /* 单个回调出错不影响其它 */ }
        }
    }

    function onChange(fn) {
        listeners.push(fn);
        fn(isOn());
    }

    document.addEventListener('fullscreenchange', fire);
    document.addEventListener('webkitfullscreenchange', fire);
    try {
        var host = hostWin();
        if (host !== window) {
            host.document.addEventListener('fullscreenchange', fire);
            host.document.addEventListener('webkitfullscreenchange', fire);
        }
    } catch (err) { /* 跨域时忽略 */ }

    return { isOn: isOn, toggle: toggle, onChange: onChange };
})();
