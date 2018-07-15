
## 📦minipack  [![explain]][source] [![translate-svg]][translate-list]

[explain]: http://llever.com/explain.svg
[source]: https://github.com/chinanf-boy/Source-Explain
[translate-svg]: http://llever.com/translate.svg
[translate-list]: https://github.com/chinanf-boy/chinese-translate-list

 用javascript编写的现代模块打包器的简化示例 
 
 这是一篇 `翻译{Translations}`

 [github source](https://github.com/ronami/minipack)

### 介绍

作为前端开发人员,我们花费大量时间处理类似的工具像 [WebPack](https://github.com/webpack/webpack),[Browserify](https://github.com/browserify/browserify), 和[Parcel](https://github.com/parcel-bundler/parcel). 

了解这些工具的工作方式可以帮助我们更好地决定如何编写代码. 通过理解我们的代码如何转化为一个包以及该包的外观如何,我们也可以更好地进行调试. 

这个项目的目的是解释大多数捆绑商如何在隐藏条件下工作. 它包含简化但仍然合理准确的捆绑器的简短实现. 与代码一起,有评论解释代码试图实现什么. 

### 尝试运行代码

首先安装依赖关系: 

```sh
$ npm install
```

然后运行我们的脚本: 

```sh
$ node src/minipack.js
```

### 酷啊,我从哪里开始? 

> 两种方式

1. 前往源代码: [src/minipack.js](src/minipack.js). 

2. 将代码注释, 拿出来解释[explain.md](./explain.md)

### 额外的链接

- [AST Explorer](https://astexplorer.net)
- [Babel REPL](https://babeljs.io/repl)
- [Babylon](https://github.com/babel/babel/tree/master/packages/babel-parser)
-   [Babel 插件手册](https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md)
-   [webpack: 依赖管理](https://webpack.js.org/guides/dependency-management)
