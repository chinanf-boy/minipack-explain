// 
// 模块捆绑器 将 小块代码 编译成 更大和更复杂的代码,可以运行在Web浏览器中. 

// 这些小块只是JavaScript文件以及它们之间的依赖关系,而这正是由模块系统表示
// https://webpack.js.org/concepts/modules

// 模块捆绑器具有 入口文件 的这种概念,而不是添加一些
// 脚本标签在浏览器中并让它们运行,我们让 捆绑器 知道
// 哪个文件 是我们应用程序的 主要文件. 这些文件能引导
// 我们的整个应用程序. 

// 我们的打包程序将从该 入口文件 开始,并尝试理解
// 它依赖于哪些文件. 然后,它会尝试了解哪些文件
// 依赖关系取决于它,它会继续这样做,直到它发现
// 我们应用程序中的 每个模块,以及它们如何 相互依赖. 

// 这种对项目的理解被称为`依赖图`.

// 在这个例子中,我们将创建一个 依赖关系图 并将其用于打包
// 它的所有模块都捆绑在一起. 

// 让我们开始 : ) 

// >请注意: 这是一个非常简化的例子
// 对这些例子仅仅执行一次循环依赖,缓存模块导出和解析每个模块
// 其他方面的处理都跳过,使这个例子尽可能简单. 

const fs = require('fs');
const path = require('path');
const babylon = require('babylon');
const traverse = require('babel-traverse').default;
const {transformFromAst} = require('babel-core');

let ID = 0;

// 我们首先创建一个函数,该函数将接受 文件路径 ,读取内容并提取它的依赖关系. 

function createAsset(filename) {
    // 以字符串形式读取文件的内容. 
  const content = fs.readFileSync(filename, 'utf-8');

//   现在我们试图找出这个文件依赖于哪个文件. 我们可以通过查看其内容

//   来获取  `import` 字符串. 然而,这是一个非常笨重的方法,所以我们将使用JavaScript解析器. 
  
//   JavaScript解析器是可以读取和理解JavaScript代码的工具. 
  
//   它们生成一个更抽象的模型,称为`ast (抽象语法树)`.

//   我强烈建议你看看[`ast explorer`](https://astexplorer.net) 看看 `ast` 是如何的
  
//   `ast`包含很多关于我们代码的信息. 我们可以查询它了解我们的代码正在尝试做什么. 
  const ast = babylon.parse(content, {
    sourceType: 'module',
  });

// 这个数组将保存这个模块依赖的模块的相对路径.
  const dependencies = [];

//   我们遍历`ast`来试着理解这个模块依赖哪些模块. 
//   要做到这一点,我们检查`ast`中的每个 `import` 声明. ❤️
  traverse(ast, {
// `Ecmascript`模块相当简单,因为它们是静态的. 这意味着你不能`import`一个变量,
// 或者有条件地`import`另一个模块. 
// 每次我们看到`import`声明时,我们都可以将其数值视为`依赖性`.
    ImportDeclaration: ({node}) => {
      
        // 我们将依赖关系数组推入我们导入的值. ⬅️
        dependencies.push(node.source.value);
    },
  });

//   我们还通过递增简单计数器为此模块分配唯一标识符. 
  const id = ID++;

//   我们使用`Ecmascript`模块和其他JavaScript功能,可能不支持所有浏览器. 
//   为了确保`我们的bundle`在所有浏览器中运行,
//   我们将使用[babel](https://babeljs.io)来传输它

// 该`presets`选项是一组规则,告诉`babel`如何传输我们的代码. 
// 我们用`babel-preset-env``将我们的代码转换为浏览器可以运行的东西. 
  const {code} = transformFromAst(ast, null, {
    presets: ['env'],
  });

  // 返回有关此模块的所有信息.
  return {
    id,
    filename,
    dependencies,
    code,
  };
}

// 现在我们可以提取单个模块的依赖关系,我们将通过提取`入口文件{entry}`的依赖关系来解决问题. 
// 那么,我们将提取它的每一个依赖关系的依赖关系. 循环下去
// 直到我们了解应用程序中的每个模块以及它们如何相互依赖. 这个项目的理解被称为`依赖图`.
function createGraph(entry) {
  // 首先解析整个文件.
  const mainAsset = createAsset(entry);

//   我们将使用`队列{queue}`来解析每个`资产{asset}`的依赖关系. 
//   我们正在定义一个只有 入口资产{entry asset} 的数组.
  const queue = [mainAsset];

// 我们使用一个`for ... of`循环遍历 队列. 
// 最初 这个队列 只有一个 资产,但是当我们迭代它时,我们会将额外的 新资产 推入 队列 中. 
// 这个循环将在 队列 为空时终止. 
  for (const asset of queue) {
    // 我们的每一个 资产 都有它所依赖模块的相对路径列表. 
    // 我们将重复它们,用我们的`createAsset() `函数解析它们,并跟踪此模块在此对象中的依赖关系.
    asset.mapping = {};

    // 这是这个模块所在的目录. 
    const dirname = path.dirname(asset.filename);

    // 我们遍历其相关路径的列表
    asset.dependencies.forEach(relativePath => {
    // 我们的`createAsset()`函数需要一个绝对文件名. 
    // 但是该依赖关系数组是保存了相对路径的数组. 
    // 这些路径是相对于导入他们的文件. 
    // 我们可以通过将相对路径与父资源目录的路径连接,将相对路径转变为绝对路径.
      const absolutePath = path.join(dirname, relativePath);

      // 解析资产,读取其内容并提取其依赖关系.
      const child = createAsset(absolutePath);

    //   了解`asset`依赖取决于`child`这一点对我们来说很重要. 
    //   通过给`asset.mapping`对象增加一个新的属性(值为child.id)来表达这种一一对应的关系.
      asset.mapping[relativePath] = child.id;

      // 最后,我们将`child`这个资产推入队列,这样它的依赖关系也将被迭代和解析.
      queue.push(child);
    });
  }

//   到这一步,队列 就是一个包含目标应用中 每个模块 的数组: 
//   这就是我们的表示图.
  return queue;
}

// 接下来,我们定义一个函数,它将使用我们的`graph`并返回一个可以在浏览器中运行的包. 

// 我们的包将只有一个自我调用函数:  

// `(function() {})()`

// 该函数将只接收一个参数: 一个包含`graph`中每个模块信息的对象. 
function bundle(graph) {
  let modules = '';

// 在我们到达该函数的主体之前,我们将构建一个作为该函数的参数的对象. 
// 请注意,我们构建的这个字符串被两个花括号 ({}) 包裹,因此对于每个模块,
// 我们添加一个这种格式的字符串: `key: value,`.
  graph.forEach(mod => {
    //  图表中的每个模块在这个对象中都有一个`entry`. 我们使用`模块的id`作为`key`和一个数组作为`value` (用数组因为我们在每个模块中有2个值) . 

    // 第一个值是用函数包装的每个模块的代码. 这是因为模块应该被 限定范围: 在一个模块中定义变量不会影响 其他模块 或 全局范围. 
    
    // 我们的模块在我们将它们`转换{被 babel 转译}`后, 使用`commonjs`模块系统: 他们期望一个`require`, 一个`module`和`exports`对象可用. 那些在浏览器中通常不可用,所以我们将它们实现并将它们注入到函数包装中. 
    
    // 对于第二个值,我们用`stringify`解析模块及其依赖之间的关系(也就是上文的asset.mapping). 解析后的对象看起来像这样: `{'./relative/path': 1}`. 
    
    // 这是因为我们模块的被转换后会通过相对路径来调用`require()`. 当调用这个函数时,我们应该能够知道依赖图中的哪个模块对应于该模块的相对路径. 
    modules += `${mod.id}: [
      function (require, module, exports) { ${mod.code} },
      ${JSON.stringify(mod.mapping)},
    ],`;
  });

//   最后,我们实现自调函数的主体. 

//   我们首先创建一个`require()`⏰函数: 它接受一个 `模块ID` 并在我们之前构建的`模块`对象查找它. 

//   通过解构`const [fn, mapping] = modules[id]`来获得我们的包装函数 和`mappings`对象. 
  
//   我们模块的代码通过相对路径而不是模块ID调用`require()`. 

// 但我们的`require`🌟函数接收 `模块ID`. 另外,两个模块可能`require()`相同的相对路径,但意味着两个不同的模块. 

//     要处理这个问题,当需要一个模块时,我们创建一个新的,专用的`require`函数供它使用. 

// 它将是特定的,并将知道通过使用`模块的mapping对象`将 `其相对路径` 转换为`ID`. 

// 该mapping对象恰好是该特定模块的`相对路径和模块ID`之间的映射. 

// 最后,使用`commonjs`,当模块需要被导出时,它可以通过改变exports对象来暴露模块的值. 
// require函数最后会返回exports对象.
  const result = `
    (function(modules) {
      function require(id) { //🌟
        const [fn, mapping] = modules[id];

        function localRequire(name) { //⏰
          return require(mapping[name]); //🌟
        }

        const module = { exports : {} };

        fn(localRequire, module, module.exports); 

        return module.exports;
      }

      require(0);
    })({${modules}})
  `;

//   我们只需返回结果,欢呼!:)
  return result;
}

const graph = createGraph('./example/entry.js');
const result = bundle(graph);

console.log(result);
