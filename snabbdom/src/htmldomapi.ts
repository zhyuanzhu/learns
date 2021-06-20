export interface DOMAPI {
  createElement: (
    tagName: any,
    options?: ElementCreationOptions
  ) => HTMLElement;
  createElementNS: (
    namespaceURI: string,
    qualifiedName: string,
    options?: ElementCreationOptions
  ) => Element;
  createTextNode: (text: string) => Text;
  createComment: (text: string) => Comment;
  insertBefore: (
    parentNode: Node,
    newNode: Node,
    referenceNode: Node | null
  ) => void;
  removeChild: (node: Node, child: Node) => void;
  appendChild: (node: Node, child: Node) => void;
  parentNode: (node: Node) => Node | null;
  nextSibling: (node: Node) => Node | null;
  tagName: (elm: Element) => string;
  setTextContent: (node: Node, text: string | null) => void;
  getTextContent: (node: Node) => string | null;
  isElement: (node: Node) => node is Element;
  isText: (node: Node) => node is Text;
  isComment: (node: Node) => node is Comment;
}

function createElement(
  tagName: any,
  options?: ElementCreationOptions
): HTMLElement {
  return document.createElement(tagName, options);
}

// 创建一个具有指定的命名空间URI和限定名称的元素；svg, xml ???

function createElementNS(
  namespaceURI: string,
  qualifiedName: string,
  options?: ElementCreationOptions
): Element {
  return document.createElementNS(namespaceURI, qualifiedName, options);
}

// 创建内容为 text 的文本节点
function createTextNode(text: string): Text {
  return document.createTextNode(text);
}

// 创建内容为 text 的注释节点
function createComment(text: string): Comment {
  return document.createComment(text);
}

// 往 parentNode 中插入 newNode 节点，插入位置在 parentNode 的子节点 referenceNode 之前
function insertBefore(
  parentNode: Node,
  newNode: Node,
  referenceNode: Node | null
): void {
  parentNode.insertBefore(newNode, referenceNode);
}

function removeChild(node: Node, child: Node): void {
  node.removeChild(child);
}

// 将 child 插入 node 的最后一个子节点后
function appendChild(node: Node, child: Node): void {
  node.appendChild(child);
}

// 获取当前元素的 parentNode
function parentNode(node: Node): Node | null {
  return node.parentNode;
}

// 获取 node 节点后紧跟的节点
function nextSibling(node: Node): Node | null {
  return node.nextSibling;
}

// 获取当前元素的标签名
function tagName(elm: Element): string {
  return elm.tagName;
}

function setTextContent(node: Node, text: string | null): void {
  node.textContent = text;
}

function getTextContent(node: Node): string | null {
  return node.textContent;
}

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

function isText(node: Node): node is Text {
  return node.nodeType === 3;
}

function isComment(node: Node): node is Comment {
  return node.nodeType === 8;
}

export const htmlDomApi: DOMAPI = {
  createElement,
  createElementNS,
  createTextNode,
  createComment,
  insertBefore,
  removeChild,
  appendChild,
  parentNode,
  nextSibling,
  tagName,
  setTextContent,
  getTextContent,
  isElement,
  isText,
  isComment,
};
