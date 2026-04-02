---
tags: []
---
# 基本使用方法
创建Store
```JavaScript
export const useCatStore = create((set, get, api) => ({
    name: 'Garfiled',
    children: [],
    addChildren: (child) => set(state => ({children: [...state.children, child]})),
}))
```

获取State变量
```Javascript
import {useCatStore} from './store';

const Component = () => {
    const children = useCatStore((state) => state.children);
};
```
# 原理
![[zustand原理流程图.svg]]

### 通知数据变化
每次更新数据，都使用zustand的`setState`方法；该方法，会先更新store的state，然后执行该store中的所有订阅的回调函数
相关代码：[https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts#L66](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts#L66)﻿

### 数据变化触发渲染
使用`React.useSyncExternalStore`方法，使得store内特定内容的变化，可以触发react组件的重新渲染
- react获得内容变化通知：基于第一个参数subsribe函数，将react的内部处理函数`callbackA`注册到外部订阅系统（zustand）中
- 判断内容发生变化：基于第二个参数getSnapShot函数，获取特定字段的内容，并判断是否重新渲染（getSnapShot函数会被`callbackA`调用）
> react相关文档：[https://react.dev/reference/react/useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)﻿
> 相关代码：[https://github.com/pmndrs/zustand/blob/main/src/react.ts#L30](https://github.com/pmndrs/zustand/blob/main/src/react.ts#L30)﻿

### 只有特定字段发生变化，才重新渲染
在用户读取state变量的某些字段时，需向store传入一个回调函数，该函数接收state作为参数，返回内容由用户自定义：
```Javascript
import {useCatStore} from './store';

const Component = () => {
    const children = useCatStore((state) => state.children);
};
```

第四行的操作，将会注册一个订阅回调函数，并且使用`(state) => state.children`函数，来获取目标state。
如果一次state变化中，目标state字段没有发生变化（该例子中为children），该组件就不会重新渲染
如果返回的是多个字段的组成的对象，普通情况下，每次发生变化，就会触发重新渲染
```Javascript
import {useCatStore} from './store';

const Component = () => {
    const obj = useCatStore((state) => {
        state.children,
        state.name
    });
};

```

因为返回的都是全新的对象。
可以借助`shallow`或`useShallow`，实现对象的浅层比较，避免不必要的渲染

> 相关代码：
> - ﻿[https://github.com/pmndrs/zustand/blob/main/src/react.ts#L32](https://github.com/pmndrs/zustand/blob/main/src/react.ts#L32)﻿
> - ﻿[https://github.com/pmndrs/zustand/blob/main/src/react.ts#L56](https://github.com/pmndrs/zustand/blob/main/src/react.ts#L56)﻿
### 深层对象修改
TODO
