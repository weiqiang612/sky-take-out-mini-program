<template>
  <view class="markdown-renderer">
    <rich-text :nodes="renderedHtml"></rich-text>
  </view>
</template>

<script>
// Use the CJS entry explicitly so the older uni-app/HBuilderX resolver can locate it reliably.
const MarkdownIt = require('../../node_modules/markdown-it/dist/index.cjs.js')

function createMarkdownRenderer() {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    typographer: false,
  })

  return md
}

const markdownIt = createMarkdownRenderer()

function normalizeMarkdownContent(content) {
  return String(content == null ? '' : content)
    .replace(/\r\n/g, '\n')
    .replace(/\uFEFF/g, '')
}

function markdownToHtml(content) {
  const text = normalizeMarkdownContent(content)
  return markdownIt.render(text)
}

export default {
  name: 'MarkdownRenderer',
  props: {
    content: {
      type: String,
      default: '',
    },
    baseUrl: {
      type: String,
      default: '',
    },
    streaming: {
      type: Boolean,
      default: false,
    },
    showCursor: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    renderedHtml() {
      const html = markdownToHtml(this.content)
      if (!this.streaming || !this.showCursor) {
        return html
      }
      return html + '<span style="display:inline-block;opacity:0.75;">|</span>'
    },
  },
}
</script>

<style scoped>
.markdown-renderer {
  width: 100%;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.markdown-renderer rich-text {
  display: block;
  width: 100%;
}

.markdown-renderer ::v-deep p,
.markdown-renderer ::v-deep ul,
.markdown-renderer ::v-deep ol,
.markdown-renderer ::v-deep blockquote,
.markdown-renderer ::v-deep pre,
.markdown-renderer ::v-deep table {
  margin: 0 0 16rpx;
}

.markdown-renderer ::v-deep p:last-child,
.markdown-renderer ::v-deep ul:last-child,
.markdown-renderer ::v-deep ol:last-child,
.markdown-renderer ::v-deep blockquote:last-child,
.markdown-renderer ::v-deep pre:last-child,
.markdown-renderer ::v-deep table:last-child {
  margin-bottom: 0;
}

.markdown-renderer ::v-deep h1,
.markdown-renderer ::v-deep h2,
.markdown-renderer ::v-deep h3,
.markdown-renderer ::v-deep h4,
.markdown-renderer ::v-deep h5,
.markdown-renderer ::v-deep h6 {
  margin: 0 0 16rpx;
  font-weight: 600;
  line-height: 1.35;
}

.markdown-renderer ::v-deep ul,
.markdown-renderer ::v-deep ol {
  padding-left: 36rpx;
}

.markdown-renderer ::v-deep li {
  margin: 6rpx 0;
}

.markdown-renderer ::v-deep blockquote {
  padding: 12rpx 16rpx;
  border-left: 6rpx solid #f0a37d;
  background: #fff7f2;
  border-radius: 16rpx;
}

.markdown-renderer ::v-deep pre {
  padding: 16rpx;
  border-radius: 16rpx;
  background: #f6f7f8;
  overflow-x: auto;
}

.markdown-renderer ::v-deep code {
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
  background: #f3f4f6;
  font-size: 24rpx;
}

.markdown-renderer ::v-deep pre code {
  padding: 0;
  background: transparent;
}

.markdown-renderer ::v-deep table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.markdown-renderer ::v-deep th,
.markdown-renderer ::v-deep td {
  border: 1rpx solid #ececec;
  padding: 10rpx 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
  vertical-align: top;
  word-break: break-word;
}

.markdown-renderer ::v-deep th {
  background: #fafafa;
  font-weight: 600;
}

.markdown-renderer ::v-deep a {
  color: #e95f3c;
  text-decoration: underline;
  word-break: break-all;
}

.markdown-renderer ::v-deep img {
  display: block;
  max-width: 100%;
  border-radius: 12rpx;
}
</style>
