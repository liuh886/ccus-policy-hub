    // 0. 导航栏品牌首页跳转支持 (适配 GitHub Pages 子路径与根域名)
    const brandLink = document.getElementById('nav-brand-link');
    if (brandLink) {
      const isGhPages = window.location.pathname.startsWith('/ccus-policy-hub');
      brandLink.href = isGhPages ? '/ccus-policy-hub/' : '/';
    }

    // 1. 顶部阅读进度条
    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / docHeight) * 100;
      document.getElementById('progress-bar').style.width = scrolled + '%';
    });

    // 2. 主题切换
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const target = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', target);
      localStorage.setItem('theme', target);
    });
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // 3. 构建大纲导航 (TOC) - 保留章节序号
    const content = document.getElementById('report-content');
    const headings = content.querySelectorAll('h1, h2, h3');
    const tocContainer = document.getElementById('toc-container');
    const mobileTocContainer = document.getElementById('mobile-toc-container');
    const ul = document.createElement('ul');
    const mobileUl = document.createElement('ul');

    let hasAppendixDivider = false;
    let hasRefDivider = false;

    headings.forEach((h, idx) => {
      if (!h.id) h.id = 'heading-' + idx;
      
      // 提取标题文字（包含序号，例如 "1 CCUS 规模化..." 或 "附录 A ..."）
      let text = h.textContent.trim();
      const tag = h.tagName.toLowerCase();

      // 在大纲中识别附录开始，插入分割标签
      if (text.includes('附录') && !hasAppendixDivider) {
        hasAppendixDivider = true;
        const divLi = document.createElement('li');
        divLi.className = 'toc-section-divider';
        divLi.textContent = '附录 · 延伸资料';
        ul.appendChild(divLi);

        const mDivLi = document.createElement('li');
        mDivLi.className = 'toc-section-divider';
        mDivLi.textContent = '附录 · 延伸资料';
        mobileUl.appendChild(mDivLi);
      }

      // 在参考文献前插入分割标签
      if (text.includes('参考文献') && !hasRefDivider) {
        hasRefDivider = true;
        const divLi = document.createElement('li');
        divLi.className = 'toc-section-divider';
        divLi.style.borderColor = 'var(--brand-blue)';
        divLi.style.color = 'var(--brand-blue)';
        divLi.textContent = '文献与依据';
        ul.appendChild(divLi);

        const mDivLi = document.createElement('li');
        mDivLi.className = 'toc-section-divider';
        mDivLi.style.borderColor = 'var(--brand-blue)';
        mDivLi.style.color = 'var(--brand-blue)';
        mDivLi.textContent = '文献与依据';
        mobileUl.appendChild(mDivLi);
      }

      // Desktop
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = text;
      a.classList.add('toc-' + tag);
      li.appendChild(a);
      ul.appendChild(li);

      // Mobile
      const mLi = document.createElement('li');
      const mA = document.createElement('a');
      mA.href = '#' + h.id;
      mA.textContent = text;
      mA.classList.add('toc-' + tag);
      mA.addEventListener('click', () => {
        document.getElementById('mobile-drawer').style.display = 'none';
      });
      mLi.appendChild(mA);
      mobileUl.appendChild(mLi);
    });
    tocContainer.appendChild(ul);
    mobileTocContainer.appendChild(mobileUl);

    // 4. 滚动时自动高亮目录项
    const tocLinks = tocContainer.querySelectorAll('a');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          tocLinks.forEach(link => {
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, { rootMargin: '0px 0px -70% 0px' });
    headings.forEach(h => observer.observe(h));

    // 5. 移动端抽屉开关
    const drawer = document.getElementById('mobile-drawer');
    document.getElementById('open-drawer').addEventListener('click', () => {
      drawer.style.display = 'block';
    });
    document.getElementById('close-drawer').addEventListener('click', () => {
      drawer.style.display = 'none';
    });
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) drawer.style.display = 'none';
    });

    // 6. 即时文献卡片气泡 (Citation Popover) 与平滑高亮跳转
    const popover = document.getElementById('citation-popover');
    let popoverTimeout;

    document.querySelectorAll('.cite-ref').forEach(ref => {
      ref.addEventListener('mouseenter', (e) => {
        clearTimeout(popoverTimeout);
        const citeKey = ref.getAttribute('data-cite');
        const refTarget = document.getElementById('ref-' + citeKey);
        if (!refTarget) return;

        const index = ref.getAttribute('data-index');
        const bodyContent = refTarget.querySelector('.ref-body').innerHTML;

        popover.innerHTML = `<span class="popover-index">[${index}]</span> ${bodyContent}`;
        popover.style.display = 'block';

        const rect = ref.getBoundingClientRect();
        const top = rect.bottom + window.scrollY + 8;
        const left = Math.min(Math.max(16, rect.left + window.scrollX - 40), window.innerWidth - 440);
        
        popover.style.top = top + 'px';
        popover.style.left = left + 'px';
      });

      ref.addEventListener('mouseleave', () => {
        popoverTimeout = setTimeout(() => {
          popover.style.display = 'none';
        }, 200);
      });

      // 点击跳转时触发目标文献闪烁高亮
      ref.addEventListener('click', (e) => {
        const citeKey = ref.getAttribute('data-cite');
        const refTarget = document.getElementById('ref-' + citeKey);
        if (refTarget) {
          refTarget.classList.remove('highlight-flash');
          void refTarget.offsetWidth; // 触发 reflow
          refTarget.classList.add('highlight-flash');
        }
      });
    });

    popover.addEventListener('mouseenter', () => {
      clearTimeout(popoverTimeout);
    });
    popover.addEventListener('mouseleave', () => {
      popover.style.display = 'none';
    });

    // 7. 图片全屏放大 (Lightbox)
    const modal = document.getElementById('lightbox-modal');
    const modalImg = document.getElementById('lightbox-img');
    function closeModal() {
      modal.classList.remove('active');
      setTimeout(() => { modal.style.display = 'none'; }, 180);
    }
    function openModal(src) {
      modalImg.src = src;
      modal.style.display = 'flex';
      requestAnimationFrame(() => {
        modal.classList.add('active');
      });
    }
    document.querySelectorAll('.article-content img').forEach(img => {
      img.addEventListener('click', () => {
        openModal(img.src);
      });
    });
    modal.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        closeModal();
      }
    });

    // 8. 复制 BibTeX
    document.getElementById('copy-bibtex-btn').addEventListener('click', () => {
      const code = document.querySelector('.citation-code code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-bibtex-btn');
        btn.textContent = '✅ 已成功复制到剪贴板！';
        setTimeout(() => { btn.textContent = '📋 复制 BibTeX'; }, 2000);
      });
    });

    // 9. 返回顶部悬浮按钮平滑滚动与显隐监听
    const backToTopBtn = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 9.1 TOC 大纲折叠/展开联动与快捷键系统
    const btnToggleToc = document.getElementById('btn-toggle-toc');
    const btnToggleTocText = document.getElementById('btn-toggle-toc-text');
    const btnCollapseTocIcon = document.getElementById('btn-collapse-toc-icon');
    const btnFloatExpandToc = document.getElementById('btn-float-expand-toc');

    function setTocCollapsed(collapsed) {
      if (collapsed) {
        document.body.classList.add('toc-collapsed');
        if (btnToggleTocText) btnToggleTocText.textContent = '展开大纲';
        if (btnFloatExpandToc) btnFloatExpandToc.style.display = 'flex';
        localStorage.setItem('ccus_report_toc_collapsed', '1');
      } else {
        document.body.classList.remove('toc-collapsed');
        if (btnToggleTocText) btnToggleTocText.textContent = '折叠大纲';
        if (btnFloatExpandToc) btnFloatExpandToc.style.display = 'none';
        localStorage.setItem('ccus_report_toc_collapsed', '0');
      }
      if (typeof updateTableScrollState === 'function') {
        setTimeout(updateTableScrollState, 300);
      }
    }

    if (localStorage.getItem('ccus_report_toc_collapsed') === '1') {
      setTocCollapsed(true);
    }

    if (btnToggleToc) {
      btnToggleToc.addEventListener('click', () => {
        setTocCollapsed(!document.body.classList.contains('toc-collapsed'));
      });
    }
    if (btnCollapseTocIcon) {
      btnCollapseTocIcon.addEventListener('click', () => {
        setTocCollapsed(true);
      });
    }
    if (btnFloatExpandToc) {
      btnFloatExpandToc.addEventListener('click', () => {
        setTocCollapsed(false);
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === '[' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        setTocCollapsed(!document.body.classList.contains('toc-collapsed'));
      }
    });

    // 9.2 表 2-1 对标表横向滚动箭头联动与状态提示
    const benchmarkTableWrapper = document.getElementById('benchmark-table-wrapper');
    const btnScrollTableLeft = document.getElementById('btn-scroll-table-left');
    const btnScrollTableRight = document.getElementById('btn-scroll-table-right');
    const scrollHintPill = document.getElementById('table-scroll-hint-pill');

    function updateTableScrollState() {
      if (!benchmarkTableWrapper) return;
      const maxScroll = benchmarkTableWrapper.scrollWidth - benchmarkTableWrapper.clientWidth;
      if (maxScroll <= 5) {
        if (scrollHintPill) scrollHintPill.textContent = '✅ 全量 7 法域已完整展示';
        if (btnScrollTableLeft) {
          btnScrollTableLeft.disabled = true;
          btnScrollTableLeft.style.opacity = '0.35';
        }
        if (btnScrollTableRight) {
          btnScrollTableRight.disabled = true;
          btnScrollTableRight.style.opacity = '0.35';
        }
      } else {
        const atStart = benchmarkTableWrapper.scrollLeft <= 2;
        const atEnd = benchmarkTableWrapper.scrollLeft >= maxScroll - 2;
        if (btnScrollTableLeft) {
          btnScrollTableLeft.disabled = atStart;
          btnScrollTableLeft.style.opacity = atStart ? '0.35' : '1';
        }
        if (btnScrollTableRight) {
          btnScrollTableRight.disabled = atEnd;
          btnScrollTableRight.style.opacity = atEnd ? '0.35' : '1';
        }
        const pct = Math.round((benchmarkTableWrapper.scrollLeft / maxScroll) * 100);
        if (scrollHintPill) {
          if (pct === 0) scrollHintPill.textContent = '↔️ 左右滑动 / 点击箭头';
          else if (pct >= 98) scrollHintPill.textContent = '已滑动至最右侧（中国 CN）';
          else scrollHintPill.textContent = '已滑动 ' + pct + '%';
        }
      }
    }

    if (benchmarkTableWrapper && btnScrollTableLeft && btnScrollTableRight) {
      btnScrollTableLeft.addEventListener('click', () => {
        benchmarkTableWrapper.scrollBy({ left: -240, behavior: 'smooth' });
      });
      btnScrollTableRight.addEventListener('click', () => {
        benchmarkTableWrapper.scrollBy({ left: 240, behavior: 'smooth' });
      });
      benchmarkTableWrapper.addEventListener('scroll', updateTableScrollState, { passive: true });
      window.addEventListener('resize', updateTableScrollState);
      setTimeout(updateTableScrollState, 150);
    }

    // 10. 选中文本添加批注与侧边抽屉系统 (Text Selection Annotation & Comments Drawer)
    const STORAGE_KEY = 'ccus_report_comments_{{SLUG}}';
    const selectionToolbar = document.getElementById('text-selection-toolbar');
    const commentModal = document.getElementById('comment-input-modal');
    const modalQuotedText = document.getElementById('modal-quoted-text');
    const commentTextarea = document.getElementById('comment-textarea');
    const commentsDrawer = document.getElementById('comments-drawer');
    const commentsDrawerBackdrop = document.getElementById('comments-drawer-backdrop');
    const commentsListContainer = document.getElementById('comments-list-container');
    const navCommentBadge = document.getElementById('nav-comment-badge');
    const drawerCommentsCount = document.getElementById('drawer-comments-count');
    const commentToast = document.getElementById('comment-toast');

    let currentSelectionRange = null;
    let currentSelectedText = '';

    function showToast(msg) {
      if (!commentToast) return;
      commentToast.textContent = msg;
      commentToast.classList.add('show');
      setTimeout(() => { commentToast.classList.remove('show'); }, 2500);
    }

    function getStoredComments() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch (e) {
        return [];
      }
    }

    function saveStoredComments(comments) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
      updateCommentBadges(comments.length);
      renderCommentsList(comments);
    }

    function updateCommentBadges(count) {
      if (drawerCommentsCount) drawerCommentsCount.textContent = count;
      if (navCommentBadge) {
        navCommentBadge.textContent = count;
        navCommentBadge.style.display = count > 0 ? 'inline-block' : 'none';
      }
    }

    // 监听划词选择事件
    document.addEventListener('selectionchange', () => {
      if (commentModal.style.display === 'flex') return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        selectionToolbar.style.display = 'none';
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 2) {
        selectionToolbar.style.display = 'none';
        return;
      }

      const range = sel.getRangeAt(0);
      const contentEl = document.getElementById('report-content');
      if (!contentEl || !contentEl.contains(range.commonAncestorContainer)) {
        selectionToolbar.style.display = 'none';
        return;
      }

      currentSelectionRange = range.cloneRange();
      currentSelectedText = text;

      const rect = range.getBoundingClientRect();
      const top = rect.top + window.scrollY - 44;
      const left = Math.max(16, rect.left + window.scrollX + (rect.width / 2));

      selectionToolbar.style.top = top + 'px';
      selectionToolbar.style.left = left + 'px';
      selectionToolbar.style.display = 'flex';
    });

    // 点击浮动按钮唤起添加批注弹窗
    document.getElementById('btn-add-comment').addEventListener('mousedown', (e) => {
      e.preventDefault(); // 防止失去划词焦点
    });

    document.getElementById('btn-add-comment').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!currentSelectedText) return;

      modalQuotedText.textContent = currentSelectedText.length > 160 
        ? currentSelectedText.substring(0, 160) + '...' 
        : currentSelectedText;
      commentTextarea.value = '';
      commentModal.style.display = 'flex';
      selectionToolbar.style.display = 'none';
      setTimeout(() => commentTextarea.focus(), 60);
    });

    // 关闭弹窗
    function closeCommentModal() {
      commentModal.style.display = 'none';
      currentSelectionRange = null;
      currentSelectedText = '';
      window.getSelection()?.removeAllRanges();
    }
    document.getElementById('btn-close-comment-modal').addEventListener('click', closeCommentModal);
    document.getElementById('btn-cancel-comment').addEventListener('click', closeCommentModal);

    // 快捷键 Ctrl+Enter 提交，Esc 取消
    commentTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveNewComment();
      } else if (e.key === 'Escape') {
        closeCommentModal();
      }
    });
    document.getElementById('btn-save-comment').addEventListener('click', saveNewComment);

    // 确定保存新批注
    function saveNewComment() {
      const commentBody = commentTextarea.value.trim();
      if (!commentBody) {
        commentTextarea.focus();
        return;
      }

      const id = 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      // 计算所在就近章节标题
      let sectionTitle = '正文分析';
      if (currentSelectionRange) {
        let node = currentSelectionRange.startContainer;
        while (node && node !== document.body) {
          let prev = node.previousElementSibling;
          while (prev) {
            if (/^H[1-3]$/i.test(prev.tagName)) {
              sectionTitle = prev.textContent.trim();
              break;
            }
            prev = prev.previousElementSibling;
          }
          if (sectionTitle !== '正文分析') break;
          node = node.parentElement;
        }
      }

      // 实时包裹高亮 mark。
      // 跨段落选区不能交给 surroundContents（会抛 InvalidStateError），统一用
      // wrapRangeWithMarks 逐文本节点包裹；失败时再按引文文本兜底定位一次。
      let segments = 0;
      if (currentSelectionRange) {
        segments = wrapRangeWithMarks(
          currentSelectionRange,
          id,
          commentBody,
          'mark-' + id
        );
      }
      if (!segments) {
        segments = wrapRangeWithMarks(
          findTextRange(document.getElementById('report-content'), currentSelectedText) ||
            document.createRange(),
          id,
          commentBody,
          'mark-' + id
        );
      }

      const newComment = {
        id,
        quote: currentSelectedText,
        comment: commentBody,
        createdAt: new Date().toISOString(),
        sectionTitle
      };

      const comments = getStoredComments();
      comments.push(newComment);
      saveStoredComments(comments);

      closeCommentModal();
      attachMarkListeners();
      openCommentsDrawer(id);
      // 高亮片段为 0 说明引文无法在正文中定位（例如文本已变动）。
      // 批注本身仍然保存，但必须明确告知，否则用户会看到"存了却没划线"且毫无线索。
      showToast(
        segments
          ? `✅ 批注已保存（${segments > 1 ? `跨段落 ${segments} 处已划线` : '已划线'}）`
          : '⚠️ 批注已保存，但未能在正文中定位该引文（文本可能已变动），刷新后也不会划线'
      );
    }

    // 抽屉开关交互
    function openCommentsDrawer(focusId = null) {
      commentsDrawer.classList.add('open');
      commentsDrawerBackdrop.style.display = 'block';
      if (focusId) {
        setTimeout(() => {
          const card = document.getElementById('card-' + focusId);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.remove('focused-card');
            void card.offsetWidth;
            card.classList.add('focused-card');
          }
        }, 200);
      }
    }

    function closeCommentsDrawer() {
      commentsDrawer.classList.remove('open');
      commentsDrawerBackdrop.style.display = 'none';
    }

    document.getElementById('btn-toggle-comments').addEventListener('click', () => {
      if (commentsDrawer.classList.contains('open')) {
        closeCommentsDrawer();
      } else {
        openCommentsDrawer();
      }
    });
    document.getElementById('btn-close-comments-drawer').addEventListener('click', closeCommentsDrawer);
    commentsDrawerBackdrop.addEventListener('click', closeCommentsDrawer);

    // 渲染批注清单
    function renderCommentsList(comments) {
      if (!commentsListContainer) return;
      if (comments.length === 0) {
        commentsListContainer.innerHTML = `
          <div class="empty-comments">
            <div class="empty-icon">📝</div>
            <p style="font-weight: 600; font-size: 1rem;">暂无批注</p>
            <p class="empty-tip">在正文中选中文字即可添加批注，支持本地保存与导出。</p>
          </div>
        `;
        return;
      }

      commentsListContainer.innerHTML = comments.map((c, idx) => {
        const timeStr = new Date(c.createdAt).toLocaleString('zh-CN', {
          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        const sectionBadge = c.sectionTitle ? `<span class="comment-section-badge" title="${c.sectionTitle}">${c.sectionTitle}</span>` : '';
        const quoteEscaped = c.quote.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const commentEscaped = c.comment.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return `
          <div class="comment-card" id="card-${c.id}">
            <div class="comment-card-top">
              <div class="comment-meta-group">
                <strong style="color: var(--brand-blue); font-family: var(--font-mono);">#${idx + 1}</strong>
                <span>${timeStr}</span>
                ${sectionBadge}
              </div>
              <button class="btn-delete-comment" data-delete-id="${c.id}" title="删除批注">🗑️</button>
            </div>
            <div class="comment-card-quote">“${quoteEscaped}”</div>
            <div class="comment-card-body">${commentEscaped}</div>
            <div class="comment-card-actions">
              <button class="btn-locate" data-locate-id="${c.id}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>定位原文</span>
              </button>
            </div>
          </div>
        `;
      }).join('');

      // 绑定卡片操作事件
      commentsListContainer.querySelectorAll('.btn-locate').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-locate-id');
          scrollToMark(id);
        });
      });

      commentsListContainer.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-delete-id');
          deleteComment(id);
        });
      });
    }

// 定位原文高亮 Mark。跨段落批注会有多个片段，按 data-comment-id 全部取出。
    function marksForComment(id) {
      return [...document.querySelectorAll(`mark[data-comment-id="${id}"]`)];
    }

    // 解构（去掉 <mark> 保留文字）
    function unwrapMark(mark) {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
    }

    // 定位原文高亮 Mark
    function scrollToMark(id) {
      const marks = marksForComment(id);
      if (!marks.length) {
        showToast('⚠️ 未能在当前页面定位到该引用片段（可能文本变动）');
        return;
      }
      marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      marks.forEach(mark => {
        mark.classList.remove('pulse-highlight');
        void mark.offsetWidth;
        mark.classList.add('pulse-highlight');
      });
    }

    // 删除单条批注
    function deleteComment(id) {
      if (!confirm('确定删除该条批注吗？')) return;
      let comments = getStoredComments();
      comments = comments.filter(c => c.id !== id);
      saveStoredComments(comments);

      // 解构正文中该批注的全部高亮片段（跨段落批注不止一个 <mark>）
      marksForComment(id).forEach(unwrapMark);
      showToast('🗑️ 批注已删除');
    }

    // 清空全部批注
    document.getElementById('btn-clear-all-comments').addEventListener('click', () => {
      const comments = getStoredComments();
      if (comments.length === 0) return;
      if (!confirm(`确定清空全部 ${comments.length} 条批注吗？`)) return;

      localStorage.removeItem(STORAGE_KEY);
      document.querySelectorAll('.comment-highlight').forEach(unwrapMark);
      updateCommentBadges(0);
      renderCommentsList([]);
      showToast('🗑️ 全部批注已清空');
    });

    // 导出结构化 Markdown 文本
    document.getElementById('btn-export-markdown').addEventListener('click', () => {
      const comments = getStoredComments();
      if (comments.length === 0) {
        showToast('⚠️ 当前暂无批注可导出');
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);

      let md = `# CCUS 报告批注备忘录\n\n`;
      md += `> **报告标题**：${document.title}\n`;
      md += `> **导出时间**：${dateStr}\n`;
      md += `> **批注总计**：${comments.length} 条\n\n`;
      md += `---\n\n`;

      comments.forEach((c, idx) => {
        const cDate = new Date(c.createdAt).toLocaleString('zh-CN', { hour12: false });
        md += `### [批注 ${String(idx + 1).padStart(2, '0')}] ${cDate}\n`;
        if (c.sectionTitle) {
          md += `- **关联章节**：${c.sectionTitle}\n`;
        }
        md += `- **引述原文**：\n`;
        md += `  > “${c.quote}”\n`;
        md += `- **审阅意见**：\n`;
        md += `  ${c.comment}\n\n`;
      });

      md += `---\n`;
      md += `*本文档由 CCUS Policy Hub 导出*\n`;

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CCUS_Report_Comments_${now.toISOString().substring(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📥 批注 Markdown 文件已生成并下载！');
    });

    // 一键复制全部批注文本到剪贴板
    document.getElementById('btn-copy-comments').addEventListener('click', () => {
      const comments = getStoredComments();
      if (comments.length === 0) {
        showToast('⚠️ 当前暂无批注可复制');
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
      let text = `【CCUS 报告批注】\n时间：${dateStr} | 共 ${comments.length} 条\n\n`;

      comments.forEach((c, idx) => {
        text += `[批注 ${idx + 1}] (${c.sectionTitle || '正文'})\n`;
        text += `原文：“${c.quote}”\n`;
        text += `意见：${c.comment}\n\n`;
      });

      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 全部批注已成功复制到剪贴板！');
      }).catch(() => {
        showToast('❌ 复制失败，请检查剪贴板权限');
      });
    });

    // 页面重载时自动恢复高亮与批注 (Rehydration)
    function rehydrateComments() {
      const comments = getStoredComments();
      updateCommentBadges(comments.length);
      renderCommentsList(comments);

      const container = document.getElementById('report-content');
      if (!container) return;

      comments.forEach(cmt => {
        highlightTextInElement(container, cmt.quote, cmt.id, cmt.comment);
      });

      attachMarkListeners();
    }

    /**
     * 批注高亮底层工具
     *
     * 历史实现有两个缺陷，导致"跨自然段划词"完全失效（批注存进了 localStorage，
     * 但正文不出现下划线）：
     *   1) 实时高亮用 Range.surroundContents()。按 DOM 规范，只要 Range **部分包含**
     *      任何非文本节点就抛 InvalidStateError —— 跨段落选区必然部分包含 <p>，
     *      于是每次都进catch 分支。
     *   2) catch 里的兜底 highlightTextInElement 只在**单个文本节点**内做
     *      indexOf 查找。跨段落的引文在 DOM 里根本不属于同一个文本节点，永远匹配不到，
     *      返回 false，页面无任何高亮也没有报错。
     * 刷新后恢复（rehydrateComments）走的是同一个函数，因此跨段落批注在重载后
     * 同样无法还原。
     *
     * 现在改为：跨文本节点定位 Range + 逐文本节点包裹 <mark>。
     * 这样跨段落、跨 <strong>/<sup> 的选区都能正确落笔，且不再产生
     * "<mark> 里套 <p>" 这种非法结构（同一批注可以有多个高亮片段，
     * 通过 data-comment-id 关联）。
     */

    // 高亮禁区：脚本/按钮/已有批注内部不允许再次包裹
    const HIGHLIGHT_SKIP_SELECTOR = 'script, style, button, .comment-highlight';

    /**
     * 逐文本节点把 Range 包进 <mark>。返回生成的片段数。
     * 先固化 range 的起止锚点再改 DOM，避免 splitText 让偏移失效。
     */
    function wrapRangeWithMarks(range, id, commentText, markIdBase) {
      if (!range || range.collapsed) return 0;
      const root =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;
      if (!root) return 0;

      const startNode = range.startContainer;
      const startOffset = range.startOffset;
      const endNode = range.endContainer;
      const endOffset = range.endOffset;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          const p = node.parentElement;
          if (!p || p.closest(HIGHLIGHT_SKIP_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const targets = [];
      let n;
      while ((n = walker.nextNode())) targets.push(n);

      let segments = 0;
      for (const t of targets) {
        let s = 0;
        let e = t.nodeValue.length;
        if (t === startNode) s = startOffset;
        if (t === endNode) e = endOffset;
        if (e <= s) continue;

        let sub;
        try {
          sub = document.createRange();
          sub.setStart(t, s);
          sub.setEnd(t, e);
        } catch (err) {
          continue;
        }
        if (sub.collapsed) continue;

        const mark = document.createElement('mark');
        mark.className = 'comment-highlight';
        mark.setAttribute('data-comment-id', id);
        mark.id = markIdBase + (segments ? '-' + segments : '');
        mark.title = '批注：' + (commentText || '');
        // 先把内容搬进游离的 mark，再插入 DOM：appendChild 作用于脱离文档的节点，
        // 不会影响 sub.range 的位置。
        mark.appendChild(sub.extractContents());
        sub.insertNode(mark);
        segments++;
      }
      return segments;
    }

    /**
     * 在容器内按引文文本定位 Range，支持跨文本节点与跨段落。
     *
     * 空白处理是这个函数的关键。Selection.toString() 在跨段落时会插入换行，
     * 而 DOM 里两个 <p> 之间根本没有空白文本节点，"上一段结尾"与"下一段开头"
     * 是直接相接的。因此这里对两侧统一做**全量去空白**再比对，
     * 同时维护"去空白后的字符 -> 源位置"映射，把命中位置还原回真实 Range。
     */
    function findTextRange(container, needle) {
      if (!container || !needle) return null;
      // 注意：本文件整体被包在模板字符串里，正则里的空白类（反斜杠 + s）
      // 必须写成双反斜杠，否则模板字面量会把它吞成字母 s，生成出 /s+/ 这种坏正则。
      const target = needle.replace(/\s+/g, '');
      if (target.length < 2) return null;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          const p = node.parentElement;
          if (!p || p.closest(HIGHLIGHT_SKIP_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const nodes = [];
      const map = [];
      let norm = '';
      let n;
      while ((n = walker.nextNode())) {
        const v = n.nodeValue;
        const nodeIdx = nodes.length;
        nodes.push(n);
        for (let i = 0; i < v.length; i++) {
          const ch = v[i];
          if (/\s/.test(ch)) continue; // 空白一律丢弃，跨段落才能对上
          norm += ch;
          map.push([nodeIdx, i]);
        }
      }
      if (!norm) return null;

      let idx = norm.indexOf(target);
      if (idx === -1) return null;
      // 多次出现时取最后一次，便于与"就地高亮"的直觉一致
      while (norm.indexOf(target, idx + 1) !== -1) {
        idx = norm.indexOf(target, idx + 1);
      }

      const startPos = map[idx];
      let endPos = map[idx + target.length - 1];
      if (!startPos || !endPos) return null;
      // 命中末位若是代理对的高代理（emoji 等），不能从中间切断
      while (
        endPos &&
        nodes[endPos[0]].nodeValue.charCodeAt(endPos[1]) >= 0xd800 &&
        nodes[endPos[0]].nodeValue.charCodeAt(endPos[1]) <= 0xdbff
      ) {
        const at = map.indexOf(endPos);
        endPos = at >= 0 ? map[at + 1] : null;
        if (!endPos) break;
      }

      try {
        const range = document.createRange();
        range.setStart(nodes[startPos[0]], startPos[1]);
        range.setEnd(
          nodes[endPos[0]],
          Math.min(endPos[1] + 1, nodes[endPos[0]].nodeValue.length)
        );
        return range.collapsed ? null : range;
      } catch (err) {
        return null;
      }
    }

    // 文本树深度遍历恢复高亮（刷新后按引文重新定位，跨段落同样有效）
    function highlightTextInElement(container, quote, id, commentText) {
      const range = findTextRange(container, quote);
      if (!range) return false;
      return wrapRangeWithMarks(range, id, commentText, 'mark-' + id) > 0;
    }

    // 为所有 Mark 绑定点击事件（打开抽屉并聚焦该批注）
    function attachMarkListeners() {
      document.querySelectorAll('.comment-highlight').forEach(mark => {
        if (mark.dataset.listenerAttached) return;
        mark.dataset.listenerAttached = 'true';

        mark.addEventListener('click', (e) => {
          e.stopPropagation();
          const cmtId = mark.getAttribute('data-comment-id');
          openCommentsDrawer(cmtId);
        });
      });
    }

    // 初始化运行批注恢复
    rehydrateComments();

    // 附录 C：关键术语与缩略语互动过滤、即时检索与展开切换
    const glossaryContainer = document.getElementById('glossary-container');
    if (glossaryContainer) {
      const tabs = glossaryContainer.querySelectorAll('.glossary-tab');
      const searchInput = document.getElementById('glossary-search');
      const searchClear = document.getElementById('glossary-search-clear');
      const rows = glossaryContainer.querySelectorAll('.glossary-row');
      const countText = document.getElementById('glossary-count-text');
      const emptyState = document.getElementById('glossary-empty');
      const emptyQuery = document.getElementById('glossary-empty-query');
      const toggleExpand = document.getElementById('glossary-toggle-expand');
      const expandText = document.getElementById('glossary-expand-text');
      const scrollWrap = document.getElementById('glossary-scroll-wrap');

      let currentFilter = 'all';

      function applyGlossaryFilter() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (searchClear) {
          searchClear.style.display = query ? 'block' : 'none';
        }

        let visibleCount = 0;

        rows.forEach((row) => {
          const rowType = row.getAttribute('data-type');
          const rowKeywords = row.getAttribute('data-keywords') || '';
          const matchesType = currentFilter === 'all' || rowType === currentFilter;
          const matchesQuery = !query || rowKeywords.includes(query);

          if (matchesType && matchesQuery) {
            row.style.display = '';
            visibleCount++;
          } else {
            row.style.display = 'none';
          }
        });

        if (countText) {
          if (query || currentFilter !== 'all') {
            countText.textContent = '当前筛选显示 ' + visibleCount + ' / ' + rows.length + ' 项术语规范';
          } else {
            countText.textContent = '显示全部 ' + rows.length + ' 项术语与缩略语规范';
          }
        }

        if (emptyState) {
          if (visibleCount === 0) {
            emptyState.style.display = 'block';
            if (emptyQuery) emptyQuery.textContent = query || '所选分类';
          } else {
            emptyState.style.display = 'none';
          }
        }
      }

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          tabs.forEach((t) => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');
          currentFilter = tab.getAttribute('data-filter') || 'all';
          applyGlossaryFilter();
        });
      });

      if (searchInput) {
        searchInput.addEventListener('input', applyGlossaryFilter);
      }

      if (searchClear) {
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          searchInput.focus();
          applyGlossaryFilter();
        });
      }

      if (toggleExpand && scrollWrap) {
        toggleExpand.addEventListener('click', () => {
          const isExpanded = scrollWrap.classList.toggle('is-expanded');
          toggleExpand.classList.toggle('is-expanded', isExpanded);
          if (expandText) {
            expandText.textContent = isExpanded ? '收起紧凑视图' : ('展开全部 (' + rows.length + ' 项)');
          }
        });
      }
    }

    // 附录 A–D 与参考文献：默认折叠，附小型展开按钮，避免页面过长
    (function initCollapsibleSections() {
      const root = document.getElementById('report-content');
      if (!root) return;

      const headings = Array.from(
        root.querySelectorAll('h1.appendix-h1, #references-container > h1')
      );
      if (!headings.length) return;

      const sections = [];

      const resolveHashTarget = (hash) => {
        if (!hash || hash.charAt(0) !== '#') return null;
        let id = hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch (e) {
          /* 保留原始 id */
        }
        return document.getElementById(id);
      };

      const expandFor = (el) => {
        if (!el) return;
        // 1) 目标位于折叠体内部（引用、图表、表格锚点等）
        if (typeof el.closest === 'function') {
          const body = el.closest('.collapsible-body.is-collapsed');
          if (body) {
            const entry = sections.find((s) => s.body === body);
            if (entry) entry.setExpanded(true);
            return;
          }
        }
        // 2) 目标本身即折叠区标题（目录大纲链接常见）
        const byHeading = sections.find((s) => s.heading === el);
        if (byHeading) {
          byHeading.setExpanded(true);
          return;
        }
        // 3) 目标位于折叠区所属容器内（如 #references-container）
        if (typeof el.closest === 'function') {
          const entry = sections.find(
            (s) => s.heading.parentNode && s.heading.parentNode.contains(el)
          );
          if (entry) entry.setExpanded(true);
        }
      };

      headings.forEach((heading, i) => {
        if (!heading.id) heading.id = 'collapsible-section-' + i;

        // 收集标题之后、下一章节（h1/section）之前的所有兄弟节点
        const nodes = [];
        let node = heading.nextElementSibling;
        while (node) {
          if (node.tagName === 'H1' || node.tagName === 'SECTION') break;
          nodes.push(node);
          node = node.nextElementSibling;
        }
        if (!nodes.length) return;

        const body = document.createElement('div');
        body.className = 'collapsible-body is-collapsed';
        body.id = heading.id + '-panel';
        nodes.forEach((n) => body.appendChild(n));
        heading.parentNode.insertBefore(body, heading.nextSibling);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'collapse-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', body.id);
        toggle.innerHTML =
          '<span class="collapse-toggle-label">展开</span>' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
        heading.appendChild(toggle);

        const entry = {
          heading,
          body,
          setExpanded(expanded) {
            body.classList.toggle('is-collapsed', !expanded);
            toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            const label = toggle.querySelector('.collapse-toggle-label');
            if (label) label.textContent = expanded ? '收起' : '展开';
          },
        };
        sections.push(entry);

        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          entry.setExpanded(body.classList.contains('is-collapsed'));
        });
      });

      // 深链接（目录/引用跳转/分享锚点）自动展开目标所在折叠区
      window.addEventListener('hashchange', () =>
        expandFor(resolveHashTarget(location.hash))
      );
      document.addEventListener(
        'click',
        (e) => {
          const anchor =
            e.target && typeof e.target.closest === 'function'
              ? e.target.closest('a[href^="#"]')
              : null;
          if (!anchor) return;
          expandFor(resolveHashTarget(anchor.getAttribute('href')));
        },
        true
      );
      if (location.hash) expandFor(resolveHashTarget(location.hash));
    })();
