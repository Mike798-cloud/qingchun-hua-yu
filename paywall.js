/**
 * 《花语》1元自愿支持浮层
 * 结构与存储逻辑沿用《松涛粮站》的 paywall.js，按《花语》文案与视觉适配。
 */
const Paywall = {
  STORAGE_KEY: '_huayu_support',
  SESSION_KEY: '_huayu_support_session',
  COOKIE_KEY: '_huayu_support_flag',

  hasPaid() {
    try {
      const ls = localStorage.getItem(this.STORAGE_KEY);
      const ss = sessionStorage.getItem(this.SESSION_KEY);
      const cookie = this._getCookie(this.COOKIE_KEY);
      return !!(ls || ss || cookie);
    } catch {
      return false;
    }
  },

  markPaid() {
    const token = this._generateToken();
    try { localStorage.setItem(this.STORAGE_KEY, token); } catch {}
    try { sessionStorage.setItem(this.SESSION_KEY, token); } catch {}
    try { this._setCookie(this.COOKIE_KEY, token, 365); } catch {}
  },

  _generateToken() {
    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 10);
    try { return btoa(`${ts}_${rand}_abc_studio`); }
    catch { return `${ts}_${rand}_abc_studio`; }
  },

  _setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  },

  _getCookie(name) {
    try {
      const cname = name + '=';
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        const c = ca[i].trim();
        if (c.indexOf(cname) === 0) return c.substring(cname.length);
      }
    } catch {}
    return '';
  },

  show(config) {
    if (this.hasPaid()) {
      this._showThanks('你已经支持过《花语》了，谢谢你。');
      return false;
    }
    const overlay = document.getElementById('paywall-overlay');
    if (!overlay) {
      this._createOverlay(config);
    } else {
      overlay.style.display = 'flex';
      overlay.classList.remove('paywall-closing');
      overlay.classList.remove('paywall-show');
      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('paywall-show')));
      const first = overlay.querySelector('.paywall-close');
      setTimeout(() => first?.focus(), 80);
    }
    return true;
  },

  hide() {
    const overlay = document.getElementById('paywall-overlay');
    if (!overlay) return;
    overlay.classList.add('paywall-closing');
    overlay.classList.remove('paywall-show');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('paywall-closing');
    }, 320);
  },

  _onSupport() {
    this.markPaid();
    this.hide();
    this._showThanks('谢谢你。花还会落，故事也会继续往前走。');
  },

  _showThanks(message) {
    const old = document.querySelector('.paywall-toast');
    old?.remove();
    const toast = document.createElement('div');
    toast.className = 'paywall-toast';
    toast.textContent = message || '谢谢你的支持。';
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 40);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 320);
    }, 2600);
  },

  _animateIn() {
    const overlay = document.getElementById('paywall-overlay');
    if (!overlay) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add('paywall-show');
      setTimeout(() => overlay.querySelector('.paywall-close')?.focus(), 80);
    }));
  },

  _createOverlay(config) {
    const defaultConfig = {
      qrCode: 'https://mike798-cloud.github.io/songtao-grainstation/paycode.png',
      price: '1元',
      title: '支持《花语》',
      studio: 'abc studio'
    };
    const cfg = Object.assign({}, defaultConfig, config || {});
    const html = `
      <div class="paywall-overlay" id="paywall-overlay" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
        <div class="paywall-card">
          <button class="paywall-close" type="button" data-paywall-close title="关闭" aria-label="关闭支持窗口">&times;</button>
          <div class="paywall-card-inner">
            <div class="paywall-header">
              <div class="paywall-title-row">
                <span class="paywall-heart" aria-hidden="true">♡</span>
                <span class="paywall-title" id="paywall-title">${cfg.title}</span>
                <span class="paywall-heart" aria-hidden="true">♡</span>
              </div>
              <div class="paywall-subtitle">${cfg.price} 自愿打赏 · 不影响完整游玩</div>
            </div>
            <div class="paywall-body">
              <div class="paywall-qr-wrapper">
                <img src="${cfg.qrCode}" alt="abc studio 1元收款码" class="paywall-qr-img" referrerpolicy="no-referrer" />
                <div class="paywall-qr-glow"></div>
                <div class="paywall-qr-fallback">收款码需要联网加载</div>
              </div>
              <div class="paywall-qr-tip">请用 <strong>某宝</strong> 扫码，自愿支持 ${cfg.price}</div>
              <div class="paywall-message">
                <p class="paywall-msg-warm">你好，我是 abc studio 的独立开发者。</p>
                <p class="paywall-msg-body">
                  《花语》从一间旧教室、几页植物观察册开始，前后改了很多次。<br>
                  如果这些高中片段让你想起了什么，愿意支持 <strong>1元</strong>，<br>
                  我会把它当成下一部作品继续做下去的底气。
                </p>
                <p class="paywall-msg-cute">1块钱买不到一杯饮料，但能让我多画一会儿、多改一轮。</p>
                <p class="paywall-msg-warm2">不支持也完全没关系，故事和所有谜题都可以完整玩完。谢谢你愿意走到这里。</p>
              </div>
            </div>
            <div class="paywall-footer">
              <div class="paywall-hint">
                <span class="paywall-hint-icon">✿</span>
                <span>“已完成支持”会记在本机浏览器里；清除浏览器数据后可能会再次显示。</span>
              </div>
              <div class="paywall-btns">
                <button class="paywall-btn paywall-btn-support" type="button" data-paywall-support>已完成支持 ♡</button>
                <button class="paywall-btn paywall-btn-later" type="button" data-paywall-close>下次一定</button>
              </div>
            </div>
            <div class="paywall-studio">${cfg.studio}</div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const overlay = document.getElementById('paywall-overlay');
    overlay.querySelectorAll('[data-paywall-close]').forEach(btn => btn.addEventListener('click', () => this.hide()));
    overlay.querySelector('[data-paywall-support]')?.addEventListener('click', () => this._onSupport());
    const img = overlay.querySelector('.paywall-qr-img');
    img?.addEventListener('load', () => overlay.querySelector('.paywall-qr-wrapper')?.classList.add('qr-loaded'));
    img?.addEventListener('error', () => overlay.querySelector('.paywall-qr-wrapper')?.classList.add('qr-failed'));
    overlay.addEventListener('click', e => { if (e.target === overlay) this.hide(); });
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); this.hide(); return; }
      if (e.key !== 'Tab') return;
      const focusable = [...overlay.querySelectorAll('button:not([disabled])')].filter(x => x.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    this._animateIn();
  }
};
window.Paywall = Paywall;
