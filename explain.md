# minipack [![explain](http://llever.com/explain.svg)](https://github.com/chinanf-boy/Source-Explain)

「 用JavaScript编写的`现代模块捆绑器{modern module bundler}`的简化示例 」

Explanation

> "version": "1.0.0"

[github source](https://github.com/ronami/minipack)

[中文](./readme.md) | [english](https://github.com/ronami/minipack)

---

介绍

作为前端开发人员，我们花费大量时间处理`Webpack`，`Browserify`和`Parcel`等工具。

了解这些工具的工作方式可以帮助我们更好地决定编写代码的方式。通过理解我们的代码如何变成一个包以及该包的外观如何，我们也可以更好地进行调试。

这个项目的目的是解释大多数`捆绑商{bundlers}`如何在隐藏的条件下工作。它包含一个简化但仍然相当准确的捆绑器的简短实现。随着代码，有评论解释代码试图实现什么。

> 我习惯把代码搬上台面

---

本目录

- [模块捆绑器是什么](#模块捆绑器)
- [本项目解释了什么](#做了什么)
- [2. createGraph](#createGraph)
- [1. createAsset](#createAsset)
- [3. bundle](#bundle)
- [完](#done)
- [use link](#use-link)

---

好点, 让我们从运行开始

```
npm i
```

```
node src/minipack.js
```
<details>

<summary>
第一眼, 乱糟糟的结果 -🖐️
</summary>

``` js
(function(modules) {
      function require(id) {
        const [fn, mapping] = modules[id];

        function localRequire(name) {
          return require(mapping[name]);
        }

        const module = { exports : {} };

        fn(localRequire, module, module.exports);

        return module.exports;
      }

      require(0);
    })({0: [
      function (require, module, exports) { "use strict";

var _message = require("./message.js");

var _message2 = _interopRequireDefault(_message);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

console.log(_message2.default); },
      {"./message.js":1},
    ],1: [
      function (require, module, exports) { "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _name = require("./name.js");

exports.default = "hello " + _name.name + "!"; },
      {"./name.js":2},
    ],2: [
      function (require, module, exports) { "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var name = exports.name = 'world'; },
      {},
    ],})
```

> 好乱啊, 一步一步来吧

</details>

### 模块捆绑器

> 是什么❓ 

模块捆绑器 将 小块代码 编译成 更大和更复杂的代码,可以运行在Web浏览器中. 

这些小块只是JavaScript文件以及它们之间的依赖关系,而这正是由模块系统表示
https://webpack.js.org/concepts/modules

模块捆绑器具有 入口文件 的这种概念,而不是添加一些
脚本标签在浏览器中并让它们运行,我们让 捆绑器 知道
哪个文件 是我们应用程序的 主要文件. 这是`应该的文件`
引导我们的整个应用程序. 

我们的打包程序将从该 入口文件 开始,并尝试理解
它依赖于哪些文件. 然后,它会尝试了解哪些文件
依赖关系取决于它,它会继续这样做,直到它发现
我们应用程序中的 每个模块,以及它们如何 相互依赖. 

这种对项目的理解被称为`依赖图`.

在这个例子中,我们将创建一个 依赖关系图 并将其用于打包
它的所有模块都捆绑在一起. 

让我们开始 : ) 

>请注意: 这是一个非常简化的例子
循环依赖,缓存模块导出,仅解析每个模块一次
和其他人跳过,使这个例子尽可能简单. 

``` js
// minipack.js 导入与全局变量
const fs = require('fs');
const path = require('path');
const babylon = require('babylon');
const traverse = require('babel-traverse').default;
const {transformFromAst} = require('babel-core');

let ID = 0;
```

- [导入](#use-link)

> 来自 `minipack.js`#L1-35

---

### 做了什么

放开函数的定义, 来到运行的部分

``` js
// minipack.js
const graph = createGraph('./example/entry.js'); 🧠
const result = bundle(graph);

console.log(result);
```

我们把 `./example/entry.js` 路径带入了

``` js
// entry.js
import message from './message.js';

console.log(message);
```

### createGraph

> __2.__ 从 入口文件开始, 遍历 整座依赖图

> `const graph = createGraph('./example/entry.js');` 🧠

我们需要可以提取单个模块的依赖关系,我们将通过提取`入口文件{entry}`的依赖关系来解决问题. 

那么,我们将提取它的每一个依赖关系的依赖关系. 循环下去

直到我们了解应用程序中的每个模块以及它们如何相互依赖. 这个项目的理解被称为`依赖图`. 

``` js
function createGraph(entry) {
```

首先解析整个文件. 

``` js
  const mainAsset = createAsset(entry);
```

- [createAsset 请先看这个](#createasset)

我们将使用`队列{queue}`来解析每个`资产{asset}`的依赖关系. 我们正在定义一个只有 入口资产 的数组. 

``` js
  const queue = [mainAsset];
```

我们使用一个`for ... of`循环遍历 队列. 最初 这个队列 只有一个 资产,但是当我们迭代它时,我们会将额外的 新资产 推入 队列 中. 这个循环将在 队列 为空时终止. 

``` js
  for (const asset of queue) {
```

我们的每一个 资产 都有它所依赖模块的相对路径列表. 我们将重复它们,用我们的`createasset() `函数解析它们,并跟踪此模块在此对象中的依赖关系. 

``` js
    asset.mapping = {};
```

这是这个模块所在的目录. 

``` js
    const dirname = path.dirname(asset.filename);
```
我们遍历其相关路径的列表. 

``` js
    asset.dependencies.forEach(relativePath => {
```

我们的`createasset()`函数需要一个绝对文件名. 该依赖性数组是相对路径的数组. 这些路径与导入它们的文件相关. 我们可以通过将相对路径与父资源目录的路径连接,将相对路径转变为绝对路径. 

``` js
      const absolutePath = path.join(dirname, relativePath);
```
解析资产,读取其内容并提取其依赖关系. 

``` js
      const child = createAsset(absolutePath);
```

这对我们来说很重要, 知道`asset`依赖于取决于`child`. 通过增加一个新的属性来表达这种关系`mapping`带有`child`-`id`的对象. 

``` js
      asset.mapping[relativePath] = child.id;
```
最后,我们将`child asset`推入队列,这样它的依赖关系也将被迭代和解析. 

``` js
      queue.push(child);
      });
  }
```
在这一点上,队列 就是一个包含目标应用中 每个模块 的数组: 这就是我们的表示图. 

``` js
  return queue;
```

- [ 应用依赖图 到 bundle](#bundle)

<details>

<summary>
完整函数 createGraph
</summary>

``` js
function createGraph(entry) {

  const mainAsset = createAsset(entry);

  const queue = [mainAsset];

  for (const asset of queue) {

    asset.mapping = {};

    const dirname = path.dirname(asset.filename);

    asset.dependencies.forEach(relativePath => {

      const absolutePath = path.join(dirname, relativePath);

      const child = createAsset(absolutePath);

      asset.mapping[relativePath] = child.id;

      queue.push(child);
    });
  }
  return queue;
}
```

</details>

---

### createAsset

> __1.__ 单个文件的 解析, 和依赖结构返回

我们首先创建一个函数,该函数将接受 文件路径 ,读取内容并提取其相关性. 

``` js
function createAsset(filename) {
```

以字符串形式读取文件的内容. 
``` js
  const content = fs.readFileSync(filename, 'utf-8');
```

现在我们试图找出这个文件依赖于哪个文件. 我们可以通过查看其内容

来获取  `import` 字符串. 然而,这是一个非常笨重的方法,所以我们将使用JavaScript解析器. 

JavaScript解析器是可以读取和理解JavaScript代码的工具. 

它们生成一个更抽象的模型,称为`ast (抽象语法树)`.


我强烈建议你看看[`ast explorer`](https://astexplorer.net) 看看 `ast` 是如何的

`ast`包含很多关于我们代码的信息. 我们可以查询它了解我们的代码正在尝试做什么. 

``` js
  const ast = babylon.parse(content, {
    sourceType: 'module',
  });
```

- [babylon js 解析器](#use-link)

这个数组将保存这个模块依赖的模块的相对路径.

``` js
 const dependencies = [];
```

我们遍历`ast`来试着理解这个模块依赖哪些模块. 要做到这一点,我们检查`ast`中的每个 `import` 声明. ❤️

`Ecmascript`模块相当简单,因为它们是静态的. 这意味着你不能`import`一个变量,或者有条件地`import`另一个模块. 

每次我们看到`import`声明时,我们都可以将其数值视为`依赖性`. 

我们将依赖关系数组推入我们导入的值. ⬅️

``` js
// ❤️
  traverse(ast, {
    ImportDeclaration: ({node}) => {
      dependencies.push(node.source.value); ⬅️
      // entry.js 中
      // import message from './message.js';
      // node.source.value === './message.js'
    },
  });
```
 

我们还通过递增简单计数器为此模块分配唯一标识符. 

``` js
  const id = ID++;
```

我们使用`Ecmascript`模块和其他JavaScript功能,可能不支持所有浏览器. 为了确保`我们的bundle`在所有浏览器中运行,我们将使用[babel](https://babeljs.io)来传输它

该`presets`选项是一组规则,告诉`babel`如何传输我们的代码. 我们用`babel-preset-env``将我们的代码转换为浏览器可以运行的东西. 

``` js
  const {code} = transformFromAst(ast, null, {
    presets: ['env'],
  });
```

返回有关此模块的所有信息. 

``` js
  return {
    id, // 唯一id
    filename, // 文件名字
    dependencies, // import 的文件路劲
    code, // 转换的代码
  };
}
```

<details>

<summary>
完整函数 createAsset
</summary>

``` js

function createAsset(filename) {

  const content = fs.readFileSync(filename, 'utf-8');

  const ast = babylon.parse(content, {
    sourceType: 'module',
  });

  const dependencies = [];

  traverse(ast, {

    ImportDeclaration: ({node}) => {
      
      dependencies.push(node.source.value);
    },
  });

  const id = ID++;

  const {code} = transformFromAst(ast, null, {
    presets: ['env'],
  });

  return {
    id,
    filename,
    dependencies,
    code,
  };
}
```
</details>


### [回到 createGraph](#creategraph)

---

### bundle

> __3.__ 整顿依赖图, 返回结果

接下来,我们定义一个函数,它将使用我们的`graph`并返回一个可以在浏览器中运行的包. 

我们的软件包将只有一个自我调用函数:  

`(function() {})()`

该函数将只接收一个参数: 一个包含`graph`中每个模块信息的对象. 

``` js
function bundle(graph) {
  let modules = '';
```

在我们到达该函数的主体之前,我们将构建我们将要提供它的对象. 请注意,我们构建的这个字符串被两个花括号 ({}) 包裹,因此对于每个模块,我们添加一个这种格式的字符串: `key: value,`. 

``` js
  graph.forEach(mod => {
```
图表中的每个模块在这个对象中都有一个`entry`. 我们使用`模块的id`作为`key`和`value`的数组 (我们在每个模块中有2个值) . 

第一个值是用函数包装的每个模块的代码. 这是因为模块应该被 限定范围: 在一个模块中定义变量不会影响 其他模块 或 全局范围. 

我们的模块在我们将它们转换后,使用`commonjs`模块系统: 他们期望一个`require`, 一个`module`和`exports`对象可用. 那些在浏览器中通常不可用,所以我们将它们实现并将它们注入到函数包装中. 

对于第二个值,我们将模块及其依赖关系之间的映射串联起来. 这是一个看起来像这样的对象: `{'./relative/path': 1}`. 

这是因为我们模块的`传输代码{被 babel 转译}`已经调用`require()`与相对路径. 当调用这个函数时,我们应该能够知道图中的哪个模块对应于该模块的相对路径. 

<details>

``` js
// entry.js
import message from './message.js';

console.log(message);
```

被 babel 转译 变成

``` js
 "use strict";

var _message = require("./message.js");

var _message2 = _interopRequireDefault(_message);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

console.log(_message2.default); 
```

</details>

``` js
modules += `${mod.id}: [
      function (require, module, exports) { ${mod.code} },
      ${JSON.stringify(mod.mapping)},
    ],`;
  });
```

最后,我们实现自调函数的主体. 

我们首先创建一个`require()`⏰函数: 它接受一个 `模块ID` 并在其中查找它`模块`我们之前构建的对象. 通过解构`const [fn, mapping] = modules[id]`来获得我们的函数包装器 和`mappings`对象. 

我们模块的代码已经调用`require()`用相对文件路径而不是模块ID. 我们的`require`🌟函数需要 `模块ID`. 另外,两个模块可能`require()`相同的相对路径,但意味着两个不同的模块. 

<details>

``` js
// 模块转译并
// 1. 捆绑器内部请求
var _message = require("./message.js"); // ⏰

// 2. 参数带入捆绑
localRequire == require
fn(localRequire, module, module.exports);

// 3. 捆绑内部请求 路径 转换 为 id 
function localRequire(name) {
  return require(mapping[name]); // require(id) 🌟
}
// 4. 实际 
// “./message.js" === 1
return require(1); // require(id)

// 5. 从内部找到并运行 
// function require(id) { 
//   const [fn, mapping] = modules[id];

//   function localRequire(name) {
//     return require(mapping[name]);
//   }

//   const module = { exports : {} };

//   fn(localRequire, module, module.exports);

//   return module.exports;
// } 

```

</details>

-

要处理这个问题,当需要一个模块时,我们创建一个新的,专用的`require`函数供它使用. 它将是特定的,并将知道通过使用`模块的映射对象`将 `其相对路径` 转换为
`ID`. 

该映射 恰好是该特定模块的`相对路径和模块ID`之间的映射. 

最后,使用`commonjs`,当需要模块时,它可以通过改变它的值来暴露值`exports`目的. `exports`对象在被模块代码改变之后,将被返回`require()`功能. 

``` js
  const result = `
    (function(modules) {
      function require(id) { 
        const [fn, mapping] = modules[id];

        function localRequire(name) { // ⏰
          return require(mapping[name]);
        }

        const module = { exports : {} };

        fn(localRequire, module, module.exports);

        return module.exports;
      }

      require(0); // 🌟
    })({${modules}})
  `;
```

我们只需返回结果,欢呼!:)

``` js
  return result;

```

<details>

<summary>
完整函数 bundle
</summary>

``` js
function bundle(graph) {
  let modules = '';

  graph.forEach(mod => {

        modules += `${mod.id}: [
    function (require, module, exports) { ${mod.code} },
    ${JSON.stringify(mod.mapping)},

  ],`;
    });

  const result = `
  (function(modules) {
    function require(id) {
      const [fn, mapping] = modules[id];

      function localRequire(name) {
        return require(mapping[name]);
      }

      const module = { exports : {} };

      fn(localRequire, module, module.exports);

      return module.exports;
    }

    require(0);
  })({${modules}})
`;
    
  return result;
}

```

</details>

### Done

让我们, 重新看一下吧

你可以将, 示例项目中 `minipack/exmaples.js` 加加减减

``` js
(function(modules) {
      function require(id) {
        const [fn, mapping] = modules[id];

        function localRequire(name) {
          return require(mapping[name]);
        }

        const module = { exports : {} };

        fn(localRequire, module, module.exports);

        return module.exports;
      }

      require(0);
    })({0: [
      function (require, module, exports) { "use strict";

var _message = require("./message.js");

var _message2 = _interopRequireDefault(_message);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

console.log(_message2.default); },
      {"./message.js":1},
    ],1: [
      function (require, module, exports) { "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _name = require("./name.js");

exports.default = "hello " + _name.name + "!"; },
      {"./name.js":2},
    ],2: [
      function (require, module, exports) { "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var name = exports.name = 'world'; },
      {},
    ],})
```


---

### use link

- [AST Explorer](https://astexplorer.net)
- [Babel REPL](https://babeljs.io/repl)
- [Babylon](https://github.com/babel/babel/tree/master/packages/babel-parser)
- [Babel Plugin Handbook](https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md)
- [Webpack: dependency managment](https://webpack.js.org/guides/dependency-management)
