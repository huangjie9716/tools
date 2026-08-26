/**
 * lines.js —— 达标线管理
 * 渲染达标线列表、添加默认达标线、读取当前达标线数据
 */
(function (App) {
    const E = App.elements;

    // 渲染达标线列表
    function renderLines(lines) {
        if (!lines) lines = [{ name: '达标线1', target: 80 }];
        E.linesContainer.innerHTML = '';
        lines.forEach(l => {
            const div = document.createElement('div');
            div.className = 'line-item';
            div.innerHTML = `<input class="line-name" value="${App.util.escapeHtml(l.name)}" placeholder="名称"><input class="line-target" type="number" value="${l.target}" min="1" placeholder="上线人数"><button class="btn-remove">✕</button>`;
            div.querySelector('.btn-remove').addEventListener('click', () => {
                div.remove();
                if (E.linesContainer.children.length === 0) addDefaultLine();
            });
            E.linesContainer.appendChild(div);
        });
    }

    // 添加一条默认达标线（名称按当前条数+1 自动编号）
    function addDefaultLine() {
        const num = E.linesContainer.children.length + 1;
        const div = document.createElement('div');
        div.className = 'line-item';
        div.innerHTML = `<input class="line-name" value="达标线${num}" placeholder="名称"><input class="line-target" type="number" value="80" min="1"><button class="btn-remove">✕</button>`;
        div.querySelector('.btn-remove').addEventListener('click', () => {
            div.remove();
            if (E.linesContainer.children.length === 0) addDefaultLine();
        });
        E.linesContainer.appendChild(div);
    }

    // 读取当前达标线配置
    function getLinesData() {
        const items = E.linesContainer.querySelectorAll('.line-item');
        const lines = [];
        items.forEach((item, i) => {
            const nameEl = item.querySelector('.line-name');
            const targetEl = item.querySelector('.line-target');
            lines.push({ name: nameEl.value.trim() || `达标线${i + 1}`, target: parseInt(targetEl.value) || 80 });
        });
        return lines;
    }

    App.lines = { renderLines, addDefaultLine, getLinesData };
})(window.App = window.App || {});
