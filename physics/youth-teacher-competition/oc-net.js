/**
 * 断网兜底：断网时顶部显示提示条，恢复网络时通知各页面补传
 *
 * 用法：
 *   <script src="oc-net.js?v=1"></script>
 *   OCNet.isOnline();               // 当前是否有网
 *   OCNet.onOnline(function () {    // 网络恢复时执行（用来补传暂存数据）
 *       flushQueue();
 *   });
 */
window.OCNet = (function () {
    'use strict';

    var listeners = [];
    var banner = null;

    function ensureBanner() {
        if (banner || !document.body) return banner;
        banner = document.createElement('div');
        banner.id = 'ocNetBanner';
        banner.style.cssText = [
            'position:fixed', 'left:0', 'right:0', 'top:0', 'z-index:99999', 'display:none',
            'padding:9px 14px', 'text-align:center', 'font-weight:700', 'font-size:13px',
            'color:#2a1500', 'background:linear-gradient(90deg,#ffd76e,#ffb03a)',
            'box-shadow:0 2px 12px rgba(0,0,0,.4)', 'letter-spacing:.5px'
        ].join(';');
        banner.textContent = '⚠️ 网络已断开 · 提交的内容会先存在本机，连上 Wi-Fi 后自动补传';
        document.body.appendChild(banner);
        return banner;
    }

    function isOnline() {
        return navigator.onLine !== false;
    }

    function update() {
        var bar = ensureBanner();
        var offline = !isOnline();
        if (bar) bar.style.display = offline ? 'block' : 'none';
        if (!offline) {
            for (var i = 0; i < listeners.length; i += 1) {
                try { listeners[i](); } catch (err) { /* 单个回调出错不影响其它 */ }
            }
        }
    }

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', update);
    } else {
        update();
    }

    return {
        isOnline: isOnline,
        onOnline: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
        refresh: update
    };
})();
