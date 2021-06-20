import { Module } from "./modules/module";
import { vnode, VNode } from "./vnode";
import * as is from "./is";
import { htmlDomApi, DOMAPI } from "./htmldomapi";

type NonUndefined<T> = T extends undefined ? never : T;

function isUndef(s: any): boolean {
  return s === undefined;
}

// 判断 s 参数是否不等于 undefined
function isDef<A>(s: A): s is NonUndefined<A> {
  return s !== undefined;
}

type VNodeQueue = VNode[];

const emptyNode = vnode("", {}, [], undefined, undefined);

function sameVnode(vnode1: VNode, vnode2: VNode): boolean {
  const isSameKey = vnode1.key === vnode2.key;
  const isSameIs = vnode1.data?.is === vnode2.data?.is;
  const isSameSel = vnode1.sel === vnode2.sel;

  return isSameSel && isSameKey && isSameIs;
}

function isVnode(vnode: any): vnode is VNode {
  return vnode.sel !== undefined;
}

type KeyToIndexMap = { [key: string]: number };

type ArraysOf<T> = {
  [K in keyof T]: Array<T[K]>;
};

type ModuleHooks = ArraysOf<Required<Module>>;

/**
 * 
 * @param children 
 * @param beginIdx 
 * @param endIdx 
 * @returns 一个对象，
 */
function createKeyToOldIdx(
  children: VNode[],
  beginIdx: number,
  endIdx: number
): KeyToIndexMap {
  // 定义 KeyToIndexMap 类型的对象
  const map: KeyToIndexMap = {};
  // 循环遍历 children
  for (let i = beginIdx; i <= endIdx; ++i) {
    // 如果 当前项 存在 key 属性
    const key = children[i]?.key;
    if (key !== undefined) {
      // 将当前项的 key 属性作为键，将当前索引作为值存储起来
      map[key as string] = i;
    }
  }
  return map;
}

// 存储钩子函数的名称
const hooks: Array<keyof Module> = [
  "create",
  "update",
  "remove",
  "destroy",
  "pre",
  "post",
];

/**
 * init 返回一个
 * @param modules 模块数组
 * @param domApi 
 * @returns { Function } patch 函数
 */
export function init(modules: Array<Partial<Module>>, domApi?: DOMAPI) {
  // 定义循环遍历 i j
  let i: number;
  let j: number;
  
  // 钩子函数回调函数存储数组
  const cbs: ModuleHooks = {
    create: [],
    update: [],
    remove: [],
    destroy: [],
    pre: [],
    post: [],
  };

  // 缓存 domApi
  // 如果传入，使用用户指定的 domApi，否则使用 htmlDomApi
  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;

  // 遍历钩子函数名称 hooks 
  for (i = 0; i < hooks.length; ++i) {
    // 将钩子函数的每一项设置为 cbs 的属性，并赋值为 []
    cbs[hooks[i]] = [];

    // 遍历传入的模块
    for (j = 0; j < modules.length; ++j) {
      // 获取模块中的钩子函数
      const hook = modules[j][hooks[i]];
      // 如果钩子函数在模块中存在
      if (hook !== undefined) {
        // 将该钩子函数 push 进 cbs 中存储的当前钩子函数名称对应的数组中
        (cbs[hooks[i]] as any[]).push(hook);
      }
    }
  }
  // 执行完之后 
  // cbs 中的数据为 
  // cbs = {
  //   create: [fn1, fn2],
  //   ...
  // }

  function emptyNodeAt(elm: Element) {
    // 获取元素的 id
    const id = elm.id ? "#" + elm.id : "";

    // elm.className doesn't return a string when elm is an SVG element inside a shadowRoot.
    // https://stackoverflow.com/questions/29454340/detecting-classname-of-svganimatedstring
    // 获取元素的 class
    const classes = elm.getAttribute("class");

    // 如果 classes 存在。使用 空格分割生成数组后再用 . 拼接成字符串，如果不存在返回 空字符串
    const c = classes ? "." + classes.split(" ").join(".") : "";
    // 调用 vnode 函数，生成 VNode 对象
    return vnode(
      api.tagName(elm).toLowerCase() + id + c,      // sel，用当前 dom 元素的 tagName + id + c 拼接字符串生成。例如：div#dv.test-div.is__green
      {},           // data
      [],           // children
      undefined,    // text
      elm           // elm
    );
  }

  /**
   * 
   * @param childElm 要删除的节点 dom 对象
   * @param listeners remove 钩子函数 length + 1
   * @returns 
   */
  function createRmCb(childElm: Node, listeners: number) {
    // 使用 rmCb 高阶函数的目的是为了缓存传入的参数，并等 都执行了 remove 钩子函数之后再执行
    return function rmCb() {
      // --listeners === 0 即所有的钩子函数都执行了 remove 钩子函数
      // 再执行 dom 删除操作
      if (--listeners === 0) {
        // 获取当前要删除元素的父元素
        const parent = api.parentNode(childElm) as Node;
        // 删除 parent 的 childElm节点
        api.removeChild(parent, childElm);
      }
    };
  }

  /**
   * 
   * @param vnode 
   * @param insertedVnodeQueue 
   * @returns VNode 的 elm
   */
  function createElm(vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
    // 定义 i
    let i: any;
    // 缓存 data 为 vnode 中传入的 data
    let data = vnode.data;

    // 如果传入了 data
    if (data !== undefined) {
      // 获取 data 中 用户传入的 init 钩子函数
      const init = data.hook?.init;
      // 如果 init 钩子函数存在
      if (isDef(init)) {
        // 将 vnode 作为参数传入 init 钩子函数，调用
        init(vnode);
        // data 重新赋值为 vnode.data
        // 有可能修改了 vnode
        data = vnode.data;
      }
    }

    // 缓存 vnode 的 children
    const children = vnode.children;
    // 缓存 vnode 的 sel
    const sel = vnode.sel;

    // sel 是否 等于 !
    if (sel === "!") {
      // sel 等于 ! 
      // 判断 text 是否定义，如果未定义，初始化为空字符串
      if (isUndef(vnode.text)) {
        vnode.text = "";
      }
      // 创建 注释节点，并赋值给 vnode.elm
      vnode.elm = api.createComment(vnode.text!);
    } else if (sel !== undefined) {      // 如果 sel 存在，不是 undefined，则是元素节点
      // Parse selector
      // 查看 vnode 的 sel 是否有 #，即该元素是否设置了 id。值为 -1 或者 > -1 的数值
      const hashIdx = sel.indexOf("#");

      // 查看 vnode 的 sel 是否有 .，即该元素是否有类名。值为 -1 或者 > -1 的数字
      const dotIdx = sel.indexOf(".", hashIdx);

      // 有 id 属性，返回 # 的索引位置，否则 返回 sel 字符串的长度
      const hash = hashIdx > 0 ? hashIdx : sel.length;

      // 是否有类名，有的话返回第一个 . 的索引，否则返回 sel 字符串的长度
      const dot = dotIdx > 0 ? dotIdx : sel.length;

      // 获取元素的标签
      const tag =         
        hashIdx !== -1 || dotIdx !== -1
          ? sel.slice(0, Math.min(hash, dot))
          : sel;
      
      // 给 elm 赋值，同时给 vnode.elm 赋值
      const elm = (vnode.elm =
        // 如果 data 存在且 data.ns 存在  data.ns 命名空间，一般是创建 svg
        isDef(data) && isDef((i = data.ns))
          ? api.createElementNS(i, tag, data)
          // 创建 tag 标签
          : api.createElement(tag, data));

      // 如果 hash 比 dot 小，说明 id 比 class 考前，或者 id 不存在且 class 肯定存在
      // 给 elm 设置 id 属性值，要么是 去掉 # 号的值，要么 是空字符串
      if (hash < dot) elm.setAttribute("id", sel.slice(hash + 1, dot));
      
      // 如果设置了类名
      if (dotIdx > 0)
      // 给元素设置 class 属性名，并将 . 替换成空格
        elm.setAttribute("class", sel.slice(dot + 1).replace(/\./g, " "));

      // 遍历 cbs 中存储的  create 钩子函数，并将 emptyNode, vnode 作为参数传递调用
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);

      // 如果 children 是数组
      // 创建 vnode 中的子节点，并追加到 DOM 树
      if (is.array(children)) {
        // 遍历 children
        for (i = 0; i < children.length; ++i) {
          // 缓存当前项
          const ch = children[i];
          // 如果当前项存在
          if (ch != null) {
            // 将当前项 递归调用，并将结果插入到 elm 节点中
            api.appendChild(elm, createElm(ch as VNode, insertedVnodeQueue));
          }
        }
      } else if (is.primitive(vnode.text)) {     // 如果 vnode.text 是 字符串或者数字
        // 将 文本节点插入到 当前元素 elm 中
        api.appendChild(elm, api.createTextNode(vnode.text));
      }

      // 获取 vnode.data 中传入的 hook
      const hook = vnode.data!.hook;

      // 如果 hook 存在
      if (isDef(hook)) {
        // 如果 hook 中存在 create 钩子函数，将 emptyNode 和 vnode 作为参数传入调用
        hook.create?.(emptyNode, vnode);
        // 如果 hook 中存在 insert 钩子函数
        if (hook.insert) {
          // 将 vnode push 进 新插入 VNode 节点队列中
          insertedVnodeQueue.push(vnode);
        }
      }
    } else {
      // 创建文本节点，并将 vnode.elm 赋值为该文本节点
      vnode.elm = api.createTextNode(vnode.text!);
    }

    // 返回 vnode.elm
    return vnode.elm;
  }

  /**
   * 
   * @param parentElm 父元素节点
   * @param before 
   * @param vnodes 
   * @param startIdx 开始节点索引
   * @param endIdx 结束节点索引
   * @param insertedVnodeQueue 新插入 VNode 节点队列
   */
  function addVnodes(
    parentElm: Node,
    before: Node | null,
    vnodes: VNode[],
    startIdx: number,
    endIdx: number,
    insertedVnodeQueue: VNodeQueue
  ) {
    // 循环遍历 vnodes
    // 如果 startIdx > endIdx 则退出循环
    for (; startIdx <= endIdx; ++startIdx) {
      // 缓存当前的 vnode
      const ch = vnodes[startIdx];
      // 如果当前 vnode 存在
      if (ch != null) {
        // createElm(ch, insertedVnodeQueue) ---> ch 的真实 dom 节点
        // 将 ch 插入到 parentElm 元素的 before 节点之前
        api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
      }
    }
  }

  function invokeDestroyHook(vnode: VNode) {
    // 获取用户传入的 data
    const data = vnode.data;
    // 判断 data 是否存在，如果不存在，则什么都不处理
    if (data !== undefined) {
      // 查看用户是否自定义了 destroy 钩子函数，如果自定义了钩子函数，则将当前 vnode 作为参数传入
      data?.hook?.destroy?.(vnode);

      // 循环遍历 cbs 对象中 destroy 钩子函数数组，依次调用 destroy 数组中的每一个 destroy 钩子函数
      for (let i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);

      // 查看 vnode 是否有子元素节点
      if (vnode.children !== undefined) {
        // 循环遍历子元素节点
        for (let j = 0; j < vnode.children.length; ++j) {
          // 缓存当前子节点
          const child = vnode.children[j];
          // 如果当前子节点存在，且不是 字符串
          if (child != null && typeof child !== "string") {
            // 递归调用 invokeDestroyHook，参数为 当前子节点
            invokeDestroyHook(child);
          }
        }
      }
    }
  }

  /**
   * 
   * @param parentElm 父元素节点
   * @param vnodes VNode 数组
   * @param startIdx 开始位置索引
   * @param endIdx 结束位置索引
   */
  function removeVnodes(
    parentElm: Node,
    vnodes: VNode[],
    startIdx: number,
    endIdx: number
  ): void {
    // 如果 startIdx 小于等于 endIdex，循环，直至 startIdx > endIdx
    // 循环遍历的 vnodes 数组
    for (; startIdx <= endIdx; ++startIdx) {

      let listeners: number;
      let rm: () => void;

      // 缓存 ch， 为当前要开始删除的 VNode
      const ch = vnodes[startIdx];
      // 如果 ch 存在
      if (ch != null) {
        // 判断 ch 是否是一个 元素节点
        // 是元素节点
        if (isDef(ch.sel)) {
          // 调用 invokeDestroyHook 函数处理 当前 VNode
          // 调用 destroy 钩子函数处理 ch 及 ch 的 children
          invokeDestroyHook(ch);
          // 给 listeners 赋值为当前钩子函数对象中remove钩子函数的 legnth + 1
          listeners = cbs.remove.length + 1;
          // 给 rm 函数赋值为 createRmCb，并传入 当前 vnode 对象的 elm，listeners
          // 返回一个函数，只有当 listeners === 0 的时候再执行删除操作
          rm = createRmCb(ch.elm!, listeners);

          // 循环遍历钩子函数对象中remove钩子函数，调用每一项 remove 钩子函数，传入 当前 vnode 和 rm 函数
          for (let i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);

          // 查看当前 vnode 对象的 data 中是否有用户传入的 remove 钩子函数
          const removeHook = ch?.data?.hook?.remove;
          // 如果用户用户传入了 remove 钩子函数，则调用用户传入的钩子函数
          if (isDef(removeHook)) {
            removeHook(ch, rm);
          } else {
            // 如果用户没传入，则直接调用 rm 函数
            rm();
          }
        } else {
          // Text node
          // 不是 VNode 对象，则为 文本节点。从父元素中删除该文本节点
          api.removeChild(parentElm, ch.elm!);
        }
      }
    }
  }

  /**
   * diff 算法的核心
   * 只比较同级别节点
   * @param parentElm 
   * @param oldCh 
   * @param newCh 
   * @param insertedVnodeQueue 
   */
  function updateChildren(
    parentElm: Node,
    oldCh: VNode[],
    newCh: VNode[],
    insertedVnodeQueue: VNodeQueue
  ) {
    
    // 新旧开始节点的索引都初始化为 0
    let oldStartIdx = 0;
    let newStartIdx = 0;

    // 旧结束节点索引
    let oldEndIdx = oldCh.length - 1;
    // 旧节点的开始节点
    let oldStartVnode = oldCh[0];
    // 旧节点的结束节点
    let oldEndVnode = oldCh[oldEndIdx];

    // 新结束节点的索引
    let newEndIdx = newCh.length - 1;
    // 新节点的开始节点
    let newStartVnode = newCh[0];
    // 新节点的结束节点
    let newEndVnode = newCh[newEndIdx];

    let oldKeyToIdx: KeyToIndexMap | undefined;

    let idxInOld: number;
    let elmToMove: VNode;

    let before: any;

    // 如果旧开始节点的索引小于旧结束节点的索引 且 新开始节点的索引小于新结束节点的索引
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      // 旧开始节点不存在
      if (oldStartVnode == null) {
        // 递增 oldStartIdx ，并将新值赋值给 oldStartVnode
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
      } else if (oldEndVnode == null) {
        // 旧结束节点不存在
        // 递减 oldEndIdx ，并从 oldCh 中获取旧结束节点
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (newStartVnode == null) {
        // 新开始节点不存在
        // 递增 newStartIdx 并从 newCh 中获取 新开始节点
        newStartVnode = newCh[++newStartIdx];
      } else if (newEndVnode == null) {
        // 旧结束节点不存在
        // 递减 newEndIdx 并从新节点中获取 新结束节点
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        // 如果 新开始节点和旧开始节点相同
        // 比较 旧开始节点和新开始节点
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        // 新旧节点的开始索引同时 +1
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        // 如果 旧结束节点和新结束节点相同
        // 表 旧结束节点和新结束节点
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        // 新旧节点的结束索引 -1
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        // Vnode moved right
        // 旧开始节点和新结束节点相同
        // 比较 旧开始节点和新结束节点
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        // 将 旧开始节点插入到旧结束节点之后
        api.insertBefore(
          parentElm,
          oldStartVnode.elm!,
          api.nextSibling(oldEndVnode.elm!)
        );
        // 旧开始索引 + 1，更新旧开始节点
        oldStartVnode = oldCh[++oldStartIdx];
        // 新结束索引 -1，更新新结束节点
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        // Vnode moved left
        // 旧结束节点和新开始节点相同
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        // 将 旧结束点击插入到旧开始节点之前
        api.insertBefore(parentElm, oldEndVnode.elm!, oldStartVnode.elm!);
        // 旧结束索引 -1，更新旧结束节点
        oldEndVnode = oldCh[--oldEndIdx];
        // 新开始节点索引 +1，更新 新开始节点
        newStartVnode = newCh[++newStartIdx];
      } else {
        // 第一次初始化
        if (oldKeyToIdx === undefined) {
          // 遍历 oldCh 中 oldStartIdx 到 oldEndIdx 直接的项
          // 并将这部分数组中 的 key 作为属性值，当前索引作为 value 存储起来，并赋值给 oldKeeyToIdx
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        }

        // 给 idxInOld 赋值，获取新开始节点，查看新开始节点的key在老节点中对应的索引
        idxInOld = oldKeyToIdx[newStartVnode.key as string];
        // 如果 idxInOld 不存在，说明当前 key 在老节点中没有，判定为新节点
        if (isUndef(idxInOld)) {
          // New element
          // 将此节点对应的 dom 插入到 旧开始节点之前
          api.insertBefore(
            parentElm,
            createElm(newStartVnode, insertedVnodeQueue),
            oldStartVnode.elm!
          );
        } else {
          // 新节点中的 key 在老节点中存在

          // 为 elmToMove 赋值为老节点中此 key 对应的索引的值
          elmToMove = oldCh[idxInOld];

          // 比较老节点中此 key 对应的值和新开始节点的 sel 是否相同
          // 不相同
          if (elmToMove.sel !== newStartVnode.sel) {
            // 将 新开始节点对应的 dom 插入到 旧开始节点 dom 之前
            api.insertBefore(
              parentElm,
              createElm(newStartVnode, insertedVnodeQueue),
              oldStartVnode.elm!
            );
          } else {
            // 比较 新开始节点和 key 在老节点中对应的值
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
            // 将 老节点中 此 key 对应的索引位置设置为 undefined
            oldCh[idxInOld] = undefined as any;
            // 将 老节点中此 key 对应的索引处的值插入到旧开始节点之前
            api.insertBefore(parentElm, elmToMove.elm!, oldStartVnode.elm!);
          }
        }
        // 新开始节点索引 +1，更新新开始节点
        newStartVnode = newCh[++newStartIdx];
      }
    }

    // 如果有一个数组没有被遍历完
    // 旧开始节点索引 <= 旧结束节点索引 或者 新开始节点索引 <= 新结束节点索引
    if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
      // 如果旧节点已经遍历完
      // 将剩余的新节点插入到旧节点中
      if (oldStartIdx > oldEndIdx) {
        // 如果 新结束节点索引 + 1 在新节点中存在，则 before 赋值为 新结束节点索引 + 1 的 真实 dom 元素
        before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
        // 将 新节点中，从新节点开始索引到新节点结束索引之间的 vnode 依次插入到 before 之前
        addVnodes(
          parentElm,
          before,
          newCh,
          newStartIdx,
          newEndIdx,
          insertedVnodeQueue
        );
      } else {
        // 新节点遍历完了旧节点依然有没完成
        // 将旧节点中 从旧开始节点到旧结束节点之间的元素移除
        removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
      }
    }
  }

  /**
   * 比较新旧 vnode，更新新 vnode.elm 对应的元素
   * @param oldVnode
   * @param vnode 
   * @param insertedVnodeQueue 
   * @returns 
   */
  function patchVnode(
    oldVnode: VNode,
    vnode: VNode,
    insertedVnodeQueue: VNodeQueue
  ) {

    // 缓存用户从 data 中传入的 hook
    const hook = vnode.data?.hook;
    // 如果 hook 传入了且有 prepatch 钩子函数，则调用 prepatch 钩子函数
    hook?.prepatch?.(oldVnode, vnode);

    // 缓存 elm, 为 vnode 的 elm 也重新赋值，为 oldVnode 中的 dom 元素
    const elm = (vnode.elm = oldVnode.elm)!;

    // 获取 oldVnode.children 中的 children
    const oldCh = oldVnode.children as VNode[];

    // 获取  vnode 的 children
    const ch = vnode.children as VNode[];

    // 如果 新旧节点相等，直接返回
    if (oldVnode === vnode) return;

    // 如果新 vnode 传入了 data
    if (vnode.data !== undefined) {
      // 遍历 钩子函数对象的 update 钩子函数队列
      for (let i = 0; i < cbs.update.length; ++i)
      // 执行每一个 update 钩子函数
        cbs.update[i](oldVnode, vnode);
      
      // 如果 vnode 的 data 中传入了 hook，且有 update 钩子函数，则调用
      vnode.data.hook?.update?.(oldVnode, vnode);
    }

    // 开始对比新旧节点
    // 如果 vnode.text 没有定义，则 vnode.children 应该存在
    if (isUndef(vnode.text)) {
      // 如果 oldVnode.children && vnode.children
      if (isDef(oldCh) && isDef(ch)) {
        // 如果 oldVnode.children 和 vnode.children 不相等
        // 调用 updateChildren
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
      } else if (isDef(ch)) {      // vnode.children 存在
        // 如果 oldVnode.text 存在，将 elm 的内容清空
        if (isDef(oldVnode.text)) api.setTextContent(elm, "");
        // 在 elm 下新增加节点，增加的节点是 vnode.children 的所有。即把 vnode.children 新增到 elm 下
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {    // oldVnode.children 存在
        // 移除 elm 下面的 oldVnode.children
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {     // oldVnode.text 存在
        // 将 elm 即 vnode.elm 的内容设置为 空字符串
        api.setTextContent(elm, "");
      }
    // 如果 oldVnode 和 vnode 的 text 不相同，
    } else if (oldVnode.text !== vnode.text) {
      // 如果 oldVnode 的 children 存在
      if (isDef(oldCh)) {
        // 移除 elm 的子元素 oldCh，从 0 到 oldCh.length - 1
        // 即移除 elm 中的元素
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      }
      // 设置 elm 的文本内容为 vnode.text
      api.setTextContent(elm, vnode.text!);
    }

    // 如果 hook 存在且有 postpatch 钩子函数，则调用
    hook?.postpatch?.(oldVnode, vnode);
  }
  
  return function patch(oldVnode: VNode | Element, vnode: VNode): VNode {

    let i: number, elm: Node, parent: Node;
    
    // 新插入 VNode 节点队列
    const insertedVnodeQueue: VNodeQueue = [];

    // 遍历 cbs 中 pre 钩子函数，并依次执行每一项 pre 钩子函数
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

    // 如果 oldVnode 不是 VNode，即传入的 oldVnode 是 DOM 元素
    if (!isVnode(oldVnode)) {
      // 使用 emptyNodeAt 函数初始化 oldVnode，将结果赋值给 oldVnode
      oldVnode = emptyNodeAt(oldVnode);
    }

    // 如果 oldVnode 和 vnode 是相同的 vnode
    if (sameVnode(oldVnode, vnode)) {
      // 使用 patchVnode 函数 比对 oldVnode 和 vnode
      patchVnode(oldVnode, vnode, insertedVnodeQueue);
    } else {
      // elm 为 oldVnode 中的 DOM 元素
      elm = oldVnode.elm!;
      // 缓存 elm 的父元素节点
      parent = api.parentNode(elm) as Node;

      // 创建 VNode 对用的 DOM 元素。如果元素节点，则根据创建的顺序 push 至 insertedVnodeQueue
      createElm(vnode, insertedVnodeQueue);

      // 如果 parent 存在
      if (parent !== null) {
        // 在 parent 中插入 vnode.elm 元素，插入到 elm 紧跟的节点之前。即 elm 的前一个节点就是 vnode.elm
        // 将 createElm 中创建的 vnode.elm 插入到 DOM 树中
        api.insertBefore(parent, vnode.elm!, api.nextSibling(elm));
        // TODO
        // 调用 removeVnodes 函数处理 parent 和 oldVnode
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }

    // 遍历 新插入 VNode 节点队列
    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      /**如果当前项的 data 存在，且有hook，并且设置了 insert 钩子函数，则调用 insert 钩子函数，并将当前项作为参数传入
      从 data 中获取，标识是用户传入*/
      // 调用 新创建节点队列中 的每一项 data 的 insert 钩子函数，并把当前 子节点传入
      insertedVnodeQueue[i].data!.hook!.insert!(insertedVnodeQueue[i]);
    }
    // 遍历 cbs 中 post 钩子函数，并依次执行
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
    return vnode;
  };
}
