import store from '../../store'
import { agentBaseUrl } from '../../utils/env'

function resolveToken() {
  try {
    const stateToken = store && store.state && store.state.token
    if (stateToken) {
      return String(stateToken)
    }
  } catch (e) {}

  try {
    return String(uni.getStorageSync('token') || uni.getStorageSync('uni_id_token') || '')
  } catch (e) {
    return ''
  }
}

function buildHeaders() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    authentication: resolveToken(),
  }
}

function normalizeError(res) {
  if (!res) {
    return { message: '请求失败' }
  }

  if (res.data && typeof res.data === 'object') {
    const message = res.data.message || res.data.msg || res.data.error || res.data.detail
    if (message) {
      return { ...res.data, message: String(message) }
    }
    return { ...res.data, message: '请求失败' }
  }

  if (typeof res.data === 'string' && res.data) {
    return { message: res.data }
  }

  if (res.errMsg) {
    return { message: res.errMsg }
  }

  return { message: '请求失败' }
}

function requestMemory({ url = '', method = 'GET', data = undefined }) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: agentBaseUrl + url,
      method,
      data,
      header: buildHeaders(),
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        reject(normalizeError(res))
      },
      fail: (err) => {
        reject(normalizeError(err))
      },
    })
  })
}

export function getMemoryFacts(userId) {
  return requestMemory({
    url: `/api/v1/users/${encodeURIComponent(userId)}/memory`,
    method: 'GET',
  })
}

export function upsertMemoryFact(userId, factKey, factValue) {
  return requestMemory({
    url: `/api/v1/users/${encodeURIComponent(userId)}/memory/${encodeURIComponent(factKey)}`,
    method: 'PUT',
    data: {
      factValue,
    },
  })
}

export function deleteMemoryFact(userId, factKey) {
  return requestMemory({
    url: `/api/v1/users/${encodeURIComponent(userId)}/memory/${encodeURIComponent(factKey)}`,
    method: 'DELETE',
  })
}

export function getMemoryHistory(userId, factKey) {
  return requestMemory({
    url: `/api/v1/users/${encodeURIComponent(userId)}/memory/${encodeURIComponent(factKey)}/history`,
    method: 'GET',
  })
}
