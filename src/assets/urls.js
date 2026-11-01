// 共享的部署基座（deployment base）感知 public 资产 URL 解析器（2026-10-31 子目录 404 修复）。
// 根因：旧的绝对路径 `/nli-preview/*` 会逃出 `/pyquest/` 等子目录挂载点 → 生产 404 →
// Boot fail-closed 隐藏标题、Start 点击超时。本模块是唯一负责运行时 nli-preview URL 的场所。
//
// 约定：
// - path 是应用内 public 路径（如 'nli-preview/grass.png'）；前导 '/' 会被归一化剥掉，
//   以免资源绝对路径吞掉所选部署基座（保留「不逃出挂载点」这一不变量）。
// - base 缺省取 Vite 注入的 import.meta.env.BASE_URL（vite.config.js base:'./' → './'）；
//   纯 Node（单元测试/冒烟）下 import.meta.env 不存在，安全回落 './' 相对路径。
// - base '' 与 './' 保持相对；'/' 与 '/pyquest/'、'/nested/game/' 等绝对基座原样保留前缀，
//   不产生重复斜杠、不丢弃前缀。
// - 本模块导入时不依赖 window/document（Node 可直接 import）。
const RELATIVE_FALLBACK = './';

function resolveDefaultBase() {
  // Vite：import.meta.env.BASE_URL（构建时注入）；Node：import.meta.env 为 undefined，
  // 普通属性访问即安全，无需异常处理。仅当注入值缺失/非字符串时回落 './'。
  const env = import.meta.env;
  if (env && typeof env.BASE_URL === 'string') return env.BASE_URL;
  return RELATIVE_FALLBACK;
}

function normalizeBase(base) {
  if (base === undefined || base === null) return RELATIVE_FALLBACK;
  const b = String(base);
  if (b === '') return ''; // 显式空基座：纯相对路径
  return b.endsWith('/') ? b : `${b}/`; // 统一尾斜杠，避免重复或缺失分隔符
}

function stripLeadingSlashes(path) {
  return String(path).replace(/^\/+/, '');
}

export function assetUrl(path, base = resolveDefaultBase()) {
  const b = normalizeBase(base);
  const p = stripLeadingSlashes(path);
  return b === '' ? p : b + p;
}
