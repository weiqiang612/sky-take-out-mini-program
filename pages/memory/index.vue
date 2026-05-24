<template>
  <view class="page">
    <uni-nav-bar
      left-icon="back"
      leftIcon="arrowleft"
      title="用户记忆"
      statusBar="true"
      fixed="true"
      color="#ffffff"
      backgroundColor="#e95f3c"
      @clickLeft="goBack"
    ></uni-nav-bar>

    <scroll-view class="scroll-area" scroll-y>
      <view class="hero">
        <view class="hero__title-row">
          <text class="hero__title">用户记忆管理</text>
          <view class="hero__pill" @tap="handleRefreshTap">
            <text>{{ isLoading ? '加载中' : '刷新' }}</text>
          </view>
        </view>
        <text class="hero__desc">管理用户自设的饮食偏好、地址和运营备注，编辑结果以后台返回为准。</text>
        <view class="hero__stats">
          <view class="stat">
            <text class="stat__num">{{ factCards.length }}</text>
            <text class="stat__label">记忆项</text>
          </view>
          <view class="stat">
            <text class="stat__num">{{ manualCount }}</text>
            <text class="stat__label">用户自设</text>
          </view>
          <view class="stat">
            <text class="stat__num">{{ filledCount }}</text>
            <text class="stat__label">已设置</text>
          </view>
        </view>
      </view>

      <view v-if="isEmpty" class="empty-wrap">
        <empty-state textLabel="还没有保存任何用户记忆，先设置常吃菜品或默认地址吧" />
      </view>

      <view class="card-list">
        <view v-for="card in factCards" :key="card.factKey" class="fact-card">
          <view class="fact-card__head">
            <view>
              <text class="fact-card__title">{{ card.meta.label }}</text>
              <text class="fact-card__key">{{ card.factKey }}</text>
            </view>
            <view class="fact-card__actions">
              <view class="mini-action" @tap="openEditor(card.factKey)">
                <text>编辑</text>
              </view>
              <view class="mini-action mini-action--ghost" @tap="openHistory(card.factKey)">
                <text>历史</text>
              </view>
            </view>
          </view>

          <view class="fact-card__body">
            <text v-if="card.fact" class="fact-card__value">{{ getValueSummary(card.fact.factValue, card.factKey) }}</text>
            <text v-else class="fact-card__placeholder">{{ card.meta.emptyText }}</text>
          </view>

          <view class="fact-card__meta">
            <text class="meta-tag" :class="'meta-tag--' + getSourceClass(card.fact && card.fact.sourceType)">{{ getSourceLabel(card.fact && card.fact.sourceType) }}</text>
            <text class="meta-tag">置信度 {{ formatConfidence(card.fact && card.fact.confidence) }}</text>
            <text class="meta-time">{{ formatTime(card.fact && card.fact.updatedAt) }}</text>
          </view>

          <view v-if="card.fact" class="fact-card__footer">
            <view class="danger-action" @tap="deleteFact(card.factKey)">
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <uni-popup ref="editorPopup" type="bottom">
      <view class="popup-panel">
        <view class="popup-panel__header">
          <text class="popup-panel__title">{{ editorMeta.label }}</text>
          <text class="popup-panel__sub">{{ editorMeta.helper }}</text>
        </view>

        <view class="popup-panel__hint">
          <text>{{ editorMeta.tip }}</text>
        </view>

        <view class="input-box">
          <textarea
            class="editor-input"
            :value="editorText"
            :placeholder="editorMeta.placeholder"
            auto-height
            maxlength="2000"
            @input="onEditorInput"
          />
        </view>

        <view v-if="editorError" class="form-error">
          <text>{{ editorError }}</text>
        </view>

        <view class="popup-panel__actions">
          <view class="popup-btn popup-btn--ghost" @tap="closeEditor">
            <text>取消</text>
          </view>
          <view class="popup-btn popup-btn--primary" @tap="submitEditor">
            <text>{{ saving ? '保存中' : '保存' }}</text>
          </view>
        </view>
      </view>
    </uni-popup>

    <uni-popup ref="historyPopup" type="bottom">
      <view class="popup-panel popup-panel--history">
        <view class="popup-panel__header">
          <text class="popup-panel__title">{{ historyMeta.label }} 历史</text>
          <text class="popup-panel__sub">按时间倒序展示最近修改记录</text>
        </view>

        <scroll-view class="history-list" scroll-y>
          <view v-if="historyItems.length === 0" class="history-empty">
            <text>暂无历史记录</text>
          </view>

          <view v-for="(item, index) in historyItems" :key="index" class="history-item">
            <view class="history-item__meta">
              <text class="meta-tag" :class="'meta-tag--' + getSourceClass(item.sourceType)">{{ getSourceLabel(item.sourceType) }}</text>
              <text class="meta-time">{{ formatTime(item.changedAt) }}</text>
            </view>

            <view class="history-field">
              <text class="history-field__label">旧值</text>
              <text class="history-field__value">{{ formatDisplayValue(item.oldValue) }}</text>
            </view>

            <view class="history-field">
              <text class="history-field__label">新值</text>
              <text class="history-field__value">{{ formatDisplayValue(item.newValue) }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="popup-panel__actions">
          <view class="popup-btn popup-btn--primary" @tap="closeHistory">
            <text>知道了</text>
          </view>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { mapMutations } from 'vuex'
import uniPopup from '../../uni_modules/uni-popup/components/uni-popup/uni-popup.vue'
import emptyState from '../../components/empty/empty.vue'
import { deleteMemoryFact, getMemoryFacts, getMemoryHistory, upsertMemoryFact } from '../api/memory.js'

const FACT_META = {
  favorite_dishes: {
    label: '常吃菜品',
    helper: '记录用户偏好的菜品列表',
    type: 'array',
    placeholder: '每行填写一个菜品，例如：\n宫保鸡丁\n鱼香肉丝',
    tip: '支持换行或中文逗号分隔，提交后会保存为数组。',
    emptyText: '还没有设置常吃菜品',
  },
  favorite_flavors: {
    label: '偏好口味',
    helper: '记录用户喜欢的口味描述',
    type: 'string',
    placeholder: '例如：微辣、少油、口味偏清淡',
    tip: '只接受字符串，适合写成一句简短偏好描述。',
    emptyText: '还没有设置偏好口味',
  },
  dietary_restrictions: {
    label: '饮食禁忌',
    helper: '记录用户不适合或不喜欢的食材',
    type: 'array',
    placeholder: '每行填写一个禁忌，例如：\n花生\n香菜',
    tip: '支持数组，适合列出多个禁忌项。',
    emptyText: '还没有设置饮食禁忌',
  },
  default_address: {
    label: '默认地址',
    helper: '记录用户默认收货地址',
    type: 'object',
    placeholder: '例如：公司附近 / 家里楼下',
    tip: '只需填写 raw 文本，后台会保存为对象结构。',
    emptyText: '还没有设置默认地址',
  },
  operational_notes: {
    label: '服务处理摘要',
    helper: '记录与您服务处理相关的重要信息（如取消、退款等结果），用于后续会话连续跟进。',
    type: 'string',
    placeholder: '例如：已为用户取消 10086 订单；退款申请已提交，待原路退回',
    tip: '适合填写长文本说明，后台会按字符串保存。该内容会长期保存并在相关场景下辅助客服回复；支持手动补充或修正。',
    emptyText: '暂无服务处理摘要',
  },
}

const FACT_KEYS = Object.keys(FACT_META).concat(['user_profile_notes'])

FACT_META.user_profile_notes = {
  label: '个人偏好说明',
  helper: '记录您希望系统长期记住的个人信息（如饮食习惯、生活节奏、点餐偏好等）。',
  type: 'string',
  placeholder: '例如：我在减脂，晚餐偏清淡；给老人点餐时尽量软烂少辣',
  tip: '仅用于提升推荐和客服回复的贴合度，不会影响账号身份信息。',
  emptyText: '还没有设置个人偏好说明',
}

function decodeBase64Url(input) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let str = String(input || '').replace(/-/g, '+').replace(/_/g, '/')
  let output = ''
  let bc = 0
  let bs
  let buffer
  let idx = 0

  while (str.length % 4) {
    str += '='
  }

  for (; (buffer = str.charAt(idx++)); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4)
    ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6))
    : 0) {
    buffer = chars.indexOf(buffer)
  }

  try {
    return decodeURIComponent(output.split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
  } catch (e) {
    return output
  }
}

function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null
  }
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }
  try {
    return JSON.parse(decodeBase64Url(parts[1]))
  } catch (e) {
    return null
  }
}

function formatDateTime(value) {
  if (!value) {
    return '未更新'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function truncateText(text, maxLength) {
  const value = String(text == null ? '' : text)
  if (value.length <= maxLength) {
    return value
  }
  return value.slice(0, maxLength - 1) + '…'
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function normalizeDisplayValue(value) {
  if (value == null) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDisplayValue(item)).join('、')
  }

  if (isPlainObject(value)) {
    if (Object.prototype.hasOwnProperty.call(value, 'raw')) {
      return normalizeDisplayValue(value.raw)
    }
    try {
      return JSON.stringify(value, null, 2)
    } catch (e) {
      return String(value)
    }
  }

  if (typeof value === 'string') {
    return value
  }

  return String(value)
}

function normalizeHistoryValue(value) {
  const display = normalizeDisplayValue(value)
  return display ? display : '空'
}

export default {
  name: 'MemoryManagePage',
  components: {
    uniPopup,
    emptyState,
  },
  data() {
    return {
      userId: '',
      facts: [],
      isLoading: false,
      saving: false,
      editorFactKey: '',
      editorText: '',
      editorError: '',
      historyFactKey: '',
      historyItems: [],
    }
  },
  computed: {
    factCards() {
      const factMap = this.facts.reduce((acc, fact) => {
        acc[fact.factKey] = fact
        return acc
      }, {})

      return FACT_KEYS.map((factKey) => ({
        factKey,
        meta: FACT_META[factKey],
        fact: factMap[factKey] || null,
      }))
    },
    isEmpty() {
      return this.facts.length === 0
    },
    manualCount() {
      return this.facts.filter((fact) => fact && fact.sourceType === 'USER_MANUAL').length
    },
    filledCount() {
      return this.facts.length
    },
    editorMeta() {
      return FACT_META[this.editorFactKey] || {
        label: '编辑记忆',
        helper: '',
        type: 'string',
        placeholder: '',
        tip: '',
      }
    },
    historyMeta() {
      return FACT_META[this.historyFactKey] || {
        label: '记忆',
      }
    },
  },
  onLoad() {
    this.userId = this.resolveUserId()
    if (!this.userId) {
      uni.showToast({
        title: '未获取到用户信息',
        icon: 'none',
      })
      return
    }
    this.refreshFacts()
  },
  methods: {
    ...mapMutations(['setUserId']),

    handleRefreshTap() {
      this.refreshFacts(false)
    },

    resolveUserId() {
      const storedUserId = this.resolveStoredUserId()
      if (storedUserId) {
        return storedUserId
      }

      const token = this.resolveToken()
      const payload = parseJwtPayload(token)
      if (payload && payload.userId) {
        const userId = String(payload.userId)
        this.storeUserId(userId)
        return userId
      }

      return ''
    },

    resolveStoredUserId() {
      try {
        const stateUserId = this.$store && this.$store.state && this.$store.state.userId
        if (stateUserId) {
          return String(stateUserId)
        }
      } catch (e) {}

      try {
        return String(uni.getStorageSync('userId') || '')
      } catch (e) {
        return ''
      }
    },

    resolveToken() {
      try {
        const stateToken = this.$store && this.$store.state && this.$store.state.token
        if (stateToken) {
          return String(stateToken)
        }
      } catch (e) {}

      try {
        return String(uni.getStorageSync('token') || uni.getStorageSync('uni_id_token') || '')
      } catch (e) {
        return ''
      }
    },

    storeUserId(userId) {
      const value = userId == null ? '' : String(userId)
      try {
        this.setUserId(value)
      } catch (e) {}
      try {
        if (value) {
          uni.setStorageSync('userId', value)
        } else {
          uni.removeStorageSync('userId')
        }
      } catch (e) {}
    },

    refreshFacts(silent) {
      if (!this.userId) {
        return
      }

      if (!silent) {
        this.isLoading = true
      }

      getMemoryFacts(this.userId)
        .then((res) => {
          this.facts = Array.isArray(res) ? res : []
        })
        .catch((err) => {
          this.showError(err)
        })
        .then(() => {
          this.isLoading = false
        })
    },

    openEditor(factKey) {
      const meta = FACT_META[factKey]
      if (!meta) {
        return
      }

      const currentFact = this.facts.find((item) => item.factKey === factKey)
      this.editorFactKey = factKey
      this.editorText = this.serializeEditorValue(factKey, currentFact && currentFact.factValue)
      this.editorError = ''
      this.$refs.editorPopup && this.$refs.editorPopup.open('bottom')
    },

    closeEditor() {
      this.editorError = ''
      this.editorFactKey = ''
      this.editorText = ''
      this.$refs.editorPopup && this.$refs.editorPopup.close()
    },

    onEditorInput(event) {
      this.editorText = event && event.detail ? event.detail.value : ''
    },

    serializeEditorValue(factKey, value) {
      const meta = FACT_META[factKey]
      if (!meta) {
        return ''
      }

      if (meta.type === 'array') {
        if (!Array.isArray(value)) {
          return ''
        }
        return value.join('\n')
      }

      if (meta.type === 'object') {
        if (isPlainObject(value) && value.raw != null) {
          return String(value.raw)
        }
        return ''
      }

      if (value == null) {
        return ''
      }

      return String(value)
    },

    parseEditorValue(factKey, text) {
      const meta = FACT_META[factKey]
      const normalized = String(text == null ? '' : text).trim()

      if (!meta) {
        throw new Error('不支持的记忆项')
      }

      if (!normalized) {
        throw new Error('内容不能为空')
      }

      if (meta.type === 'array') {
        const values = normalized
          .split(/[\n,，]/)
          .map((item) => item.trim())
          .filter(Boolean)

        if (values.length === 0) {
          throw new Error('至少填写一项内容')
        }

        return values
      }

      if (meta.type === 'object') {
        return {
          raw: normalized,
        }
      }

      return normalized
    },

    submitEditor() {
      if (!this.editorFactKey || !this.userId) {
        return
      }

      let factValue
      try {
        factValue = this.parseEditorValue(this.editorFactKey, this.editorText)
      } catch (e) {
        this.editorError = e.message || '内容格式不正确'
        return
      }

      this.saving = true
      this.editorError = ''

      upsertMemoryFact(this.userId, this.editorFactKey, factValue)
        .then(() => {
          this.closeEditor()
          this.refreshFacts(true)
          uni.showToast({
            title: '已保存',
            icon: 'success',
          })
        })
        .catch((err) => {
          this.editorError = this.extractErrorMessage(err)
        })
        .then(() => {
          this.saving = false
        })
    },

    openHistory(factKey) {
      const meta = FACT_META[factKey]
      if (!meta || !this.userId) {
        return
      }

      this.historyFactKey = factKey
      this.historyItems = []
      this.$refs.historyPopup && this.$refs.historyPopup.open('bottom')

      getMemoryHistory(this.userId, factKey)
        .then((res) => {
          this.historyItems = Array.isArray(res) ? res : []
        })
        .catch((err) => {
          this.historyItems = []
          uni.showToast({
            title: this.extractErrorMessage(err),
            icon: 'none',
          })
        })
    },

    closeHistory() {
      this.historyFactKey = ''
      this.historyItems = []
      this.$refs.historyPopup && this.$refs.historyPopup.close()
    },

    deleteFact(factKey) {
      if (!this.userId) {
        return
      }

      const meta = FACT_META[factKey]
      if (!meta) {
        return
      }

      uni.showModal({
        title: '删除确认',
        content: `确定要删除“${meta.label}”吗？`,
        confirmText: '删除',
        confirmColor: '#e95f3c',
        success: (res) => {
          if (!res.confirm) {
            return
          }

          deleteMemoryFact(this.userId, factKey)
            .then(() => {
              this.refreshFacts(true)
              uni.showToast({
                title: '已删除',
                icon: 'success',
              })
            })
            .catch((err) => {
              uni.showToast({
                title: this.extractErrorMessage(err),
                icon: 'none',
              })
            })
        },
      })
    },

    formatConfidence(value) {
      if (value == null || value === '') {
        return '--'
      }

      const number = Number(value)
      if (Number.isNaN(number)) {
        return String(value)
      }

      return number.toFixed(1)
    },

    getSourceLabel(sourceType) {
      const mapping = {
        USER_MANUAL: '用户自设',
        USER: '对话提取',
        INFERRED: 'AI推断',
      }
      return mapping[sourceType] || (sourceType ? String(sourceType) : '未设置')
    },

    getSourceClass(sourceType) {
      if (sourceType === 'USER_MANUAL') {
        return 'manual'
      }
      if (sourceType === 'INFERRED') {
        return 'inferred'
      }
      if (sourceType === 'USER') {
        return 'user'
      }
      return 'unset'
    },

    formatTime(value) {
      return formatDateTime(value)
    },

    formatDisplayValue(value) {
      return normalizeHistoryValue(value)
    },

    getValueSummary(value, factKey) {
      const meta = FACT_META[factKey]
      const display = normalizeDisplayValue(value)

      if (!display) {
        return meta ? meta.emptyText : '未设置'
      }

      return truncateText(display.replace(/\n+/g, ' / '), 80)
    },

    extractErrorMessage(err) {
      if (!err) {
        return '操作失败'
      }
      if (typeof err === 'string') {
        return err
      }
      return String(err.message || err.msg || err.error || '操作失败')
    },

    showError(err) {
      uni.showToast({
        title: this.extractErrorMessage(err),
        icon: 'none',
      })
    },

    goBack() {
      uni.navigateBack({
        delta: 1,
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 0%, rgba(233, 95, 60, 0.12), transparent 34%),
    linear-gradient(180deg, #fff7f3 0%, #f8f8f8 28%, #f8f8f8 100%);
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
  padding-top: 88rpx;
}

.hero {
  margin: 24rpx 24rpx 0;
  padding: 28rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.86);
  border: 1rpx solid rgba(233, 95, 60, 0.16);
  box-shadow: 0 18rpx 40rpx rgba(58, 35, 25, 0.08);
}

.hero__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero__title {
  font-size: 36rpx;
  line-height: 1.3;
  font-weight: 700;
  color: #1f1f1f;
}

.hero__pill {
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: #fff0eb;
  color: #e95f3c;
  font-size: 24rpx;
  border: 1rpx solid rgba(233, 95, 60, 0.18);
}

.hero__desc {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: #666;
}

.hero__stats {
  display: flex;
  margin-top: 22rpx;
  justify-content: space-between;
}

.hero__stats .stat + .stat {
  margin-left: 16rpx;
}

.stat {
  flex: 1;
  padding: 20rpx 16rpx;
  border-radius: 22rpx;
  background: #fff;
  border: 1rpx solid #ece3de;
}

.stat__num {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #222;
  line-height: 1.2;
}

.stat__label {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #888;
}

.empty-wrap {
  margin-top: 28rpx;
}

.card-list {
  padding: 8rpx 24rpx 36rpx;
}

.fact-card {
  margin-top: 20rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: #fff;
  border: 1rpx solid #ece3de;
  box-shadow: 0 14rpx 30rpx rgba(58, 35, 25, 0.06);
}

.fact-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.fact-card__title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1f1f1f;
  line-height: 1.3;
}

.fact-card__key {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}

.fact-card__actions {
  display: flex;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.fact-card__actions .mini-action + .mini-action {
  margin-left: 12rpx;
}

.mini-action,
.danger-action,
.popup-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 24rpx;
  line-height: 1;
}

.mini-action {
  padding: 12rpx 20rpx;
  background: #fff0eb;
  color: #e95f3c;
  border: 1rpx solid rgba(233, 95, 60, 0.16);
}

.mini-action--ghost {
  background: #f7f7f7;
  color: #555;
  border-color: #e6e6e6;
}

.fact-card__body {
  margin-top: 18rpx;
}

.fact-card__value {
  display: block;
  font-size: 28rpx;
  line-height: 1.6;
  color: #333;
  word-break: break-word;
}

.fact-card__placeholder {
  display: block;
  font-size: 28rpx;
  line-height: 1.6;
  color: #aaa;
}

.fact-card__meta {
  display: flex;
  flex-wrap: wrap;
  margin-top: 18rpx;
}

.fact-card__meta .meta-tag + .meta-tag,
.fact-card__meta .meta-tag + .meta-time,
.fact-card__meta .meta-time + .meta-tag,
.fact-card__meta .meta-time + .meta-time {
  margin-left: 10rpx;
}

.meta-tag {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  background: #f6f6f6;
  color: #666;
}

.meta-tag--manual {
  background: rgba(233, 95, 60, 0.12);
  color: #b64326;
}

.meta-tag--inferred {
  background: rgba(42, 122, 255, 0.1);
  color: #2460cb;
}

.meta-tag--user {
  background: rgba(27, 172, 115, 0.12);
  color: #137d51;
}

.meta-tag--unset {
  background: #f4f4f4;
  color: #888;
}

.meta-time {
  padding: 8rpx 0;
  font-size: 22rpx;
  color: #999;
}

.fact-card__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 18rpx;
}

.danger-action {
  padding: 12rpx 20rpx;
  background: #fff;
  color: #c0472b;
  border: 1rpx solid rgba(192, 71, 43, 0.18);
}

.popup-panel {
  padding: 28rpx 24rpx calc(24rpx + env(safe-area-inset-bottom, 0rpx));
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
}

.popup-panel--history {
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom, 0rpx));
}

.popup-panel__header {
  display: flex;
  flex-direction: column;
}

.popup-panel__title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f1f1f;
  line-height: 1.3;
}

.popup-panel__sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #888;
  line-height: 1.5;
}

.popup-panel__hint {
  margin-top: 16rpx;
  padding: 18rpx 20rpx;
  border-radius: 20rpx;
  background: #fff7f3;
  color: #9d4b32;
  font-size: 24rpx;
  line-height: 1.5;
}

.input-box {
  margin-top: 18rpx;
  border-radius: 24rpx;
  border: 1rpx solid #e7ddd7;
  background: #fafafa;
  overflow: hidden;
}

.editor-input {
  width: 100%;
  min-height: 220rpx;
  box-sizing: border-box;
  padding: 22rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: #333;
}

.form-error {
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #c63e2c;
}

.popup-panel__actions {
  display: flex;
  margin-top: 22rpx;
}

.popup-panel__actions .popup-btn + .popup-btn {
  margin-left: 16rpx;
}

.popup-btn {
  flex: 1;
  padding: 22rpx 20rpx;
}

.popup-btn--ghost {
  background: #f5f5f5;
  color: #555;
}

.popup-btn--primary {
  background: #e95f3c;
  color: #fff;
}

.history-list {
  max-height: 64vh;
  margin-top: 18rpx;
}

.history-empty {
  padding: 30rpx 0;
  color: #999;
  font-size: 26rpx;
  text-align: center;
}

.history-item {
  margin-bottom: 18rpx;
  padding: 20rpx;
  border-radius: 24rpx;
  background: #fafafa;
  border: 1rpx solid #ece3de;
}

.history-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}

.history-field {
  margin-top: 12rpx;
}

.history-field__label {
  display: block;
  font-size: 24rpx;
  color: #999;
  line-height: 1.3;
}

.history-field__value {
  display: block;
  margin-top: 6rpx;
  font-size: 26rpx;
  line-height: 1.55;
  color: #333;
  word-break: break-word;
}
</style>
