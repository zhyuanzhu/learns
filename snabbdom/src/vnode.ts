import { Hooks } from "./hooks";
import { AttachData } from "./helpers/attachto";
import { VNodeStyle } from "./modules/style";
import { On } from "./modules/eventlisteners";
import { Attrs } from "./modules/attributes";
import { Classes } from "./modules/class";
import { Props } from "./modules/props";
import { Dataset } from "./modules/dataset";

// 对 Key 属性对约定
export type Key = string | number | symbol;

// VNode 的成员 接口定义

export interface VNode {
  sel: string | undefined;       // 选择器
  data: VNodeData | undefined;   // 数据
  children: Array<VNode | string> | undefined;     // 子元素节点
  elm: Node | undefined;         // 当前 VNode 转换的 DOM 元素
  text: string | undefined;      // 文本内容，与 children 互斥
  key: Key | undefined;          // key
}

// VNodeData 的接口定义
export interface VNodeData {
  props?: Props;
  attrs?: Attrs;
  class?: Classes;
  style?: VNodeStyle;
  dataset?: Dataset;
  on?: On;
  attachData?: AttachData;
  hook?: Hooks;
  key?: Key;
  ns?: string; // for SVGs
  fn?: () => VNode; // for thunks
  args?: any[]; // for thunks
  is?: string; // for custom elements v1
  [key: string]: any; // for any other 3rd party module
}

// 返回一个 VNode 对象
export function vnode(
  sel: string | undefined,
  data: any | undefined,
  children: Array<VNode | string> | undefined,
  text: string | undefined,
  elm: Element | Text | undefined
): VNode {
  // key 是通过 data 赋值传递
  const key = data === undefined ? undefined : data.key;
  // VNode 对象
  return { sel, data, children, text, elm, key };
}
