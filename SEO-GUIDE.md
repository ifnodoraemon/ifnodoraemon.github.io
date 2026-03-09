# SEO 优化与 Google Ads 配置指南

## 📊 已完成的 SEO 优化

### 1. Meta 标签优化
- ✅ 标题标签（Title）：包含关键词"AI 大模型"
- ✅ 描述标签（Description）：清晰描述网站内容
- ✅ 关键词标签（Keywords）：AI、GPT、Claude 等
- ✅ Canonical URL：避免重复内容
- ✅ Open Graph 标签：社交媒体分享优化
- ✅ Twitter Card：Twitter 分享优化

### 2. 结构化数据（Schema.org）
- ✅ JSON-LD 格式的博客结构化数据
- ✅ 帮助搜索引擎理解网站类型和内容

### 3. 技术 SEO
- ✅ robots.txt：控制爬虫访问
- ✅ sitemap.xml：网站地图
- ✅ 响应式设计：移动端友好
- ✅ 语义化 HTML：使用正确的标签

## 🎯 Google AdSense 接入步骤

### 第一步：申请 AdSense 账号
1. 访问 https://www.google.com/adsense
2. 使用 Google 账号登录
3. 填写网站信息：`https://ifnodoraemon.github.io`
4. 等待审核（通常需要几天到几周）

### 第二步：获取 AdSense 代码
审核通过后，你会获得类似这样的代码：
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```

### 第三步：替换代码
在 `index.html` 中找到这行：
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
```

将 `ca-pub-XXXXXXXXXXXXXXXX` 替换为你的真实 AdSense ID

### 第四步：添加广告位
在文章之间或侧边栏添加广告代码：
```html
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="YYYYYYYYYY"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

## 📈 Google Analytics 配置

### 第一步：创建 GA4 账号
1. 访问 https://analytics.google.com
2. 创建新的 GA4 媒体资源
3. 获取衡量 ID（格式：G-XXXXXXXXXX）

### 第二步：替换代码
在 `index.html` 中找到：
```html
gtag('config', 'G-XXXXXXXXXX');
```

替换为你的真实 GA4 ID

## 🚀 SEO 最佳实践建议

### 内容优化
- 每篇文章标题包含目标关键词
- 文章长度建议 1000+ 字
- 使用 H1、H2、H3 标签层级结构
- 添加内部链接和外部权威链接
- 定期更新内容

### 技术优化
- 图片添加 alt 属性
- 使用语义化 HTML5 标签
- 确保页面加载速度 < 3秒
- 实现 HTTPS（GitHub Pages 自动支持）
- 添加面包屑导航

### 内容策略
- 定期发布高质量原创内容
- 关注 AI 领域热点话题
- 建立主题集群（Topic Clusters）
- 优化长尾关键词
- 鼓励用户互动和分享

## 📝 待办事项

- [ ] 申请 Google AdSense 账号
- [ ] 创建 Google Analytics 账号
- [ ] 替换 AdSense 和 GA 的真实 ID
- [ ] 创建 og-image.jpg（社交分享图片）
- [ ] 提交网站到 Google Search Console
- [ ] 创建并提交 sitemap
- [ ] 定期更新内容并监控 SEO 表现
