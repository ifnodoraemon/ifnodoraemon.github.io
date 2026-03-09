# ifnodoraemon.github.io

我的 GitHub Pages 个人主页

## 快速开始

### 在任何机器上运行

1. **克隆项目**
   ```bash
   git clone https://github.com/ifnodoraemon/ifnodoraemon.github.io.git
   cd ifnodoraemon.github.io
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

   然后在浏览器打开 `http://localhost:5173`

### 其他命令

- `npm run build` - 构建生产版本
- `npm run preview` - 预览生产版本

## 部署

项目已配置 GitHub Actions 自动部署：

1. 推送代码到 `main` 分支
2. GitHub Actions 自动构建并部署
3. 访问 https://ifnodoraemon.github.io

### 首次部署设置

1. 在 GitHub 仓库中，进入 Settings > Pages
2. Source 选择 "GitHub Actions"
3. 推送代码后会自动部署

## 技术栈

- Vite - 快速的开发构建工具
- 原生 HTML/CSS/JavaScript
- GitHub Actions - 自动部署

## 项目结构

```
ifnodoraemon.github.io/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions 部署配置
├── index.html              # 主页面
├── style.css               # 样式文件
├── main.js                 # JavaScript 逻辑
├── vite.config.js          # Vite 配置
├── package.json            # 项目配置
└── README.md               # 说明文档
```

## 自定义

- 修改 `index.html` 更新页面内容
- 修改 `style.css` 调整样式
- 修改 `main.js` 添加交互功能

## License

MIT
