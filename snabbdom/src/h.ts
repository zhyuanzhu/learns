import { vnode, VNode, VNodeData } from "./vnode";
import * as is from "./is";

export type VNodes = VNode[];
export type VNodeChildElement = VNode | string | number | undefined | null;

// 是 T 类型 或者成员类型为 T 的数组
export type ArrayOrElement<T> = T | T[];

// 可以是 VNodeChildElement 或者 成员是 VNodeChildElement 的数组
export type VNodeChildren = ArrayOrElement<VNodeChildElement>;

function addNS(
  data: any,
  children: VNodes | undefined,
  sel: string | undefined
): void {
  data.ns = "http://www.w3.org/2000/svg";
  if (sel !== "foreignObject" && children !== undefined) {
    for (let i = 0; i < children.length; ++i) {
      const childData = children[i].data;
      if (childData !== undefined) {
        addNS(childData, children[i].children as VNodes, children[i].sel);
      }
    }
  }
}

/**
 * h 函数创建 js 对象，即 VNode
 * 描述真实 DOM
 */
// 函数重载
// 只传入 sel
export function h(sel: string): VNode;

// 传入 data
export function h(sel: string, data: VNodeData | null): VNode;

// 传入 sel 和 children
// 传递两个参数的时候需要判断 第二个参数是 data 还是 children
export function h(sel: string, children: VNodeChildren): VNode;

// 传入 sel, data 和 children
export function h(
  sel: string,
  data: VNodeData | null,
  children: VNodeChildren
): VNode;

export function h(sel: any, b?: any, c?: any): VNode {
  let data: VNodeData = {};
  let children: any;
  let text: any;
  let i: number;

  // 第三个参数不为 undefined
  if (c !== undefined) {
    // 传入了 3个参数
    // 第二个参数 b 不是 null，是 模块中需要的数据
    if (b !== null) {
      // 将 data 赋值为 第二个参数
      data = b;
    }
    // 如果第三个参数是一个数组，设置子元素的时候是数组
    if (is.array(c)) {
      // 将 children 赋值为第三个参数
      children = c;
      // 如果传入的 c 是字符串或者数字
    } else if (is.primitive(c)) {
      // 给 text 赋值为 c
      // 创建文本节点使用
      text = c;
      // c 是 VNode
    } else if (c && c.sel) {
      // 将 VNode 对象转换成数组存储到 children 中
      children = [c];
    }
  // 处理两个参数的情况  
  } else if (b !== undefined && b !== null) {
    // b 如果是数组，将 children 赋值为 b
    if (is.array(b)) {
      children = b;
    } else if (is.primitive(b)) { // b 是 string 或者 number
      text = b;
    } else if (b && b.sel) { // b 是 VNode
      children = [b];
    } else {  // 如果是其他情况，则将 b 赋值给 data
      data = b;
    }
  }

  // 如果 children 有值
  if (children !== undefined) {
    // 循环遍历 children 中的每一项
    for (i = 0; i < children.length; ++i) {
      // 如果当前项是 number || string
      if (is.primitive(children[i]))
      // 将当前项重新赋值为 vnode 函数的返回值
        children[i] = vnode(
          undefined,
          undefined,
          undefined,
          children[i],
          undefined
        );
    }
  }
  // 判断处理 svg
  if (
    sel[0] === "s" &&
    sel[1] === "v" &&
    sel[2] === "g" &&
    (sel.length === 3 || sel[3] === "." || sel[3] === "#")
  ) {
    // TODO
    addNS(data, children, sel);
  }
  // 返货 vnode 函数 的返回值
  return vnode(sel, data, children, text, undefined);
}
