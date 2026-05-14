<template>
  <view class="page">
    <view class="nav-bar">
      <view class="back-btn" @tap="handleBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">苍穹管家</text>
      <view class="nav-status">
        <view class="status-dot"></view>
        <text class="status-text">{{ connected ? '在线' : '连接中' }}</text>
      </view>
    </view>

    <scroll-view class="msg-area" scroll-y :scroll-into-view="scrollToId" scroll-with-animation>
      <block v-if="messages.length === 0">
        <view class="msg agent">
          <view class="bubble agent">
            <mp-html
              class="agent-markdown"
              :content="renderMarkdown('你好，我是苍穹管家 AI 助手，可以帮你查询订单状态、取消订单、申请退款等。有需要就直接告诉我吧。')"
              :markdown="true"
              :scroll-table="true"
              :tag-style="agentMarkdownTagStyle"
            />
          </view>
        </view>
      </block>

      <block v-for="(msg, idx) in messages" :key="msg.id">
        <view v-if="msg.role === 'user'" class="msg user">
          <view class="bubble user">{{ msg.content }}</view>
          <text class="ts">{{ msg.time }}</text>
        </view>

        <view v-else class="msg agent">
          <view class="bubble agent">
            <mp-html
              class="agent-markdown"
              :content="renderMarkdown(formatAgentContent(msg.content))"
              :markdown="true"
              :scroll-table="true"
              :tag-style="agentMarkdownTagStyle"
            />
          </view>
          <text v-if="msg.intent" class="badge">AI {{ msg.intent }}</text>
          <text class="ts">{{ msg.time }}</text>
        </view>
      </block>

      <block v-if="loading && streamingIndex === -1">
        <view class="msg agent">
          <view class="thinking">
            <view class="dot"></view>
            <view class="dot"></view>
            <view class="dot"></view>
          </view>
        </view>
      </block>

      <block v-if="pendingConfirmation">
        <view class="msg agent">
          <view class="bubble confirm">{{ pendingConfirmation.question }}</view>
          <view class="confirm-row">
            <button class="btn-confirm" @tap="handleConfirm">确认</button>
            <button class="btn-cancel" @tap="handleCancelConfirmation">取消</button>
          </view>
          <text class="badge">需要确认 · {{ pendingConfirmation.intent }}</text>
        </view>
      </block>

      <view id="bottom"></view>
    </scroll-view>

    <view v-if="!pendingConfirmation" class="input-area">
      <textarea
        class="chat-input"
        :value="inputValue"
        @input="onInputChange"
        placeholder="输入消息…"
        auto-height
        maxlength="500"
        confirm-type="send"
        @confirm="handleSend"
      />
      <button v-if="!loading" class="send-btn" @tap="handleSend">➤</button>
      <view v-else class="stop-btn" @tap="handleStop">
        <view class="stop-sq"></view>
        <text>停止</text>
      </view>
    </view>
  </view>
</template>

<script>
import { mapMutations } from 'vuex'
import { userLogin } from '../api/api.js'
import { agentWsUrl } from '../../utils/env'
import mpHtml from '../../uni_modules/mp-html/components/mp-html/mp-html'

const agentMarkdownTagStyle = {
  p: 'margin: 0 0 16rpx; line-height: 1.6;',
  h1: 'margin: 0 0 16rpx; font-size: 40rpx; font-weight: 600; line-height: 1.35;',
  h2: 'margin: 0 0 16rpx; font-size: 36rpx; font-weight: 600; line-height: 1.35;',
  h3: 'margin: 0 0 16rpx; font-size: 32rpx; font-weight: 600; line-height: 1.35;',
  h4: 'margin: 0 0 16rpx; font-size: 30rpx; font-weight: 600; line-height: 1.35;',
  h5: 'margin: 0 0 16rpx; font-size: 28rpx; font-weight: 600; line-height: 1.35;',
  h6: 'margin: 0 0 16rpx; font-size: 26rpx; font-weight: 600; line-height: 1.35;',
  ul: 'margin: 0 0 16rpx; padding-left: 36rpx;',
  ol: 'margin: 0 0 16rpx; padding-left: 36rpx;',
  li: 'margin: 6rpx 0; line-height: 1.5;',
  blockquote: 'margin: 0 0 16rpx; padding: 12rpx 16rpx; border-left: 6rpx solid #f0a37d; background: #fff7f2; border-radius: 16rpx;',
  pre: 'margin: 0 0 16rpx; padding: 16rpx; border-radius: 16rpx; background: #f6f7f8; overflow-x: auto;',
  code: 'padding: 2rpx 8rpx; border-radius: 8rpx; background: #f3f4f6; font-size: 24rpx;',
  table: 'width: 100%; margin: 0 0 16rpx; border-collapse: collapse; table-layout: fixed;',
  th: 'border: 1rpx solid #ececec; padding: 10rpx 12rpx; font-size: 24rpx; line-height: 1.5; vertical-align: top; background: #fafafa; font-weight: 600;',
  td: 'border: 1rpx solid #ececec; padding: 10rpx 12rpx; font-size: 24rpx; line-height: 1.5; vertical-align: top; word-break: break-word;',
  a: 'color: #e95f3c; text-decoration: underline; word-break: break-all;',
  img: 'display: block; max-width: 100%; border-radius: 12rpx;',
}

function normalizeMarkdownContent(content) {
  return String(content == null ? '' : content)
    .replace(/\r\n/g, '\n')
    .replace(/\uFEFF/g, '')
}

function createConversationId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
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

function normalizeText(content) {
  return String(content == null ? '' : content)
    .replace(/\r\n/g, '\n')
    .replace(/\uFEFF/g, '')
}

function createAgentMessage(content) {
  return {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    role: 'agent',
    content: normalizeText(content),
    time: formatTime(Date.now()),
    intent: '',
  }
}

function extractFrameContent(frame) {
  if (!frame) {
    return ''
  }

  const candidates = [
    frame.content,
    frame.text,
    frame.message,
    frame.answer,
    frame.data && frame.data.content,
    frame.data && frame.data.text,
    frame.data && frame.data.message,
  ]

  for (let i = 0; i < candidates.length; i += 1) {
    const value = candidates[i]
    if (value != null && value !== '') {
      return String(value)
    }
  }

  if (frame.data && typeof frame.data === 'string') {
    return String(frame.data)
  }

  return ''
}

function ensureAgentMessage(vm, content) {
  const normalized = normalizeText(content)
  if (!normalized) {
    return null
  }

  if (vm.streamingIndex >= 0 && vm.messages[vm.streamingIndex]) {
    vm.messages[vm.streamingIndex].content = normalized
    vm.messages = vm.messages.slice()
    return vm.messages[vm.streamingIndex]
  }

  const message = createAgentMessage(normalized)
  vm.messages = vm.messages.concat([message])
  vm.streamingIndex = vm.messages.length - 1
  return message
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return h + ':' + m
}

export default {
  name: 'AgentPage',
  components: {
    mpHtml,
  },
  data() {
    return {
      messages: [],
      loading: false,
      streamingIndex: -1,
      pendingConfirmation: null,
      inputValue: '',
      scrollToId: '',
      connected: false,
      conversationId: '',
      userId: '',
      reconnectCount: 0,
      maxReconnectAttempts: 5,
      reconnectTimer: null,
      stopFallbackTimer: null,
      authPromise: null,
      socketTask: null,
      manualClose: false,
      agentMarkdownTagStyle,
    }
  },
  created() {
    this.conversationId = createConversationId()
    this.userId = this.resolveUserId()
  },
  onShow() {
    this.manualClose = false
    this.reconnectCount = 0
    this.connectWebSocket()
  },
  onHide() {
    this.manualClose = true
    this.closeWebSocket()
  },
  onUnload() {
    this.manualClose = true
    this.closeWebSocket()
    this.clearStopFallbackTimer()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  },
  methods: {
    ...mapMutations(['setToken', 'setUserId']),

    formatAgentContent(content) {
      return normalizeText(content)
    },

    renderMarkdown(content) {
      return normalizeMarkdownContent(content)
    },

    resolveUserId() {
      const storedUserId = this.resolveStoredUserId()
      if (storedUserId) {
        return storedUserId
      }
      const payload = parseJwtPayload(this.resolveToken())
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

    storeToken(token) {
      const value = token ? String(token) : ''
      try {
        this.setToken(value)
      } catch (e) {}

      if (value) {
        uni.setStorageSync('token', value)
      } else {
        uni.removeStorageSync('token')
      }
    },

    storeUserId(userId) {
      const value = userId == null ? '' : String(userId)
      try {
        this.setUserId(value)
      } catch (e) {}

      if (value) {
        uni.setStorageSync('userId', value)
      } else {
        uni.removeStorageSync('userId')
      }
    },

    loginWithWeChat() {
      if (this.authPromise) {
        return this.authPromise
      }

      this.authPromise = new Promise((resolve, reject) => {
        uni.login({
          success: (loginRes) => {
            if (!loginRes || !loginRes.code) {
              reject(new Error('微信登录失败'))
              return
            }

            userLogin({ code: loginRes.code })
              .then((res) => {
                if (res.code !== 1 && res.code !== 200) {
                  reject(new Error(res.msg || '登录失败'))
                  return
                }

                const data = res.data || {}
                const token = data.token || ''
                const payload = parseJwtPayload(token)
                const userId = data.id || data.userId || (payload && payload.userId) || ''

                if (!token) {
                  reject(new Error('登录成功但未返回 token'))
                  return
                }
                if (!userId) {
                  reject(new Error('登录成功但未返回用户ID'))
                  return
                }

                this.storeToken(token)
                this.storeUserId(userId)
                resolve(String(userId))
              })
              .catch((err) => {
                reject(new Error((err && err.data && err.data.msg) || (err && err.msg) || '登录请求失败'))
              })
          },
          fail: () => {
            reject(new Error('微信登录失败'))
          },
        })
      }).then(
        (value) => {
          this.authPromise = null
          return value
        },
        (error) => {
          this.authPromise = null
          throw error
        },
      )

      return this.authPromise
    },

    ensureAuthenticated() {
      const storedUserId = this.resolveStoredUserId()
      if (storedUserId) {
        this.userId = storedUserId
        return Promise.resolve(storedUserId)
      }

      const token = this.resolveToken()
      if (token) {
        const payload = parseJwtPayload(token)
        const tokenUserId = payload && payload.userId ? String(payload.userId) : ''
        if (tokenUserId) {
          this.storeUserId(tokenUserId)
          this.userId = tokenUserId
          return Promise.resolve(tokenUserId)
        }
      }

      return this.loginWithWeChat().then((userId) => {
        this.userId = userId
        return userId
      })
    },

    connectWebSocket() {
      if (this.socketTask) {
        return
      }

      this.socketTask = uni.connectSocket({
        url: agentWsUrl,
        fail: () => {
          this.socketTask = null
          this.connected = false
          if (!this.manualClose) {
            this.scheduleReconnect()
          }
        },
      })

      this.socketTask.onOpen(() => {
        this.reconnectCount = 0
        this.connected = true
      })

      this.socketTask.onClose(() => {
        this.connected = false
        this.socketTask = null
        if (!this.manualClose) {
          this.scheduleReconnect()
        }
      })

      this.socketTask.onError(() => {
        this.connected = false
        this.socketTask = null
        if (!this.manualClose) {
          this.scheduleReconnect()
        }
      })

      this.socketTask.onMessage((res) => {
        try {
          console.log('[Agent][ws raw]', res.data)
          const frame = JSON.parse(res.data)
          console.log('[Agent][ws frame]', frame)
          this.handleFrame(frame)
        } catch (e) {
          console.error('[Agent] JSON parse error:', e, res.data)
        }
      })
    },

    closeWebSocket() {
      this.clearStopFallbackTimer()
      if (this.socketTask) {
        try {
          this.socketTask.close()
        } catch (e) {}
        this.socketTask = null
      }
      this.connected = false
    },

    scheduleReconnect() {
      if (this.reconnectCount >= this.maxReconnectAttempts) {
        return
      }

      this.reconnectCount += 1
      const delay = Math.min(Math.pow(2, this.reconnectCount - 1) * 1000, 16000)
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
      }

      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        if (!this.manualClose && !this.socketTask) {
          this.connectWebSocket()
        }
      }, delay)
    },

    handleFrame(frame) {
      console.log('[Agent][handleFrame]', frame && frame.type, frame)
      if (!frame || !frame.type) {
        return
      }

      switch (frame.type) {
        case 'token':
          this.handleTokenFrame(frame.content, frame)
          break
        case 'confirmation':
          this.handleConfirmationFrame(frame)
          break
        case 'done':
          this.handleDoneFrame(frame)
          break
        case 'cancelled':
          this.handleCancelledFrame()
          break
        case 'error':
          this.handleErrorFrame(frame)
          break
        default:
          console.warn('[Agent] Unknown frame type:', frame.type)
      }
    },

    handleTokenFrame(content, frame) {
      console.log('[Agent][token]', {
        content,
        frame,
        streamingIndex: this.streamingIndex,
        messageCount: this.messages.length,
      })
      const text = extractFrameContent(frame || { content: content })
      if (this.streamingIndex < 0) {
        const normalized = text.replace(/^[\r\n]+/, '')
        if (!normalized) {
          return
        }

        ensureAgentMessage(this, normalized)
        this.loading = true
        this.scrollToBottom()
        return
      }

      const nextContent = normalizeText((this.messages[this.streamingIndex] && this.messages[this.streamingIndex].content) || '') + text
      this.messages[this.streamingIndex].content = nextContent
      this.loading = true
      this.messages = this.messages.slice()
      this.scrollToBottom()
    },

    handleConfirmationFrame(frame) {
      this.pendingConfirmation = {
        intent: frame.intent || '',
        orderId: frame.orderId || '',
        question: frame.question || '',
        reason: frame.reason || '',
      }
      this.loading = false
      this.streamingIndex = -1
      this.scrollToBottom()
    },

    handleDoneFrame(frame) {
      console.log('[Agent][done]', {
        frame,
        streamingIndex: this.streamingIndex,
        currentMessage: this.streamingIndex >= 0 && this.messages[this.streamingIndex]
          ? this.messages[this.streamingIndex]
          : null,
      })
      const finalContent = extractFrameContent(frame)
      this.clearStopFallbackTimer()

      if (this.streamingIndex >= 0 && this.messages[this.streamingIndex]) {
        const currentContent = normalizeText(this.messages[this.streamingIndex].content || '')
        const finalText = normalizeText(finalContent)
        let merged = currentContent

        if (finalText) {
          if (!currentContent) {
            merged = finalText
          } else if (finalText.indexOf(currentContent) === 0) {
            merged = finalText
          } else if (currentContent.indexOf(finalText) === 0) {
            merged = currentContent
          } else {
            merged = currentContent + finalText
          }
        }

        this.messages[this.streamingIndex].content = merged
        this.messages[this.streamingIndex].intent = frame.intent || this.messages[this.streamingIndex].intent || ''
        this.messages = this.messages.slice()
      } else if (finalContent) {
        const message = createAgentMessage(finalContent)
        message.intent = frame.intent || ''
        this.messages = this.messages.concat([message])
      }

      this.loading = false
      this.streamingIndex = -1
      this.scrollToBottom()
    },

    handleCancelledFrame() {
      this.loading = false
      this.streamingIndex = -1
      this.clearStopFallbackTimer()
    },

    handleErrorFrame(frame) {
      this.clearStopFallbackTimer()
      uni.showToast({
        title: frame.message || '发生错误',
        icon: 'none',
        duration: 2000,
      })
      this.loading = false
      this.streamingIndex = -1
    },

    handleSend() {
      const content = String(this.inputValue || '').trim()
      if (!content) {
        return
      }

      if (!this.connected || !this.socketTask) {
        uni.showToast({
          title: '连接已断开，请稍后重试',
          icon: 'none',
          duration: 2000,
        })
        return
      }

      if (this.loading) {
        uni.showToast({
          title: '请等待当前回复完成',
          icon: 'none',
          duration: 1500,
        })
        return
      }

      this.ensureAuthenticated()
        .then((userId) => {
          const message = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            role: 'user',
            content: content,
            time: formatTime(Date.now()),
          }

          this.messages = this.messages.concat([message])
          this.inputValue = ''
          this.loading = true
          this.streamingIndex = -1
          this.userId = userId
          this.scrollToBottom()

          const payload = {
            conversationId: this.conversationId,
            userId: userId,
            message: content,
          }

          this.socketTask.send({
            data: JSON.stringify(payload),
            fail: () => {
              uni.showToast({
                title: '发送失败，请重试',
                icon: 'none',
                duration: 2000,
              })
              this.loading = false
            },
          })
        })
        .catch((error) => {
          uni.showToast({
            title: error && error.message ? error.message : String(error || '登录失败'),
            icon: 'none',
            duration: 2000,
          })
        })
    },

    handleStop() {
      if (!this.connected || !this.socketTask) {
        this.loading = false
        this.streamingIndex = -1
        return
      }

      const payload = {
        type: 'cancel',
        conversationId: this.conversationId,
      }

      try {
        this.socketTask.send({
          data: JSON.stringify(payload),
          fail: () => {
            this.loading = false
            this.streamingIndex = -1
          },
        })
      } catch (e) {
        this.loading = false
        this.streamingIndex = -1
      }

      this.clearStopFallbackTimer()
      this.stopFallbackTimer = setTimeout(() => {
        if (this.loading) {
          this.loading = false
          this.streamingIndex = -1
        }
        this.stopFallbackTimer = null
      }, 3000)

      uni.showToast({
        title: '已停止生成',
        icon: 'none',
        duration: 1500,
      })
    },

    handleConfirm() {
      const pending = this.pendingConfirmation
      if (!pending) {
        return
      }

      if (!this.connected || !this.socketTask) {
        uni.showToast({
          title: '连接已断开，请稍后重试',
          icon: 'none',
          duration: 2000,
        })
        return
      }

      this.ensureAuthenticated()
        .then((userId) => {
          const payload = {
            conversationId: this.conversationId,
            userId: userId,
            confirmation: true,
            intent: pending.intent,
          }

          this.userId = userId
          this.pendingConfirmation = null
          this.loading = true
          this.streamingIndex = -1

          this.socketTask.send({
            data: JSON.stringify(payload),
            fail: () => {
              uni.showToast({
                title: '发送确认失败，请重试',
                icon: 'none',
                duration: 2000,
              })
              this.loading = false
            },
          })
        })
        .catch((error) => {
          uni.showToast({
            title: error && error.message ? error.message : String(error || '登录失败'),
            icon: 'none',
            duration: 2000,
          })
        })
    },

    handleCancelConfirmation() {
      this.pendingConfirmation = null
    },

    handleBack() {
      this.manualClose = true
      this.closeWebSocket()
      uni.navigateBack()
    },

    onInputChange(e) {
      this.inputValue = (e.detail && e.detail.value) || ''
    },

    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollToId = 'bottom'
        setTimeout(() => {
          this.scrollToId = ''
        }, 100)
      })
    },

    clearStopFallbackTimer() {
      if (this.stopFallbackTimer) {
        clearTimeout(this.stopFallbackTimer)
        this.stopFallbackTimer = null
      }
    },
  },
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8f8f8;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 80rpx 30rpx 20rpx;
  background: #e95f3c;
}

.back-btn {
  position: absolute;
  left: 20rpx;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow {
  color: #ffffff;
  font-size: 48rpx;
  line-height: 1;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  color: #ffffff;
  font-weight: 500;
  line-height: 48rpx;
}

.nav-status {
  position: absolute;
  right: 30rpx;
  display: flex;
  align-items: center;
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #1d9e75;
  margin-right: 8rpx;
}

.status-text {
  font-size: 22rpx;
  color: #ffffff;
}

.msg-area {
  flex: 1;
  padding: 140rpx 24rpx 24rpx;
}

.msg {
  display: flex;
  flex-direction: column;
  margin-bottom: 20rpx;
}

.msg.user {
  align-items: flex-end;
}

.msg.agent {
  align-items: flex-start;
}

.bubble {
  padding: 18rpx 26rpx;
  font-size: 28rpx;
  line-height: 1.5;
  max-width: 80%;
  word-break: break-word;
  white-space: pre-line;
}

.bubble.user {
  background: #e95f3c;
  color: #ffffff;
  border-radius: 24rpx 24rpx 8rpx 24rpx;
}

.bubble.agent {
  background: #ffffff;
  color: #333333;
  border: 1px solid #e0e0e0;
  border-radius: 24rpx 24rpx 24rpx 8rpx;
  white-space: normal;
}

.bubble.confirm {
  background: #faeeda;
  color: #333333;
  border: 1px solid #ef9f27;
  border-radius: 24rpx 24rpx 24rpx 8rpx;
}

.bubble.agent .agent-markdown {
  display: block;
  width: 100%;
}

.ts {
  font-size: 22rpx;
  color: #aaa;
  padding: 0 8rpx;
}

.badge {
  font-size: 22rpx;
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  background: #f0f0ec;
  color: #888;
  border: 1px solid #e0e0e0;
  margin-top: 6rpx;
}

.thinking {
  display: inline-flex;
  align-items: center;
  padding: 20rpx 28rpx;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 24rpx 24rpx 24rpx 8rpx;
}

.thinking .dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #bbb;
  animation: bounce 1.2s infinite;
  margin-right: 8rpx;
}

.thinking .dot:last-child {
  margin-right: 0;
}

.thinking .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }

  30% {
    transform: translateY(-10rpx);
    opacity: 1;
  }
}

.confirm-row {
  display: flex;
  margin-top: 10rpx;
}

.btn-confirm {
  padding: 10rpx 26rpx;
  border-radius: 16rpx;
  background: #faece7;
  color: #993c1d;
  border: 1rpx solid #f09b7b;
  font-size: 26rpx;
  margin-right: 16rpx;
}

.btn-cancel {
  padding: 10rpx 26rpx;
  border-radius: 16rpx;
  background: #f0f0ec;
  color: #666666;
  border: 1rpx solid #ccc;
  font-size: 26rpx;
}

.input-area {
  display: flex;
  align-items: center;
  padding: 22rpx 26rpx calc(22rpx + env(safe-area-inset-bottom, 0rpx));
  border-top: 1px solid #e0e0e0;
  background: #ffffff;
}

.chat-input {
  flex: 1;
  border: 1px solid #ccc;
  border-radius: 36rpx;
  padding: 16rpx 26rpx;
  font-size: 26rpx;
  min-height: 64rpx;
  background: #f5f5f3;
  line-height: 1.4;
}

.send-btn {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background: #e95f3c;
  border: none;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 32rpx;
  margin-left: 16rpx;
}

.stop-btn {
  display: flex;
  align-items: center;
  padding: 12rpx 22rpx;
  border-radius: 36rpx;
  border: 1rpx solid #ccc;
  background: #f5f5f3;
  font-size: 24rpx;
  color: #666666;
  white-space: nowrap;
  margin-left: 16rpx;
}

.stop-sq {
  width: 18rpx;
  height: 18rpx;
  border-radius: 4rpx;
  background: #888;
  display: inline-block;
  margin-right: 8rpx;
}
</style>
