# 快速开始指南

## 📦 在任何机器上使用

### 1. 克隆项目
```bash
git clone https://github.com/ifnodoraemon/ifnodoraemon.github.io.git
cd ifnodoraemon.github.io
```

### 2. 安装依赖
```bash
npm install
```

### 3. 本地开发
```bash
npm run dev
```
访问 http://localhost:5173 查看效果

### 4. 构建生产版本
```bash
npm run build
```

## 🚀 部署到 GitHub Pages

### 首次部署

1. 在 GitHub 创建仓库 `ifnodoraemon.github.io`
2. 推送代码：
```bash
git remote add origin https://github.com/ifnodoraemon/ifnodoraemon.github.io.git
git push -u origin main
```

3. 在 GitHub 仓库设置中：
   - 进入 Settings > Pages
   - Source 选择 "GitHub Actions"

4. 等待 Actions 自动部署完成
5. 访问 https://ifnodoraemon.github.io

### 后续更新

只需推送代码，GitHub Actions 会自动部署：
```bash
git add .
git commit -m "更新内容"
git push
```

## 📝 自定义内容

- `index.html` - 修改页面内容和结构
- `style.css` - 调整样式和配色
- `main.js` - 添加交互功能

## 🎨 主题说明

当前主题为 AI 大模型博客风格，包含：
- 文章列表展示
- 主题标签分类
- 响应式布局
- 现代化渐变背景

## ⚡ 技术栈

- Vite 7.x - 快速构建工具
- 原生 HTML/CSS/JavaScript
- GitHub Actions - 自动化部署
