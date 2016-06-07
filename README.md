#koa-jwt
koa中间件验证json web tokens模块，如果提供有效的tokens会设置在ctx.state.user(默认)，此模块可以让你在koa应用中使用json web tokens验证http请求。

使用
使用jwt授权中间件验证，如果token合法，设置在ctx.state.user中并解码供后续中间件控制流程。

恢复token
token通常保存在http header中，但它也可以通过cookie只设置opts.cookie中提供。自定义恢复token,也可以通过opts.getToken选项来完成。提供的功能应符合如果下：
/**
 * 自定义的token恢复
 * @this 传递到中间件的ctx对象
 * @param {object}  opts 中间件选项
 * @param {String|null} 如果找不到token或是空
 */
token的解析顺序如下。第一个非空token是被证实的。
opts.getToken
检查cookies(opts.cookie)
检查Authorization头的承载令牌

secret
通常提供opts.secret共享密钥，但在另一个较早的中间件中提供ctx.state.secret，如果此属性存在，它会替换opts.secret。

