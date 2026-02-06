<div align="center">

# 🌍 CCUS Policy Hub | 全球 CCUS 政策与设施数据库

**Global Intelligence Infrastructure for Carbon Capture, Utilization, and Storage**

[![Deploy Status](https://github.com/liuh886/ccus-policy-hub/actions/workflows/deploy.yml/badge.svg)](https://github.com/liuh886/ccus-policy-hub/actions)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-ff5a03.svg)](https://astro.build)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[中文介绍](#-项目简介) | [English Introduction](#-introduction) | [Live Demo](https://liuh886.github.io/ccus-policy-hub/)

</div>

---

## 📖 项目简介

**CCUS Policy Hub** 是一个开源的、高保真全球 CCUS (碳捕集、利用与封存) 知识基础设施。旨在解决行业痛点：政策分散、数据非结构化、法律就绪度 (PLR) 难以横向对比。

本项目集成了 **IEA 全球设施数据库** 与 **GCCSI 核心法律指标**，通过 "单源真相 (SSOT)" 架构，实现了从政策文本到数字化洞察的自动化转译。

### 核心价值
- **🌐 全球视野**：覆盖中、美、欧、东南亚等 35+ 个核心经济体的 CCS 监管框架。
- **📊 深度对标**：首创 **PLR 3.0 对比矩阵**，支持从“激励额度”到“孔隙权属”、“责任转移”等 10+ 维度的硬核比对。
- **🔗 智能勾连**：自动关联全球 800+ 个设施与其所在地的适用政策，让每一个项目都有法可依。
- **⚡ 极致性能**：基于 Astro 5 构建的静态站点，配合 Pagefind 实现毫秒级边缘搜索。

---

## 🚀 Features (功能特性)

| Feature | Description | 截图预览 |
|---------|-------------|---------|
| **Policy Access Console** | **全球准入控制台**：交互式地图导航，实时透视各区域激励强度。 | ![Map Preview](https://placehold.co/600x300/1e293b/fff?text=Interactive+World+Map) |
| **Comparative Matrix** | **PLR 3.0 对比矩阵**：支持多国法律就绪度横向测评（孔隙权、长期责任、跨境规则）。 | ![Compare Preview](https://placehold.co/600x300/1e293b/fff?text=Policy+Comparison) |
| **Facility Intelligence** | **设施-政策图谱**：全球项目库，自动挂载适用的法律条款与激励政策。 | ![Facility Preview](https://placehold.co/600x300/1e293b/fff?text=Facility+Intelligence) |

---

## 🏗️ Architecture (技术架构)

本项目采用 **"Data-Driven SSG"** 架构，确保数据的高保真与可维护性。

```mermaid
graph TD
    A[📄 SSOT Database] -->|JSON| B(⚙️ Build Pipeline);
    A -->|Validation| C{✅ Schema Check};
    
    subgraph Data Layer
    A1[policy_database.json]
    A2[IEA Facility Data]
    end
    
    subgraph Render Layer (Astro)
    B --> D[Policy Pages];
    B --> E[Facility Map];
    B --> F[Compare Matrix];
    end
    
    subgraph Search
    D & E & F --> G[🔍 Pagefind Index];
    end
    
    C -->|Pass| B;
    B -->|Deploy| H[☁️ GitHub Pages];
```

- **SSOT (Single Source of Truth)**: 所有政策元数据存储于 `src/data/policy_database.json`。
- **Automated Sync**: 通过 `scripts/sync.cjs` 自动将 JSON 数据渲染为高保真 Markdown 文件。
- **Health Check**: `scripts/check.cjs` 确保无乱码、无死链、元数据合规。

---

## 🛠️ Getting Started (快速开始)

### Prerequisites (前置要求)
- Node.js v18+
- pnpm (Recommended)

### Installation (安装)

```bash
# Clone repository
git clone https://github.com/liuh886/ccus-policy-hub.git
cd ccus-policy-hub

# Install dependencies
pnpm install

# Start local server
pnpm dev
```

### Data Maintenance (数据维护)

本项目内置了一套 **"数据库治理工具链"**：

1.  **更新数据**：直接修改 `src/data/policy_database.json`。
2.  **同步渲染**：运行同步脚本，自动生成 Markdown 页面。
    ```bash
    node scripts/sync.cjs
    ```
3.  **系统自检**：提交前运行健康检查。
    ```bash
    node scripts/check.cjs
    ```

---

## 🌍 Introduction

**CCUS Policy Hub** is an open-source, high-fidelity global intelligence infrastructure for Carbon Capture, Utilization, and Storage (CCUS). It addresses the industry's need for structured policy data and comparable legal readiness indicators (PLR).

By integrating the **IEA Facilities Database** with **GCCSI Legal Indicators**, it transforms raw policy texts into actionable digital insights via a "Single Source of Truth" (SSOT) architecture.

### Key Highlights
- **Global Coverage**: 35+ core economies including China, US, EU, and Southeast Asia.
- **Deep Benchmarking**: **PLR 3.0 Matrix** comparing Pore Space Rights, Liability Transfer, and Financial Assurance.
- **Smart Linkage**: Automatically maps 800+ facilities to their governing regulations.
- **High Performance**: Built on Astro 5 for blazing fast static delivery.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ for the Global Climate Community</sub>
</div>
