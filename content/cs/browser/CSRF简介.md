---
tags:
  - "#public"
---
# 1. 背景
在没有引入SameSite Cookie机制前，浏览器是如何决定一个请求，携带哪些Cookie的呢？

浏览器主要判断以下三个条件是否满足，来决定是否携带cookie：
- domain：子域名下的请求，可以使用父域名的cookie。例如`.example.baidu.com`的请求，会携带`.baidu.com`的cookie（如果下面两个条件也满足）
- path：url path是否匹配
- secure：是否仅限https请求

只要满足上述三个条件，**任何页面**都可以发起针对目标接口的请求，并且携带用户cookie。这样恶意网站可以借助用户cookie，绕过鉴权过程，实现只有认证过的用户，才能执行的操作，给用户带来损失。


### 例子
用户在`baidu.com` 页面完成了登录，其登录cookie配置为：
- domain=baidu.com
- path=/
意味着任何百度子域名的请求，都会携带用户的登录cookie

之后，用户通过网页搜索，无意中访问了恶意网站`evil.com`，该网站发起如下接口请求：
```JavaScript
fetch('https://follow.baidu.com/followAuthor?authorId=123');
```
假设这个接口请求是让当前用户关注`evil.com`指定的用户`123`，且该接口只依赖用户登录cookie

因为用户已经登录了baidu，并且该接口请求的域名是`baidu.com`的子域名，路径也满足cookie的要求，故本次请求，会带上用户的登录cookie；这会让本次接口请求成功，从而让受攻击用户在未知情况下，关注其他人。这就是Cross Site Request Forgery（CORS）攻击的一个例子

![[CSRF攻击示意图.svg]]

# 2. 预防CSRF
## 2.1 Server判断来源
##### Origin字段
Server读取Origin字段，判断请求来源是否是受支持的可信任网站。对于白名单外的网站，不响应
但是以下两种情况，接口请求不会携带Origin字段[^1]：
-  IE 11 不会在跨站CORS请求上添加Origin标头
- 在302重定向之后Origin不包含在重定向的请求中
##### Referer字段
同Origin字段，Server读取Referer字段来判断请求的来源。但是在某些情况下，用户可以不发送Referer，或者修改Referer字段，并不是很安全[^1]

## 2.2 增加校验条件
CSRF能成功的关键，是攻击者利用了子域名共享父域名Cookie的特性，攻击者可以在不知道Cookie内容的情况下，完成恶意的接口请求攻击。其实攻击者完全不知道目标页面的信息，例如Cookie的内容、页面header、meta信息等，**将攻击者拿不到的信息，添加到接口的校验中**，即可预防CSRF攻击
##### CSRF Token
1. 由Server生成单用户维度的CSRF Token信息，传递给前端：
	- 可放在页面的meta中
	- 可前端再发请求，获取CSRF Token
	- 可存储在Cookie中，详见[[#双重Cookie|双重Cookie]]
2. 在前端发起接口请求时，取出该token信息，添加到url参数、form表单或header中
3. Server校验token，校验方法例如：
	- 比对session中的token是否一致。但是在分布式存储的服务器上，会有问题
	- 验签，用同样的算法计算出token，比较两个token是否一致
##### 双重Cookie
这是CSRF Token的一种实现方式，Server无需从存储中取出session信息进行比对，而是比对cookie与url参数/header是否一致。具体流程如下：
1. 前端发起请求时，需要提取某一个Cookie，例如`anotherCookie` 
2. 将其`anotherCookie`放到接口请求的参数中或Header中，例如`follow.baidu.com/followAuthor?anotherCookie=456&authorId=123`
3. 若不携带该参数发起请求，或该参数的值与Cookie中同名参数的值不一致，则判定接口请求无效
因为攻击者的网站无法拿到目标网站域名的Cookie内容，向目标服务器发起的接口请求，就无法生效了
## 2.3 控制Cookie的传递
归根结底，攻击者能在自己的页面成功发起攻击，是因为此前Cookie的携带规则，只校验了domain、path、secure字段。Google后来提出了改进Cookie的方案，为Cookie添加了一个新属性`Samesite`，以从根源上解决CSRF攻击的问题

Samesite[^2]的可选值为`Strict`、`Lax`、`None`。
- Strict：只有同Site的请求，才会携带该Cookie
- Lax：同Site的请求，会携带Cookie。下列情况都满足，也会携带该Cookie：
	- 该请求导致了导航栏路由的变化
	- 该请求使用了安全[^3]的请求方法，也就是排除了POST、PUT和DELETE
- None：没有同Site的限制，但是`Secure`字段也必须设置
> 许多浏览器，Samesite的默认值是`Lax`

**为何Samesite可以解决CSRF攻击呢？**
因为它保障了攻击者的网页，无法携带目标Cookie字段发起请求。
例如给登录Cookie设置Samesite=Lax后；在`evil.com`页面发起`follow.baidu.com/followAuthor`接口请求，因为该请求没有满足`Lax`的条件，用户登录信息Cookie不会跟随接口请求，发送给Server

[^1]: Origin为空：[前端安全系列（二）：如何防止CSRF攻击？ - 美团技术团队](https://tech.meituan.com/2018/10/11/fe-security-csrf.html)
[^2]: Samesite：[Set-Cookie header - HTTP \| MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesitesamesite-value)
[^3]: 安全的请求方法：意味着不会影响Server状态的method，例如GET、HEAD和OPTIONS