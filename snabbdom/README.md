# snabbdom 源码学习

## 项目说明

- h 函数 创建一个 VNode。利用 ts 函数重载对参数的差异性做处理，最后调用 vnode 函数

- vnode 函数用来真正创建一个 VNode 对象
```js
  const VNode = {
    sel: '标识 标签tag + 处理后的id + 处理后的classNames',
    data: '传入的数据',
    children: '子元素节点',
    elm: '当前 VNode 对象转换成的 DOM 元素',
    text: '文本节点内容， 与 children 互斥',
    key: '数字或者字符串，由 data 传入'
  }

```

- init 方法，最终返回 patch 函数

- patch 函数用来比较对比处理 oldVnode 和 vnode，最终返回更新后的 vnode