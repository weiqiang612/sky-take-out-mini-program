<template>
  <view class="agent-chat-btn" @tap="onTap">
    <text class="agent-chat-btn__icon">AI</text>
  </view>
</template>

<script>
export default {
  methods: {
    onTap() {
      uni.navigateTo({
        url: '/pages/agent/index',
      })
    },
  },
}
</script>

<style scoped>
.agent-chat-btn {
  position: fixed;
  right: 30rpx;
  bottom: 100rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #e95f3c;
  box-shadow: 0 4rpx 20rpx rgba(233, 95, 60, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.agent-chat-btn__icon {
  font-size: 36rpx;
  color: #ffffff;
  font-weight: bold;
}
</style>
