
        (function() {
            'use strict';

            // ---------- DOM 引用 ----------
            const templateInput = document.getElementById('templateInput');
            const rosterInput = document.getElementById('rosterInput');
            const templateName = document.getElementById('templateName');
            const templateStatus = document.getElementById('templateStatus');
            const rosterName = document.getElementById('rosterName');
            const rosterStatus = document.getElementById('rosterStatus');
            const countNum = document.getElementById('countNum');
            const studentCount = document.getElementById('studentCount');
            const previewList = document.getElementById('previewList');
            const previewSection = document.getElementById('previewSection');
            const generateBtn = document.getElementById('generateBtn');
            const clearBtn = document.getElementById('clearBtn');
            const progressWrap = document.getElementById('progressWrap');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            // ---------- 状态 ----------
            let templateFile = null; // 模板 File 对象
            let studentNames = []; // 学生姓名数组
            let templateArrayBuffer = null; // 模板的 ArrayBuffer

            // ---------- 辅助函数 ----------
            function updateTemplateUI() {
                if (templateFile) {
                    templateName.textContent = templateFile.name;
                    templateStatus.textContent = '已上传 ✓';
                    templateStatus.className = 'status done';
                } else {
                    templateName.textContent = '未选择文件';
                    templateStatus.textContent = '等待上传';
                    templateStatus.className = 'status';
                }
                updateGenerateBtn();
            }

            function updateRosterUI() {
                if (studentNames.length > 0) {
                    const rosterFile = rosterInput.files && rosterInput.files[0];
                    rosterName.textContent = rosterFile ? rosterFile.name : '📋 粘贴名单';
                    rosterStatus.textContent = `已读取 ${studentNames.length} 人 ✓`;
                    rosterStatus.className = 'status done';
                    countNum.textContent = studentNames.length;
                    // 预览
                    previewList.innerHTML = studentNames.map(n => `<span class="tag">${escapeHtml(n)}</span>`).join('');
                    previewSection.classList.add('active');
                } else {
                    rosterName.textContent = '未选择文件';
                    rosterStatus.textContent = '等待上传';
                    rosterStatus.className = 'status';
                    countNum.textContent = '0';
                    previewList.innerHTML = '';
                    previewSection.classList.remove('active');
                }
                updateGenerateBtn();
            }

            function updateGenerateBtn() {
                const ok = templateFile !== null && studentNames.length > 0;
                generateBtn.disabled = !ok;
            }

            function escapeHtml(str) {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            }

            // ---------- 读取模板文件 ----------
            function readTemplateFile(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e.target.error);
                    reader.readAsArrayBuffer(file);
                });
            }

            // ---------- 解析学生名单 ----------
            function parseRosterFile(file) {
                return new Promise((resolve, reject) => {
                    const ext = file.name.split('.').pop().toLowerCase();

                    if (ext === 'txt') {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const text = e.target.result;
                            const lines = text.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
                            resolve(lines);
                        };
                        reader.onerror = (e) => reject(e.target.error);
                        reader.readAsText(file, 'UTF-8');
                        return;
                    }

                    if (['xlsx', 'xls'].includes(ext)) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const data = new Uint8Array(e.target.result);
                                const workbook = XLSX.read(data, { type: 'array' });
                                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                                const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                                const names = [];
                                for (const row of json) {
                                    if (row && row.length > 0) {
                                        const val = String(row[0]).trim();
                                        if (val.length > 0) names.push(val);
                                    }
                                }
                                resolve(names);
                            } catch (err) {
                                reject(new Error('解析 Excel 失败：' + err.message));
                            }
                        };
                        reader.onerror = (e) => reject(e.target.error);
                        reader.readAsArrayBuffer(file);
                        return;
                    }

                    reject(new Error('不支持的文件格式：' + ext));
                });
            }

            // ---------- 核心：生成奖状 ----------
            async function generateCertificates() {
                if (!templateArrayBuffer || studentNames.length === 0) {
                    alert('请先上传模板和学生名单。');
                    return;
                }

                // 显示进度
                progressWrap.classList.add('active');
                progressFill.style.width = '0%';
                progressText.textContent = '正在处理...';

                try {
                    const total = studentNames.length;
                    const batchSize = 20; // 每批处理数量，避免 UI 卡死

                    // 读取模板 zip
                    const templateZip = await JSZip.loadAsync(templateArrayBuffer);
                    const templateXml = await templateZip.file('word/document.xml').async('string');

                    // 占位符：{姓名}
                    const placeholder = '{姓名}';

                    // 如果模板中没有占位符，给出警告
                    if (!templateXml.includes(placeholder)) {
                        if (!confirm('模板中未找到占位符「{姓名}」，是否继续生成？')) {
                            progressWrap.classList.remove('active');
                            return;
                        }
                    }

                    // 为每个学生生成一份完整文档的 xml
                    const allPagesXml = [];

                    for (let i = 0; i < total; i++) {
                        const name = studentNames[i];
                        // 替换占位符（注意：可能在一个文档中出现多次，全部替换）
                        let pageXml = templateXml.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                            name);
                        allPagesXml.push(pageXml);

                        // 更新进度
                        const pct = Math.round(((i + 1) / total) * 100);
                        progressFill.style.width = pct + '%';
                        progressText.textContent = `正在生成 ${i+1}/${total}  (${pct}%)`;

                        // 每批次让出主线程
                        if ((i + 1) % batchSize === 0) {
                            await sleep(0);
                        }
                    }

                    // 合并所有页面：提取每个文档的 <w:body> 内容，拼接
                    progressText.textContent = '正在合并文档...';
                    progressFill.style.width = '80%';
                    await sleep(0);

                    // 提取所有 body 内容
                    const bodyContents = [];
                    for (const xml of allPagesXml) {
                        const bodyMatch = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/i);
                        if (bodyMatch && bodyMatch[1]) {
                            bodyContents.push(bodyMatch[1]);
                        }
                    }

                    if (bodyContents.length === 0) {
                        throw new Error('无法提取文档内容，请检查模板是否有效。');
                    }

                    // 分页符：在 docx 中 <w:p><w:r><w:br w:type="page"/></w:r></w:p>
                    const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

                    // 合并内容：每个学生的内容 + 分页符（最后一个不加）
                    const mergedBody = bodyContents.map((content, idx) => {
                        if (idx === bodyContents.length - 1) return content;
                        return content + pageBreak;
                    }).join('');

                    // 提取原始文档的头部和尾部（在 <w:body> 之外的部分）
                    const firstXml = allPagesXml[0];
                    const headMatch = firstXml.match(/^([\s\S]*?)<w:body[^>]*>/i);
                    const tailMatch = firstXml.match(/<\/w:body>([\s\S]*?)$/i);

                    let finalXml = '';
                    if (headMatch && tailMatch) {
                        finalXml = headMatch[1] + '<w:body>' + mergedBody + '</w:body>' + tailMatch[1];
                    } else {
                        // 降级方案：直接构造
                        finalXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
                            '<w:body>' + mergedBody + '</w:body>' +
                            '</w:document>';
                    }

                    progressText.textContent = '正在打包...';
                    progressFill.style.width = '95%';
                    await sleep(0);

                    // 重新打包 zip
                    const newZip = new JSZip();

                    // 复制模板中的所有文件
                    const files = templateZip.files;
                    for (const [path, file] of Object.entries(files)) {
                        if (path === 'word/document.xml') {
                            // 替换内容
                            newZip.file(path, finalXml);
                        } else {
                            // 直接复制
                            const content = await file.async('arraybuffer');
                            newZip.file(path, content);
                        }
                    }

                    // 生成最终 docx
                    const blob = await newZip.generateAsync({
                        type: 'blob',
                        compression: 'DEFLATE',
                        compressionOptions: { level: 9 }
                    });

                    progressFill.style.width = '100%';
                    progressText.textContent = '✅ 生成完成！';

                    // 下载
                    const fileName = `奖状_${studentNames.length}人_${new Date().toISOString().slice(0,10)}.docx`;
                    saveAs(blob, fileName);

                    // 延迟隐藏进度
                    setTimeout(() => {
                        progressWrap.classList.remove('active');
                    }, 2000);

                } catch (err) {
                    console.error(err);
                    progressText.textContent = '❌ 生成失败：' + err.message;
                    progressFill.style.width = '0%';
                    setTimeout(() => {
                        progressWrap.classList.remove('active');
                    }, 3000);
                    alert('生成失败：' + err.message);
                }
            }

            function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }

            // ---------- 粘贴名单 ----------
            const pasteToggle = document.getElementById('pasteToggle');
            const pastePanel = document.getElementById('pastePanel');
            const pasteArea = document.getElementById('pasteArea');
            const pasteApplyBtn = document.getElementById('pasteApplyBtn');
            const pasteCancelBtn = document.getElementById('pasteCancelBtn');
            const pasteTip = document.getElementById('pasteTip');

            function setPasteTip(msg, ok) {
                pasteTip.textContent = msg || '';
                pasteTip.className = 'paste-tip' + (ok ? ' ok' : ' err');
            }

            function parseNamesFromText(text) {
                return String(text).split(/[\s,，、;；]+/).map(s => s.trim()).filter(Boolean);
            }

            pasteToggle.addEventListener('click', function() {
                const open = pastePanel.classList.toggle('open');
                if (open) { pasteArea.focus(); setPasteTip(''); }
            });

            pasteCancelBtn.addEventListener('click', function() {
                pastePanel.classList.remove('open');
                setPasteTip('');
            });

            pasteApplyBtn.addEventListener('click', function() {
                const names = parseNamesFromText(pasteArea.value);
                if (names.length === 0) {
                    setPasteTip('未解析到任何姓名，请检查输入内容（可用空格、顿号、逗号分隔）。', false);
                    return;
                }
                studentNames = names;
                rosterInput.value = ''; // 以粘贴名单为准，清除已选文件
                updateRosterUI();
                setPasteTip('已解析 ' + names.length + ' 位学生，名单已更新。', true);
                pasteArea.value = '';
                pastePanel.classList.remove('open');
            });

            // ---------- 事件绑定 ----------

            // 模板上传
            templateInput.addEventListener('change', async function(e) {
                const files = this.files;
                if (files.length === 0) {
                    templateFile = null;
                    templateArrayBuffer = null;
                    updateTemplateUI();
                    return;
                }
                const file = files[0];
                const ext = file.name.split('.').pop().toLowerCase();
                if (ext === 'doc') {
                    alert('检测到旧版 Word（.doc）模板。\n\n老式 .doc 是二进制格式，浏览器无法安全地在保留版式的同时替换姓名。\n请用 Word / WPS 打开该文件后，选择「另存为」→ 文件类型选择「Word 文档 (*.docx)」，再上传转换后的 .docx 文件。');
                    this.value = '';
                    templateFile = null;
                    templateArrayBuffer = null;
                    updateTemplateUI();
                    return;
                }
                if (ext !== 'docx') {
                    alert('请上传 .docx 格式的 Word 模板。');
                    this.value = '';
                    templateFile = null;
                    templateArrayBuffer = null;
                    updateTemplateUI();
                    return;
                }
                try {
                    templateFile = file;
                    templateArrayBuffer = await readTemplateFile(file);
                    updateTemplateUI();
                } catch (err) {
                    alert('读取模板失败：' + err.message);
                    templateFile = null;
                    templateArrayBuffer = null;
                    updateTemplateUI();
                }
            });

            // 拖拽支持 - 模板
            const templateCard = document.getElementById('templateCard');
            templateCard.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('dragover');
            });
            templateCard.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
            });
            templateCard.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    templateInput.files = files;
                    templateInput.dispatchEvent(new Event('change'));
                }
            });

            // 名单上传
            rosterInput.addEventListener('change', async function(e) {
                const files = this.files;
                if (files.length === 0) {
                    studentNames = [];
                    updateRosterUI();
                    return;
                }
                const file = files[0];
                const ext = file.name.split('.').pop().toLowerCase();
                if (!['xlsx', 'xls', 'txt'].includes(ext)) {
                    alert('请上传 .xlsx, .xls 或 .txt 格式的名单文件。');
                    this.value = '';
                    studentNames = [];
                    updateRosterUI();
                    return;
                }
                try {
                    const names = await parseRosterFile(file);
                    if (names.length === 0) {
                        alert('未读取到有效姓名，请检查文件内容。');
                        this.value = '';
                        studentNames = [];
                        updateRosterUI();
                        return;
                    }
                    studentNames = names;
                    updateRosterUI();
                    // 若粘贴面板开着则收起
                    if (pastePanel) { pastePanel.classList.remove('open'); if (pasteArea) pasteArea.value = ''; }
                } catch (err) {
                    alert('解析名单失败：' + err.message);
                    this.value = '';
                    studentNames = [];
                    updateRosterUI();
                }
            });

            // 拖拽支持 - 名单
            const rosterCard = document.getElementById('rosterCard');
            rosterCard.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('dragover');
            });
            rosterCard.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
            });
            rosterCard.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    rosterInput.files = files;
                    rosterInput.dispatchEvent(new Event('change'));
                }
            });

            // 生成按钮
            generateBtn.addEventListener('click', generateCertificates);

            // 清空按钮
            clearBtn.addEventListener('click', function() {
                if (templateFile || studentNames.length > 0) {
                    if (!confirm('确定要清空所有已上传的文件和名单吗？')) return;
                }
                templateInput.value = '';
                rosterInput.value = '';
                templateFile = null;
                templateArrayBuffer = null;
                studentNames = [];
                if (pasteArea) pasteArea.value = '';
                if (pastePanel) pastePanel.classList.remove('open');
                if (pasteTip) pasteTip.textContent = '';
                updateTemplateUI();
                updateRosterUI();
                progressWrap.classList.remove('active');
            });

            // ---------- 键盘快捷键：Enter 触发生成 ----------
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    if (!generateBtn.disabled) {
                        generateBtn.click();
                    }
                }
            });

            // ---------- 初始化 ----------
            updateTemplateUI();
            updateRosterUI();

            console.log('📄 批量生成奖状系统已加载。');
            console.log('💡 提示：模板中用「{姓名}」标记姓名位置。');

        })();
    