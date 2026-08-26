/**
 * upload.js —— 文件上传
 * 按当前模式渲染上传区域，并绑定拖拽/选择事件
 */
(function (App) {
    const E = App.elements;
    const S = App.state;

    // 上传成功图标（绿色对勾圆）
    const SUCCESS_ICON = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" style="width:1em;height:1em;flex-shrink:0;"><path d="M874.119618 149.859922A510.816461 510.816461 0 0 0 511.997 0.00208a509.910462 509.910462 0 0 0-362.119618 149.857842c-199.817789 199.679789-199.817789 524.581447 0 724.260236a509.969462 509.969462 0 0 0 362.119618 149.857842A508.872463 508.872463 0 0 0 874.119618 874.120158c199.836789-199.679789 199.836789-524.581447 0-724.260236zM814.94268 378.210681L470.999043 744.132295a15.359984 15.359984 0 0 1-5.887994 4.095996c-1.751998 1.180999-2.913997 2.362998-5.276994 2.913997a34.499964 34.499964 0 0 1-13.469986 2.914997 45.547952 45.547952 0 0 1-12.897986-2.303998l-4.095996-2.363997a45.291952 45.291952 0 0 1-7.009992-4.095996l-196.902793-193.789796a34.126964 34.126964 0 0 1-10.555989-25.186973c0-9.37399 3.583996-18.74698 9.98399-25.186974a36.429962 36.429962 0 0 1 50.372947 0l169.98382 167.423824L763.389735 330.220732a37.059961 37.059961 0 0 1 50.371947-1.732998 33.647965 33.647965 0 0 1 11.165988 25.186973 35.544963 35.544963 0 0 1-9.98399 24.575974v-0.04z m0 0" fill="#52C41A"/></svg>`;

    // 渲染上传区域（预测模式单文件 / 增量模式双文件并排）
    function renderUploadZones() {
        E.uploadBody.innerHTML = '';
        E.uploadBody.className = S.currentMode === 'prediction' ? 'upload-body upload-body-prediction' : 'upload-body upload-body-increment';
        if (S.currentMode === 'prediction') {
            E.uploadBody.innerHTML = `
                <div class="upload-zone" id="predictionUploadZone">
                    <span class="upload-text">点击上传成绩文件</span>
                    <span class="upload-hint">列顺序：学号、姓名、班级、成绩</span>
                    <input type="file" id="predictionFileInput" accept=".xlsx,.xls">
                </div>
                <div class="upload-status" id="predictionUploadStatus"></div>
            `;
            const zone = document.getElementById('predictionUploadZone');
            const input = document.getElementById('predictionFileInput');
            const status = document.getElementById('predictionUploadStatus');
            bindUpload(zone, input, status, (file) => {
                App.util.parseFile(file, res => {
                    if (res.error) {
                        status.className = 'upload-status error';
                        status.textContent = '❌ ' + res.error;
                        status.style.display = 'flex';
                        zone.classList.remove('uploaded');
                    } else {
                        S.predictionFileData = res.data;
                        S.predictionFileName = file.name;
                        E.totalStudentsInput.value = res.data.rows.length;
                        status.className = 'upload-status success';
                        status.innerHTML = `${SUCCESS_ICON}<span>${file.name}<br>${res.data.rows.length} 条</span>`;
                        status.style.display = 'flex';
                        zone.classList.add('uploaded');
                        E.btnCalculate.disabled = false;
                    }
                });
            });
        } else {
            E.uploadBody.innerHTML = `
                <div style="min-width:0;">
                    <div style="font-weight:600;font-size:0.82rem;margin-bottom:4px;">参考成绩</div>
                    <div class="upload-zone" id="refUploadZone"><span class="upload-text">点击上传成绩文件</span><span class="upload-hint">学号、姓名、班级、成绩</span><input type="file" id="refFileInput" accept=".xlsx,.xls"></div>
                    <div class="upload-status" id="refUploadStatus"></div>
                </div>
                <div style="min-width:0;">
                    <div style="font-weight:600;font-size:0.82rem;margin-bottom:4px;">本次成绩</div>
                    <div class="upload-zone" id="currentUploadZone"><span class="upload-text">点击上传成绩文件</span><span class="upload-hint">学号、姓名、班级、成绩</span><input type="file" id="currentFileInput" accept=".xlsx,.xls"></div>
                    <div class="upload-status" id="currentUploadStatus"></div>
                </div>
            `;
            const refZone = document.getElementById('refUploadZone');
            const refInput = document.getElementById('refFileInput');
            const refStatus = document.getElementById('refUploadStatus');
            const curZone = document.getElementById('currentUploadZone');
            const curInput = document.getElementById('currentFileInput');
            const curStatus = document.getElementById('currentUploadStatus');
            bindUpload(refZone, refInput, refStatus, (file) => {
                App.util.parseFile(file, res => {
                    if (res.error) {
                        refStatus.className = 'upload-status error';
                        refStatus.textContent = '❌ ' + res.error;
                        refStatus.style.display = 'flex';
                        refZone.classList.remove('uploaded');
                    } else {
                        S.refFileData = res.data;
                        S.refFileName = file.name;
                        refStatus.className = 'upload-status success';
                        refStatus.innerHTML = `${SUCCESS_ICON}<span>${file.name}<br>${res.data.rows.length} 条</span>`;
                        refStatus.style.display = 'flex';
                        refZone.classList.add('uploaded');
                        App.analysis.checkIncrementReady();
                    }
                });
            });
            bindUpload(curZone, curInput, curStatus, (file) => {
                App.util.parseFile(file, res => {
                    if (res.error) {
                        curStatus.className = 'upload-status error';
                        curStatus.textContent = '❌ ' + res.error;
                        curStatus.style.display = 'flex';
                        curZone.classList.remove('uploaded');
                    } else {
                        S.currentFileData = res.data;
                        S.currentFileName = file.name;
                        curStatus.className = 'upload-status success';
                        curStatus.innerHTML = `${SUCCESS_ICON}<span>${file.name}<br>${res.data.rows.length} 条</span>`;
                        curStatus.style.display = 'flex';
                        curZone.classList.add('uploaded');
                        App.analysis.checkIncrementReady();
                    }
                });
            });
        }
        restoreUploadStatuses();
    }

    // 恢复已上传文件的状态显示（切换模式/重载时）
    function restoreUploadStatuses() {
        if (S.currentMode === 'prediction') {
            if (S.predictionFileData && S.predictionFileName) {
                const status = document.getElementById('predictionUploadStatus');
                const zone = document.getElementById('predictionUploadZone');
                status.className = 'upload-status success';
                status.innerHTML = `${SUCCESS_ICON}<span>${S.predictionFileName}<br>${S.predictionFileData.rows.length} 条</span>`;
                status.style.display = 'flex';
                zone.classList.add('uploaded');
            }
        } else {
            if (S.refFileData && S.refFileName) {
                const status = document.getElementById('refUploadStatus');
                const zone = document.getElementById('refUploadZone');
                status.className = 'upload-status success';
                status.innerHTML = `${SUCCESS_ICON}<span>${S.refFileName}<br>${S.refFileData.rows.length} 条</span>`;
                status.style.display = 'flex';
                zone.classList.add('uploaded');
            }
            if (S.currentFileData && S.currentFileName) {
                const status = document.getElementById('currentUploadStatus');
                const zone = document.getElementById('currentUploadZone');
                status.className = 'upload-status success';
                status.innerHTML = `${SUCCESS_ICON}<span>${S.currentFileName}<br>${S.currentFileData.rows.length} 条</span>`;
                status.style.display = 'flex';
                zone.classList.add('uploaded');
            }
        }
    }

    // 绑定拖拽与文件选择事件
    function bindUpload(zone, input, statusEl, cb) {
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            if (e.dataTransfer.files[0]) {
                statusEl.className = 'upload-status info';
                statusEl.textContent = '⏳ 读取中...';
                statusEl.style.display = 'flex';
                cb(e.dataTransfer.files[0]);
            }
        });
        input.addEventListener('change', () => {
            if (input.files[0]) {
                statusEl.className = 'upload-status info';
                statusEl.textContent = '⏳ 读取中...';
                statusEl.style.display = 'flex';
                cb(input.files[0]);
            }
        });
    }

    App.upload = { renderUploadZones, bindUpload };
})(window.App = window.App || {});
