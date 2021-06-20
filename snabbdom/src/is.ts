// 函数 Array.isArray 的缓存简写
export const array = Array.isArray;

// 判断传入的值是否是 字符串或者数字
export function primitive(s: any): s is string | number {
  return typeof s === "string" || typeof s === "number";
}
